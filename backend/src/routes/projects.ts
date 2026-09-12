import { Router } from 'express';
import { Role, Priority, TaskStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db';
import { AuthedRequest, requireAuth, requireRoles } from '../middleware/auth';
import { addActivity } from '../services/activity';

export function projectRoutes(io: any) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (req: AuthedRequest, res, next) => {
    try {
      const where = req.user!.role === Role.PM ? { createdById: req.user!.id } : {};
      const projects = await prisma.project.findMany({ where, include: { client: true, _count: { select: { tasks: true } } }, orderBy: { updatedAt: 'desc' } });
      res.json({ projects });
    } catch (e) { next(e); }
  });

  router.get('/:id/activity', async (req: AuthedRequest, res, next) => {
    try {
      const project = await prisma.project.findUnique({ where: { id: req.params.id } });
      if (!project) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found' } });
      if (req.user!.role === Role.PM && project.createdById !== req.user!.id) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Project is not yours' } });
      if (req.user!.role === Role.DEVELOPER) {
        const assigned = await prisma.task.count({ where: { projectId: project.id, developerId: req.user!.id } });
        if (!assigned) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You are not assigned to this project' } });
      }
      const activities = await prisma.activity.findMany({ where: { projectId: project.id }, include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 20 });
      res.json({ activities });
    } catch (e) { next(e); }
  });

  router.post('/', requireRoles(Role.ADMIN, Role.PM), async (req: AuthedRequest, res, next) => {
    try {
      const body = z.object({ name: z.string().min(2), description: z.string().optional(), clientId: z.string().uuid() }).parse(req.body);
      const project = await prisma.project.create({ data: { ...body, createdById: req.user!.id } });
      res.status(201).json({ project });
    } catch (e) { next(e); }
  });
  return router;
}
