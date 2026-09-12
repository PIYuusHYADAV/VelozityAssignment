# Velozity Global Solutions — Real-Time Client Project Dashboard

A small full-stack dashboard built for the technical hiring assessment. The implementation intentionally keeps the stack simple: React + TypeScript, Express, Prisma/PostgreSQL, Socket.IO, and node-cron.

## Stack
- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL + Prisma
- Real-time: Socket.IO
- Background job: node-cron
- Local environment: Docker Compose

### Why Socket.IO?
Socket.IO gives the project rooms, reconnect handling and a straightforward client API while still using WebSockets. Project rooms make it easy to broadcast a status change only to people who can see that project.

### Why node-cron?
The overdue rule only needs a small hourly job. A queue would add infrastructure that is not necessary for this assessment.

## Local setup

1. Start PostgreSQL:
```bash
docker compose up -d db
```

2. Backend:
```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

3. Frontend:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend: http://localhost:5173  
API: http://localhost:4000

All seed users use `Password123!`.

## Access rules

Authorization is checked on the API, not only in React. Developers are restricted to tasks assigned to their user ID. PM queries are scoped to projects where `createdById` matches the authenticated PM. Admin has unrestricted project/activity access.

Refresh tokens are signed JWTs stored in an HttpOnly cookie and rotated on refresh. The short-lived access token is kept in frontend memory.

## Database/indexing

`Project.createdById`, `Project.clientId`, `Task.projectId`, `Task.developerId + status`, `Task.status + dueDate`, `Task.priority + dueDate`, and activity/user notification lookup fields are indexed because those columns are used in authorization, dashboard, filtering, and feed queries.

## Real-time feed

A task status change creates a database Activity row and then emits `activity:new`. Project rooms are populated from the authenticated user's actual database access. Admin also joins a global room. On reconnect, the client reads the latest 20 authorized activity rows from PostgreSQL, so missed events are not dependent on server memory.

Notification events are emitted to the affected user's room and the UI reloads the notification list, including the unread count.

## Deployment note

The frontend is Vercel-ready. The API should be deployed to a Node host that supports a persistent WebSocket connection (for example a container/VM platform) and the frontend's `VITE_API_URL` should point to it. The database must be a hosted PostgreSQL instance in production. A single Vercel function is not used for the Socket.IO server because the assessment explicitly requires a live WebSocket connection.

## Known limitations
- The UI is intentionally compact and focuses on the assessment workflow rather than a large component library.
- Project/task creation APIs are implemented; a richer admin management UI could be added without changing the authorization model.
- Presence is an in-memory connection count for the running API instance; for a horizontally scaled deployment it should move to Redis.

## Explanation (assessment field, 150–250 words)
The hardest part was making the activity feed real-time without weakening the role rules. I treated authorization as a backend concern first. Every protected API request gets a user from the access token, and project/task queries are then scoped by that user's role. The Socket.IO connection follows the same idea: after authenticating the socket, the server joins the user only to project rooms they can actually access. When a developer changes a task, the API writes the activity row to PostgreSQL before broadcasting the event. That gives the feed a durable source of truth instead of relying on an in-memory event list.

For users who disconnect, the frontend requests the latest 20 authorized activity records when it reconnects, so missed events come from the database. Notifications use the same pattern: the notification is persisted first and a WebSocket event tells the UI to refresh its unread count.

If I had more time, I would move presence tracking to Redis so multiple API instances could share online-user state. I would also add more automated integration tests around role boundaries and socket room membership.
