import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import { jwtVerify, SignJWT } from "jose";
import { config } from "../config";
import { HttpError } from "./errors";

const secret = new TextEncoder().encode(config.JWT_SECRET);
export interface AuthUser { id: number; email: string; name: string; role: "staff" | "admin" }
declare module "express-serve-static-core" {
  interface Request { user?: AuthUser }
}

export const hashPassword = (p: string) => bcrypt.hash(p, 12);
export const verifyPassword = (p: string, h: string) => bcrypt.compare(p, h);

export function signToken(user: AuthUser) {
  return new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" }).setSubject(String(user.id)).setIssuedAt().setExpirationTime("12h").sign(secret);
}

async function readUser(req: Request): Promise<AuthUser | undefined> {
  const header = req.headers.authorization;
  const raw = header?.startsWith("Bearer ") ? header.slice(7) : typeof req.query.token === "string" ? req.query.token : undefined; // EventSource can't set headers
  if (!raw) return undefined;
  try {
    const { payload } = await jwtVerify(raw, secret);
    return { id: Number(payload.sub), email: String(payload.email), name: String(payload.name), role: payload.role === "admin" ? "admin" : "staff" };
  } catch {
    return undefined;
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  req.user = await readUser(req);
  next();
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  req.user = await readUser(req);
  if (!req.user) return next(new HttpError(401, "Please sign in"));
  next();
}

export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  req.user = await readUser(req);
  if (!req.user) return next(new HttpError(401, "Please sign in"));
  if (req.user.role !== "admin") return next(new HttpError(403, "Admin access required"));
  next();
}
