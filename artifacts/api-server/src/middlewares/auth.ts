import type { NextFunction, Request, Response } from "express";
import { supabase } from "../lib/supabase";

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth once the bearer token is verified. */
      userId?: string;
    }
  }
}

/**
 * Verifies the bearer token as a Supabase Auth JWT and attaches the caller's
 * user id to the request as `req.userId`. Every route below /api requires a
 * signed-in user — this is real per-user auth, not a shared secret, since
 * project/meeting/material data is scoped by owner.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.path === "/healthz") {
    next();
    return;
  }

  const authHeader = req.header("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.userId = data.user.id;
  next();
}
