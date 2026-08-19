import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";

/**
 * Simple shared-secret gate for all /api routes. Not real user auth — just
 * enough to stop drive-by bots/scrapers from hitting a public deployment and
 * running up Anthropic/Cloudinary/Gladia usage. The secret ships inside the
 * built frontend bundle, so it's not a defense against a targeted attacker
 * who reads the JS — only against untargeted automated abuse.
 *
 * Disabled (passes everything through) when API_SHARED_SECRET is unset, so
 * local dev without a .env entry still works.
 */
export function requireApiSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.API_SHARED_SECRET;
  if (!secret) {
    next();
    return;
  }

  if (req.path === "/healthz") {
    next();
    return;
  }

  const authHeader = req.header("authorization");
  const provided = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (provided !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

export function warnIfApiSecretMissing(): void {
  if (!process.env.API_SHARED_SECRET) {
    logger.warn(
      "API_SHARED_SECRET is not set — the API accepts unauthenticated requests. " +
        "Set it before deploying anywhere reachable from the public internet.",
    );
  }
}
