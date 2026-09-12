import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db';
import { hashToken, signAccess, signRefresh, verifyRefresh } from '../utils/auth';
import { requireAuth, AuthedRequest } from '../middleware/auth';

const router = Router();
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 };

router.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    const safe = { id: user.id, name: user.name, email: user.email, role: user.role };
    const refresh = signRefresh(user);
    await prisma.refreshToken.create({ data: { userId: user.id, tokenHash: hashToken(refresh), expiresAt: new Date(Date.now() + 7 * 86400000) } });
    res.cookie('refreshToken', refresh, cookieOptions);
    res.json({ accessToken: signAccess(safe), user: safe });
  } catch (e) { next(e); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ error: { code: 'NO_REFRESH_TOKEN', message: 'Refresh token missing' } });
    const payload = verifyRefresh(token);
    const stored = await prisma.refreshToken.findFirst({ where: { userId: payload.id, tokenHash: hashToken(token), expiresAt: { gt: new Date() } } });
    if (!stored) return res.status(401).json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token' } });
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return res.status(401).json({ error: { code: 'USER_NOT_FOUND', message: 'User no longer exists' } });
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    const refresh = signRefresh(user);
    await prisma.refreshToken.create({ data: { userId: user.id, tokenHash: hashToken(refresh), expiresAt: new Date(Date.now() + 7 * 86400000) } });
    res.cookie('refreshToken', refresh, cookieOptions);
    res.json({ accessToken: signAccess({ id: user.id, name: user.name, email: user.email, role: user.role }), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { next(e); }
});

router.post('/logout', async (req, res, next) => {
  try { const token = req.cookies.refreshToken; if (token) await prisma.refreshToken.deleteMany({ where: { tokenHash: hashToken(token) } }); res.clearCookie('refreshToken'); res.json({ ok: true }); } catch (e) { next(e); }
});

router.get('/me', requireAuth, (req: AuthedRequest, res) => res.json({ user: req.user }));
export default router;
