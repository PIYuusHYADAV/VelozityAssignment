import { PrismaClient, Role, Priority, TaskStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.activity.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);
  const admin = await prisma.user.create({ data: { name: 'Admin User', email: 'admin@demo.com', passwordHash, role: Role.ADMIN } });
  const pm1 = await prisma.user.create({ data: { name: 'Ravi Manager', email: 'ravi@demo.com', passwordHash, role: Role.PM } });
  const pm2 = await prisma.user.create({ data: { name: 'Neha Manager', email: 'neha@demo.com', passwordHash, role: Role.PM } });
  const developers = await Promise.all([
    ['Aman Dev', 'aman@demo.com'], ['Priya Dev', 'priya@demo.com'], ['Karan Dev', 'karan@demo.com'], ['Simran Dev', 'simran@demo.com']
  ].map(([name, email]) => prisma.user.create({ data: { name, email, passwordHash, role: Role.DEVELOPER } })));

  const clients = await Promise.all([
    ['Acme Retail', 'acme@example.com'], ['Northstar Labs', 'northstar@example.com'], ['Bluebird Media', 'bluebird@example.com']
  ].map(([name, email]) => prisma.client.create({ data: { name, email } })));

  const projects = await Promise.all([
    prisma.project.create({ data: { name: 'Acme Website', description: 'E-commerce rebuild', clientId: clients[0].id, createdById: pm1.id } }),
    prisma.project.create({ data: { name: 'Northstar Portal', description: 'Customer portal', clientId: clients[1].id, createdById: pm1.id } }),
    prisma.project.create({ data: { name: 'Bluebird CMS', description: 'Editorial CMS', clientId: clients[2].id, createdById: pm2.id } })
  ]);

  const statuses: TaskStatus[] = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW, TaskStatus.DONE, TaskStatus.TODO];
  const priorities: Priority[] = [Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW, Priority.HIGH];
  const now = Date.now();
  let taskNumber = 1;

  for (let p = 0; p < projects.length; p++) {
    for (let i = 0; i < 5; i++) {
      const overdue = p === 0 && i < 2;
      const task = await prisma.task.create({ data: {
        projectId: projects[p].id,
        title: `Task ${taskNumber++}: ${['API integration', 'Dashboard UI', 'Database work', 'Testing', 'Deployment'][i]}`,
        description: 'Seed task for the assessment dashboard.',
        developerId: developers[(p + i) % developers.length].id,
        status: overdue ? TaskStatus.OVERDUE : statuses[i],
        priority: priorities[i],
        dueDate: new Date(now + (overdue ? -2 : i + 1) * 86400000)
      }});
      await prisma.activity.create({ data: {
        projectId: projects[p].id, taskId: task.id, userId: p === 2 ? pm2.id : pm1.id,
        message: `${p === 2 ? pm2.name : pm1.name} created Task #${task.id}`,
        createdAt: new Date(now - (task.id % 10) * 3600000)
      }});
    }
  }

  await prisma.notification.createMany({ data: [
    { userId: developers[0].id, message: 'You were assigned a task.' },
    { userId: developers[1].id, message: 'You were assigned a task.' },
    { userId: pm1.id, message: 'A task was moved to In Review.' }
  ]});

  console.log('Seed complete. Login password for all users: Password123!');
}

main().finally(() => prisma.$disconnect());
