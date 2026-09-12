import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import { Server } from 'socket.io';
import { prisma } from './db';
import { verifyAccess } from './utils/auth';
import authRoutes from './routes/auth';
import { projectRoutes } from './routes/projects';
import { taskRoutes } from './routes/tasks';
import { notificationRoutes } from './routes/notifications';
import { dashboardRoutes } from './routes/dashboard';
import { errorHandler } from './middleware/error';
import { activityRoutes } from './routes/activity';
import { adminRoutes } from './routes/admin';

const app = express(); const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.FRONTEND_URL, credentials: true } });
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true })); app.use(express.json()); app.use(cookieParser());

const online = new Set<string>();
io.use((socket, next) => { try { const token = socket.handshake.auth?.token; if (!token) return next(new Error('Unauthorized')); (socket.data as any).user = verifyAccess(token); next(); } catch { next(new Error('Unauthorized')); } });
io.on('connection', async socket => {
  const user = (socket.data as any).user; online.add(user.id); socket.join(`user:${user.id}`); if (user.role === 'ADMIN') socket.join('admins');
  const projects = user.role === 'DEVELOPER' ? await prisma.task.findMany({ where: { developerId: user.id }, select: { projectId: true } }) : await prisma.project.findMany(user.role === 'PM' ? { where: { createdById: user.id }, select: { id: true } } : { select: { id: true } });
  for (const p of projects) socket.join(`project:${'projectId' in p ? p.projectId : p.id}`);
  io.emit('presence:update', online.size);
  socket.on('disconnect', () => { online.delete(user.id); io.emit('presence:update', online.size); });
});

app.get('/health', (_req,res)=>res.json({ok:true}));
app.use('/api/auth', authRoutes); app.use('/api/admin', adminRoutes()); app.use('/api/activity', activityRoutes()); app.use('/api/projects', projectRoutes(io)); app.use('/api/tasks', taskRoutes(io)); app.use('/api/notifications', notificationRoutes()); app.use('/api/dashboard', dashboardRoutes(()=>online.size));
app.use(errorHandler);

cron.schedule('0 * * * *', async () => { await prisma.task.updateMany({ where: { dueDate: { lt: new Date() }, status: { notIn: ['DONE', 'OVERDUE'] } }, data: { status: 'OVERDUE' } }); });

const port = Number(process.env.PORT || 4000); server.listen(port, ()=>console.log(`API running on http://localhost:${port}`));
