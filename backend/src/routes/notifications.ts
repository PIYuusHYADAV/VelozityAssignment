import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth, AuthedRequest } from '../middleware/auth';
export function notificationRoutes() {
  const router = Router(); router.use(requireAuth);
  router.get('/', async (req: AuthedRequest, res, next) => { try { const notifications = await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 30 }); const unread = await prisma.notification.count({ where: { userId: req.user!.id, read: false } }); res.json({ notifications, unread }); } catch(e){next(e);} });
  router.patch('/:id/read', async (req: AuthedRequest, res, next) => { try { await prisma.notification.updateMany({ where: { id: Number(req.params.id), userId: req.user!.id }, data: { read: true } }); res.json({ ok: true }); } catch(e){next(e);} });
  router.post('/read-all', async (req: AuthedRequest, res, next) => { try { await prisma.notification.updateMany({ where: { userId: req.user!.id, read: false }, data: { read: true } }); res.json({ ok: true }); } catch(e){next(e);} });
  return router;
}
