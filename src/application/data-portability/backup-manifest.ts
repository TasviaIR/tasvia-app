import { createHash } from "node:crypto";

export type BackupManifest = {
  version: 1;
  workspaceId: string;
  createdAt: string;
  encrypted: true;
  algorithm: string;
  checksumAlgorithm: "sha256";
  checksum: string;
  objectCount: number;
  schemaVersion: string;
};

export function buildBackupManifest(input: {
  workspaceId: string;
  createdAt: Date;
  encryptedPayload: string;
  encryptionAlgorithm: string;
  objectCount: number;
  schemaVersion: string;
}): BackupManifest {
  if (!input.workspaceId.trim()) {
    throw new Error("workspaceId is required");
  }

  if (!input.encryptionAlgorithm.trim()) {
    throw new Error("backup encryption algorithm is required");
  }

  if (input.objectCount < 0 || !Number.isInteger(input.objectCount)) {
    throw new Error("backup object count must be a non-negative integer");
  }

  const checksum = createHash("sha256")
    .update(input.encryptedPayload)
    .digest("hex");

  return {
    version: 1,
    workspaceId: input.workspaceId,
    createdAt: input.createdAt.toISOString(),
    encrypted: true,
    algorithm: input.encryptionAlgorithm,
    checksumAlgorithm: "sha256",
    checksum,
    objectCount: input.objectCount,
    schemaVersion: input.schemaVersion,
  };
}

export function verifyBackupManifest(
  manifest: BackupManifest,
  encryptedPayload: string,
): boolean {
  const checksum = createHash("sha256")
    .update(encryptedPayload)
    .digest("hex");

  return checksum === manifest.checksum;
}
