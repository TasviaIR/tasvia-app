import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { assertWorkspaceWriteEntitlement } from "../subscription/workspace-entitlement";

const positive = (value: bigint, code: string) => {
  if (value <= 0n) throw new Error(code);
  return value;
};
const normalizeCode = (value: string) => {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,40}$/.test(code)) throw new Error("BOM_CODE_INVALID");
  return code;
};
const normalizeName = (value: string) => {
  const name = value.trim();
  if (name.length < 2 || name.length > 120) throw new Error("BOM_NAME_INVALID");
  return name;
};

export async function listManufacturing(workspaceId: string) {
  const [boms, orders] = await Promise.all([
    prisma.manufacturingBom.findMany({
      where: { workspaceId },
      include: { lines: true },
      orderBy: [{ active: "desc" }, { code: "asc" }],
    }),
    prisma.manufacturingOrder.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  return { boms, orders };
}

export async function createBom(input: {
  workspaceId: string;
  code: string;
  name: string;
  outputItemId: string;
  outputQuantity: bigint;
  components: Array<{ itemId: string; quantityMinorUnits: bigint; wasteBasisPoints?: number }>;
}) {
  await assertWorkspaceWriteEntitlement(input.workspaceId);
  positive(input.outputQuantity, "BOM_OUTPUT_INVALID");
  if (input.components.length < 1) throw new Error("BOM_COMPONENTS_REQUIRED");

  const ids = [input.outputItemId, ...input.components.map((line) => line.itemId)];
  const items = await prisma.catalogItem.findMany({
    where: { workspaceId: input.workspaceId, id: { in: ids }, active: true },
    select: { id: true, type: true },
  });
  if (items.length !== new Set(ids).size) throw new Error("BOM_ITEM_INVALID");
  if (items.some((item) => item.type !== "STOCK_ITEM")) throw new Error("BOM_STOCK_ITEM_REQUIRED");

  return prisma.manufacturingBom.create({
    data: {
      workspaceId: input.workspaceId,
      code: normalizeCode(input.code),
      name: normalizeName(input.name),
      outputItemId: input.outputItemId,
      outputQuantity: input.outputQuantity,
      lines: {
        create: input.components.map((line) => {
          positive(line.quantityMinorUnits, "BOM_COMPONENT_QUANTITY_INVALID");
          const waste = line.wasteBasisPoints ?? 0;
          if (!Number.isInteger(waste) || waste < 0 || waste > 10000) throw new Error("BOM_WASTE_INVALID");
          return {
            componentItemId: line.itemId,
            quantityMinorUnits: line.quantityMinorUnits,
            wasteBasisPoints: waste,
          };
        }),
      },
    },
    include: { lines: true },
  });
}

export async function createManufacturingOrder(input: {
  workspaceId: string;
  bomId: string;
  warehouseId: string;
  orderNumber: string;
  plannedOutputQuantity: bigint;
  laborCost?: bigint;
  overheadCost?: bigint;
  actorId: string;
}) {
  await assertWorkspaceWriteEntitlement(input.workspaceId);
  positive(input.plannedOutputQuantity, "MANUFACTURING_OUTPUT_INVALID");
  const [bom, warehouse] = await Promise.all([
    prisma.manufacturingBom.findFirst({ where: { id: input.bomId, workspaceId: input.workspaceId, active: true } }),
    prisma.warehouse.findFirst({ where: { id: input.warehouseId, workspaceId: input.workspaceId, active: true } }),
  ]);
  if (!bom) throw new Error("BOM_NOT_FOUND");
  if (!warehouse) throw new Error("WAREHOUSE_NOT_FOUND");
  const laborCost = input.laborCost ?? 0n;
  const overheadCost = input.overheadCost ?? 0n;
  if (laborCost < 0n || overheadCost < 0n) throw new Error("MANUFACTURING_COST_INVALID");

  return prisma.manufacturingOrder.create({
    data: {
      workspaceId: input.workspaceId,
      bomId: input.bomId,
      warehouseId: input.warehouseId,
      orderNumber: input.orderNumber.trim(),
      plannedOutputQuantity: input.plannedOutputQuantity,
      laborCost,
      overheadCost,
      status: "DRAFT",
      createdBy: input.actorId,
    },
  });
}

function requiredQuantity(base: bigint, outputQuantity: bigint, bomOutput: bigint, wasteBps: number) {
  const scaled = (base * outputQuantity + bomOutput - 1n) / bomOutput;
  return (scaled * BigInt(10000 + wasteBps) + 9999n) / 10000n;
}

export async function completeManufacturingOrder(input: {
  workspaceId: string;
  orderId: string;
  actualOutputQuantity: bigint;
  actorId: string;
}) {
  await assertWorkspaceWriteEntitlement(input.workspaceId);
  positive(input.actualOutputQuantity, "MANUFACTURING_ACTUAL_OUTPUT_INVALID");

  const order = await prisma.manufacturingOrder.findFirst({
    where: { id: input.orderId, workspaceId: input.workspaceId },
    include: { bom: { include: { lines: true } } },
  });
  if (!order) throw new Error("MANUFACTURING_ORDER_NOT_FOUND");
  if (!["DRAFT", "IN_PROGRESS"].includes(order.status)) throw new Error("MANUFACTURING_ORDER_FINAL");
  if (order.bom.outputQuantity <= 0n) throw new Error("BOM_OUTPUT_INVALID");

  const componentIds = order.bom.lines.map((line) => line.componentItemId);
  const movements = await prisma.stockMovement.findMany({
    where: {
      workspaceId: input.workspaceId,
      warehouseId: order.warehouseId,
      itemId: { in: componentIds },
    },
    orderBy: { occurredAt: "asc" },
  });

  let materialCost = 0n;
  const consumes = order.bom.lines.map((line) => {
    const qty = requiredQuantity(
      line.quantityMinorUnits,
      input.actualOutputQuantity,
      order.bom.outputQuantity,
      line.wasteBasisPoints,
    );
    const itemMovements = movements.filter((movement) => movement.itemId === line.componentItemId);
    let stock = 0n;
    let purchaseQty = 0n;
    let purchaseCost = 0n;
    for (const movement of itemMovements) {
      if (["OPENING","PURCHASE","RETURN_IN","ADJUSTMENT_IN","TRANSFER_IN"].includes(movement.type)) {
        stock += movement.quantityMinorUnits;
        if (movement.unitCost != null) {
          purchaseQty += movement.quantityMinorUnits;
          purchaseCost += movement.quantityMinorUnits * movement.unitCost;
        }
      } else {
        stock -= movement.quantityMinorUnits;
      }
    }
    if (stock < qty) throw new Error("MANUFACTURING_STOCK_INSUFFICIENT");
    const unitCost = purchaseQty > 0n ? purchaseCost / purchaseQty : 0n;
    materialCost += unitCost * qty;
    return { itemId: line.componentItemId, qty, unitCost };
  });

  const now = new Date();
  const reference = `manufacturing:${order.id}`;

  return prisma.$transaction(async (tx) => {
    for (const consume of consumes) {
      await tx.stockMovement.create({
        data: {
          id: randomUUID(),
          workspaceId: input.workspaceId,
          warehouseId: order.warehouseId,
          itemId: consume.itemId,
          type: "ADJUSTMENT_OUT",
          quantityMinorUnits: consume.qty,
          occurredAt: now,
          reference,
          unitCost: consume.unitCost,
          currency: "IRR",
        },
      });
    }

    const totalCost = materialCost + order.laborCost + order.overheadCost;
    const outputUnitCost = totalCost / input.actualOutputQuantity;

    await tx.stockMovement.create({
      data: {
        id: randomUUID(),
        workspaceId: input.workspaceId,
        warehouseId: order.warehouseId,
        itemId: order.bom.outputItemId,
        type: "ADJUSTMENT_IN",
        quantityMinorUnits: input.actualOutputQuantity,
        occurredAt: now,
        reference,
        unitCost: outputUnitCost,
        currency: "IRR",
      },
    });

    return tx.manufacturingOrder.update({
      where: { id: order.id },
      data: {
        status: "COMPLETED",
        actualOutputQuantity: input.actualOutputQuantity,
        materialCost,
        completedAt: now,
        completedBy: input.actorId,
      },
    });
  });
}
