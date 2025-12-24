# Docker Deployment Guide

## Quick Start

Deploy the entire chat application with one command:

```bash
./deploy.sh
```

## Manual Deployment

### 1. Build and Start Services

```bash
docker compose up -d --build
```

### 2. View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f ws-server
docker compose logs -f worker
docker compose logs -f frontend
```

### 3. Check Status

```bash
docker compose ps
```

### 4. Stop Services

```bash
docker compose down
```

### 5. Clean Up (including volumes)

```bash
docker compose down -v
```

## Service URLs

After deployment, access the application at:

- **Frontend**: http://localhost:3000
- **API Server**: http://localhost:4000
- **WebSocket**: ws://localhost:8080
- **PostgreSQL**: localhost:5433 (user: chatuser, db: chat)
- **Redis**: localhost:6379

## Environment Variables

The docker-compose.yml includes default environment variables. To customize:

1. Create a `.env` file in the root directory:
```env
JWT_SECRET=your-secret-here
```

2. The following variables are set automatically for Docker:
   - `DATABASE_URL`: Points to postgres container
   - `REDIS_URL`: Points to redis container
   - `PORT_API`: 4000
   - `PORT_WS`: 8080

## Architecture

```
┌─────────────┐
│  Frontend   │ :3000
│   (React)   │
└──────┬──────┘
       │
       ├──────────┐
       │          │
┌──────▼──────┐ ┌▼──────────┐
│ API Server  │ │ WS Server │
│  (Express)  │ │   (WebSocket)│
└──────┬──────┘ └┬──────────┘
       │         │
       │    ┌────▼─────┐
       │    │  Worker  │
       │    └────┬─────┘
       │         │
    ┌──▼─────────▼──┐
    │   PostgreSQL  │
    └───────────────┘
         ┌────┴─────┐
         │  Redis   │
         └──────────┘
```

## Troubleshooting

### Database Connection Issues

If the API can't connect to the database:

```bash
# Check postgres is healthy
docker compose ps postgres

# View postgres logs
docker compose logs postgres

# Manually run db push
docker compose exec api sh -c "cd apps/prisma && npx prisma db push"
```

### Redis Connection Issues

```bash
# Check redis is running
docker compose logs redis

# Test redis connection
docker compose exec redis redis-cli ping
```

### Worker Not Processing Messages

```bash
# View worker logs
docker compose logs -f worker

# Restart worker
docker compose restart worker
```

### Frontend Build Issues

```bash
# Rebuild frontend only
docker compose up -d --build frontend
```

### Clean Rebuild

If you encounter persistent issues:

```bash
# Stop everything and remove volumes
docker compose down -v

# Rebuild without cache
docker compose build --no-cache

# Start fresh
docker compose up -d
```

## Production Deployment

For production deployment:

1. **Update URLs**: Modify frontend Dockerfile build args for production URLs
2. **Secure Secrets**: Use Docker secrets or external secret management
3. **Enable SSL**: Put services behind nginx/traefik with SSL certificates
4. **Health Monitoring**: Add health check endpoints and monitoring
5. **Backup Database**: Set up automated PostgreSQL backups
6. **Scale Workers**: Use `docker compose up --scale worker=3` to run multiple workers
7. **Resource Limits**: Add memory/CPU limits to docker-compose.yml

### Example Production docker-compose.yml snippet:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
      replicas: 2
```

## Development vs Docker

Continue local development with:

```bash
# Terminal 1 - API
cd apps/api-server && npm run dev

# Terminal 2 - WS Server
cd apps/ws-server && npm run dev

# Terminal 3 - Worker
cd apps/worker && npm run dev

# Terminal 4 - Frontend
cd apps/frontend && npm run dev
```

Use Docker for:
- Testing full stack integration
- Simulating production environment
- Sharing with team members
- Deployment to servers
