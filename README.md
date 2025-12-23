# Chat Room Application

A real-time chat room application built with microservices architecture.

## Architecture

- **API Server** (Port 4000) - Express.js REST API for authentication and room management
- **WebSocket Server** (Port 8080) - Real-time messaging with WebSocket
- **Worker** - Background message processing with Redis queue
- **Frontend** (Port 3000) - React + Vite application
- **PostgreSQL** (Port 5433) - Database
- **Redis** (Port 6379) - Message queue and pub/sub

## Tech Stack

### Backend
- TypeScript
- Node.js 20
- Prisma ORM (v7 with PostgreSQL adapter)
- Express.js
- WebSocket (ws library)
- Redis for message queuing
- JWT for authentication
- bcrypt for password hashing

### Frontend
- React 18
- TypeScript
- Vite
- React Router
- WebSocket for real-time messaging

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)

### Quick Start with Docker

1. **Start all services:**
```bash
docker-compose up -d
```

2. **Check service status:**
```bash
docker-compose ps
```

3. **Access the application:**
- Frontend: http://localhost:3000
- API: http://localhost:4000
- WebSocket: ws://localhost:8080

### Local Development

1. **Install dependencies:**
```bash
npm install
```

2. **Start backend services with Docker:**
```bash
docker-compose up -d postgres redis api ws-server worker
```

3. **Start frontend in development mode:**
```bash
cd apps/frontend
npm run dev
```

## Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://chatuser:npg_w1gArQDbNJ4U@localhost:5433/chat?schema=public"
REDIS_URL=redis://redis:6379
JWT_SECRET="verysecret"
PORT_API=4000
PORT_WS=8080
```

## Features

- ✅ User authentication (signup/login)
- ✅ Create and join chat rooms
- ✅ Real-time messaging via WebSocket
- ✅ Message persistence with PostgreSQL
- ✅ Background message processing with worker
- ✅ Responsive UI with modern design
- ✅ Connection status indicators
- ✅ Automatic reconnection

## API Endpoints

### Authentication
- `POST /auth/signup` - Create new account
- `POST /auth/login` - Login to existing account

### Rooms
- `GET /rooms` - List all rooms
- `POST /rooms` - Create new room
- `POST /rooms/:id/join` - Join a room

## WebSocket Protocol

### Client → Server
```json
{
  "type": "join",
  "roomId": "room-uuid"
}
```

```json
{
  "type": "message",
  "roomId": "room-uuid",
  "content": "Hello world"
}
```

### Server → Client
```json
{
  "type": "message",
  "message": {
    "id": "uuid",
    "content": "Hello world",
    "userId": "uuid",
    "username": "john",
    "createdAt": "2025-12-22T..."
  }
}
```

```json
{
  "type": "history",
  "messages": [...]
}
```

## Database Schema

### User
- id (UUID)
- email (unique)
- username
- password (hashed)

### Room
- id (UUID)
- name

### Membership
- id (UUID)
- userId → User
- roomId → Room

### Message
- id (UUID)
- content
- userId → User
- roomId → Room
- createdAt

## Project Structure

```
chat-room/
├── apps/
│   ├── api-server/       # REST API
│   │   ├── src/
│   │   │   ├── routes/   # Authentication & room routes
│   │   │   └── index.ts
│   │   └── Dockerfile
│   ├── ws-server/        # WebSocket server
│   │   ├── src/
│   │   │   ├── auth.ts   # JWT verification
│   │   │   ├── ws-handler.ts
│   │   │   └── index.ts
│   │   └── Dockerfile
│   ├── worker/           # Background worker
│   │   ├── src/
│   │   │   ├── processor.ts
│   │   │   ├── redis.ts
│   │   │   └── index.ts
│   │   └── Dockerfile
│   ├── frontend/         # React frontend
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   └── styles/
│   │   └── Dockerfile
│   └── prisma/           # Shared Prisma client
│       ├── schema.prisma
│       └── client.ts
├── docker-compose.yml
└── .env
```

## Development

### Run tests
```bash
npm test
```

### Build all services
```bash
docker-compose build
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f worker
```

### Stop services
```bash
docker-compose down
```

### Reset database
```bash
docker-compose down -v
docker-compose up -d
```

## Troubleshooting

### Port conflicts
If ports are already in use:
```bash
# Kill process on port 4000
lsof -i :4000 | grep -v COMMAND | awk '{print $2}' | xargs kill -9
```

### Container not starting
Check logs:
```bash
docker logs chat-room-worker-1
docker logs chat-room-api-1
```

### Database connection issues
Ensure PostgreSQL is running and environment variables are correct.

## License

MIT
