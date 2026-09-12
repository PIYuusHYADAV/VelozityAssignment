import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { verifyAccess } from '../utils/auth';

export interface AuthedRequest extends Request { user?: ReturnType<typeof verifyAccess> }

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  try { req.user = verifyAccess(header.slice(7)); next(); }
  catch { return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired access token' } }); }
}

export const requireRoles = (...roles: Role[]) => (req: AuthedRequest, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have permission for this action' } });
  next();
};
