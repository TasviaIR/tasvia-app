import { prisma } from "../../lib/prisma";
import { apiError, hashApiSecret, type ApiScope, hasScope } from "./api-contract";

export async function authorizeApi(request:Request,scope:ApiScope){
 const header=request.headers.get("authorization")??"";
 if(!header.startsWith("Bearer ")) return {error:apiError(401,"UNAUTHORIZED","API key required")};
 const token=header.slice(7).trim();
 if(!token.startsWith("tv_live_")) return {error:apiError(401,"UNAUTHORIZED","Invalid API key")};
 const key=await prisma.apiKey.findUnique({where:{secretHash:hashApiSecret(token)}});
 if(!key || key.revokedAt || (key.expiresAt && key.expiresAt<=new Date())) return {error:apiError(401,"UNAUTHORIZED","API key inactive")};
 if(!hasScope(key.scopes,scope)) return {error:apiError(403,"INSUFFICIENT_SCOPE","Scope is not granted")};
 await prisma.apiKey.update({where:{id:key.id},data:{lastUsedAt:new Date()}});
 return {workspaceId:key.workspaceId,apiKeyId:key.id};
}
