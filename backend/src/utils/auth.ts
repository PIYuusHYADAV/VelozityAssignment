import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthUser } from '../types';

const accessSecret = process.env.JWT_ACCESS_SECRET!;
const refreshSecret = process.env.JWT_REFRESH_SECRET!;

export const signAccess = (user: AuthUser) => jwt.sign(user, accessSecret, { expiresIn: '15m' });
export const signRefresh = (user: Pick<AuthUser, 'id'>) => jwt.sign(user, refreshSecret, { expiresIn: '7d' });
export const verifyAccess = (token: string) => jwt.verify(token, accessSecret) as AuthUser;
export const verifyRefresh = (token: string) => jwt.verify(token, refreshSecret) as { id: string };
export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
