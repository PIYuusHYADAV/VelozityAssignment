import { Router } from 'express';
import { Role, TaskStatus } from '@prisma/client';
import { prisma } from '../db';
import { requireAuth, AuthedRequest } from '../middleware/auth';
export function dashboardRoutes(getOnlineCount: () => number) {
  const router = Router(); router.use(requireAuth);
  router.get('/', async (req: AuthedRequest, res, next) => { try {
    const base: any = req.user!.role === Role.PM ? { project: { createdById: req.user!.id } } : req.user!.role === Role.DEVELOPER ? { developerId: req.user!.id } : {};
    const [projects, tasks, overdue] = await Promise.all([prisma.project.count(req.user!.role === Role.PM ? { where: { createdById: req.user!.id } } : {}), prisma.task.groupBy({ by: ['status'], where: base, _count: { _all: true } }), prisma.task.count({ where: { ...base, status: TaskStatus.OVERDUE } })]);
    res.json({ projects, tasksByStatus: tasks, overdue, onlineUsers: getOnlineCount() });
  } catch(e){next(e);} });
  return router;
}
