import { prisma } from '../db';
import { Server } from 'socket.io';

export async function addActivity(io: Server, data: { projectId: string; taskId?: number; userId: string; message: string; fromStatus?: any; toStatus?: any }) {
  const activity = await prisma.activity.create({ data });
  io.to(`project:${data.projectId}`).emit('activity:new', { ...activity, createdAt: activity.createdAt.toISOString() });
  io.to('admins').emit('activity:new', { ...activity, createdAt: activity.createdAt.toISOString() });
  return activity;
}
