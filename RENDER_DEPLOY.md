# Render Deployment Guide

## Prerequisites

1. A [Render](https://render.com) account
2. Your repository pushed to GitHub

## Deployment Options

### Option 1: Using render.yaml (Recommended)

The `render.yaml` file in the root directory contains the complete infrastructure configuration.

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add Render deployment config"
   git push
   ```

2. **Connect to Render**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Select the `Chatroom` repository
   - Render will automatically detect `render.yaml` and create all services

3. **Update Environment Variables**:
   - After services are created, go to each service and verify environment variables
   - Update `VITE_API_URL` and `VITE_WS_URL` in the frontend service with the actual URLs from your deployed API and WebSocket services

### Option 2: Manual Deployment

#### Step 1: Create PostgreSQL Database

1. Go to Render Dashboard → "New" → "PostgreSQL"
2. Name: `chatroom-db`
3. Database: `chatroom`
4. User: `chatuser`
5. Region: Oregon (or your preferred region)
6. Plan: Free
7. Click "Create Database"
8. Copy the **Internal Database URL** for later use

#### Step 2: Create Redis Instance

1. Go to Render Dashboard → "New" → "Redis"
2. Name: `chatroom-redis`
3. Region: Oregon (same as database)
4. Plan: Free
5. Click "Create Redis"
6. Copy the **Internal Redis URL** for later use

#### Step 3: Deploy API Server

1. Go to Render Dashboard → "New" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `chatroom-api`
   - **Region**: Oregon
   - **Branch**: main
   - **Root Directory**: Leave empty (use repository root)
   - **Environment**: Docker
   - **Dockerfile Path**: `./apps/api-server/Dockerfile`
   - **Docker Build Context Directory**: `./`
   - **Plan**: Free

4. Add Environment Variables:
   ```
   DATABASE_URL=<paste Internal Database URL from Step 1>
   REDIS_URL=<paste Internal Redis URL from Step 2>
   JWT_SECRET=<generate a random secret>
   PORT_API=4000
   NODE_ENV=production
   ```

5. Click "Create Web Service"

#### Step 4: Deploy WebSocket Server

1. Go to Render Dashboard → "New" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `chatroom-ws`
   - **Region**: Oregon
   - **Branch**: main
   - **Root Directory**: Leave empty
   - **Environment**: Docker
   - **Dockerfile Path**: `./apps/ws-server/Dockerfile`
   - **Docker Build Context Directory**: `./`
   - **Plan**: Free

4. Add Environment Variables:
   ```
   REDIS_URL=<paste Internal Redis URL from Step 2>
   JWT_SECRET=<same as API server>
   PORT_WS=8080
   NODE_ENV=production
   ```

5. Click "Create Web Service"

#### Step 5: Deploy Worker

1. Go to Render Dashboard → "New" → "Background Worker"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `chatroom-worker`
   - **Region**: Oregon
   - **Branch**: main
   - **Root Directory**: Leave empty
   - **Environment**: Docker
   - **Dockerfile Path**: `./apps/worker/Dockerfile`
   - **Docker Build Context Directory**: `./`
   - **Plan**: Free

4. Add Environment Variables:
   ```
   DATABASE_URL=<paste Internal Database URL from Step 1>
   REDIS_URL=<paste Internal Redis URL from Step 2>
   NODE_ENV=production
   ```

5. Click "Create Background Worker"

#### Step 6: Deploy Frontend

1. Go to Render Dashboard → "New" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `chatroom-frontend`
   - **Region**: Oregon
   - **Branch**: main
   - **Root Directory**: Leave empty
   - **Environment**: Docker
   - **Dockerfile Path**: `./apps/frontend/Dockerfile`
   - **Docker Build Context Directory**: `./`
   - **Plan**: Free

4. Add Build Arguments and Environment Variables:
   ```
   VITE_API_URL=https://chatroom-api.onrender.com
   VITE_WS_URL=wss://chatroom-ws.onrender.com
   ```
   
   **Important**: Replace the URLs above with the actual URLs from your deployed API and WebSocket services.

5. Click "Create Web Service"

## Important Notes

### Docker Build Context

All Dockerfiles must be built with the **repository root** as the build context. This is crucial because:
- The Dockerfiles reference `apps/prisma` directory
- Render needs `dockerContext: ./` or **Docker Build Context Directory**: `./` (current directory/repo root)

### Environment Variables

- Keep `JWT_SECRET` identical across API and WebSocket servers
- Use **Internal URLs** for service-to-service communication (PostgreSQL, Redis)
- Use **External URLs** (https://...) for frontend to backend communication

### Free Tier Limitations

- Services may spin down after 15 minutes of inactivity
- First request after spin-down will be slow (cold start)
- Consider upgrading to paid plans for production use

## Troubleshooting

### Error: "failed to compute cache key: /apps/prisma: not found"

**Solution**: Ensure the Docker Build Context Directory is set to `./` (repository root), not a subdirectory.

In `render.yaml`, this is:
```yaml
dockerContext: ./
```

In manual setup, set **Docker Build Context Directory** to `./`

### Database Connection Issues

1. Verify you're using the **Internal Database URL** from Render
2. Check that the API service is in the same region as the database
3. Ensure the DATABASE_URL format includes `?schema=public`

### WebSocket Connection Issues

1. Frontend must use `wss://` (not `ws://`) for HTTPS sites
2. Verify CORS settings in WebSocket server
3. Check that JWT_SECRET matches between API and WS servers

### Build Failures

1. Check build logs in Render dashboard
2. Verify all `package.json` files are present
3. Ensure Prisma schema is valid
4. Check Node version compatibility (using node:20-alpine)

## Monitoring

After deployment:
1. Check service logs in Render dashboard
2. Monitor service status (running/failed)
3. Test API endpoints: `https://your-api-url.onrender.com/health`
4. Test WebSocket connection from frontend

## Updating the Deployment

Push changes to GitHub:
```bash
git add .
git commit -m "Your commit message"
git push
```

Render will automatically:
1. Detect the push
2. Rebuild affected services
3. Deploy new versions

## Cost

All services can run on Render's free tier:
- PostgreSQL: Free tier (1GB storage, shared CPU)
- Redis: Free tier (25MB memory)
- Web Services: Free tier (512MB RAM, shared CPU)
- Background Worker: Free tier (512MB RAM, shared CPU)

**Total Cost**: $0/month (with free tier limitations)
