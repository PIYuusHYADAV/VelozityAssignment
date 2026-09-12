import { Router } from 'express';
import { Role, TaskStatus, Priority } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db';
import { AuthedRequest, requireAuth, requireRoles } from '../middleware/auth';
import { addActivity } from '../services/activity';

export function taskRoutes(io: any) {
  const router = Router(); router.use(requireAuth);
  const filters = z.object({ status: z.nativeEnum(TaskStatus).optional(), priority: z.nativeEnum(Priority).optional(), from: z.string().datetime().optional(), to: z.string().datetime().optional() });

  router.get('/', async (req: AuthedRequest, res, next) => {
    try {
      const q = filters.parse(req.query);
      const where: any = { ...(q.status ? { status: q.status } : {}), ...(q.priority ? { priority: q.priority } : {}) };
      if (q.from || q.to) where.dueDate = { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lte: new Date(q.to) } : {}) };
      if (req.user!.role === Role.DEVELOPER) where.developerId = req.user!.id;
      if (req.user!.role === Role.PM) where.project = { createdById: req.user!.id };
      const tasks = await prisma.task.findMany({ where, include: { project: true, developer: { select: { id: true, name: true } } }, orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }] });
      res.json({ tasks });
    } catch (e) { next(e); }
  });

  router.post('/', requireRoles(Role.ADMIN, Role.PM), async (req: AuthedRequest, res, next) => {
    try {
      const body = z.object({ projectId: z.string().uuid(), title: z.string().min(2), description: z.string().optional(), developerId: z.string().uuid(), priority: z.nativeEnum(Priority), dueDate: z.string().datetime() }).parse(req.body);
      const project = await prisma.project.findUnique({ where: { id: body.projectId } });
      if (!project || (req.user!.role === Role.PM && project.createdById !== req.user!.id)) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You cannot add a task here' } });
      const task = await prisma.task.create({ data: { ...body, dueDate: new Date(body.dueDate) } });
      await prisma.notification.create({ data: { userId: body.developerId, message: `You were assigned Task #${task.id}: ${task.title}` } });
      io.to(`user:${body.developerId}`).emit('notification:new');
      res.status(201).json({ task });
    } catch (e) { next(e); }
  });

  router.patch('/:id/status', requireRoles(Role.ADMIN, Role.PM, Role.DEVELOPER), async (req: AuthedRequest, res, next) => {
    try {
      const body = z.object({ status: z.nativeEnum(TaskStatus) }).parse(req.body);
      const task = await prisma.task.findUnique({ where: { id: Number(req.params.id) }, include: { project: true, developer: true } });
      if (!task) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Task not found' } });
      if (req.user!.role === Role.DEVELOPER && task.developerId !== req.user!.id) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only update your assigned tasks' } });
      if (req.user!.role === Role.PM && task.project.createdById !== req.user!.id) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'This project is not yours' } });
      const updated = await prisma.task.update({ where: { id: task.id }, data: { status: body.status } });
      const message = `${req.user!.name} moved Task #${task.id} from ${task.status.replace('_', ' ')} → ${body.status.replace('_', ' ')}`;
      await addActivity(io, { projectId: task.projectId, taskId: task.id, userId: req.user!.id, message, fromStatus: task.status, toStatus: body.status });
      if (body.status === TaskStatus.IN_REVIEW && req.user!.role === Role.DEVELOPER) {
        await prisma.notification.create({ data: { userId: task.project.createdById, message: `Task #${task.id} is ready for review.` } });
        io.to(`user:${task.project.createdById}`).emit('notification:new');
      }
      res.json({ task: updated });
    } catch (e) { next(e); }
  });
  return router;
}
