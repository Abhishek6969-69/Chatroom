# Quick Fix for Render Deployment

## Problem
Render couldn't find `apps/prisma` and `apps/api-server` directories during Docker build, causing the error:
```
failed to calculate checksum: "/apps/prisma": not found
```

## Solution
Created simplified Dockerfiles at the repository root that work with Render's default build context:

### New Dockerfiles (in repository root):
- **Dockerfile.api** - API Server
- **Dockerfile.ws** - WebSocket Server  
- **Dockerfile.worker** - Background Worker
- **Dockerfile.frontend** - Frontend

### How to Deploy on Render

#### Option 1: Blueprint (Automatic)
1. Push code to GitHub:
   ```bash
   git add .
   git commit -m "Add Render deployment files"
   git push
   ```

2. In Render Dashboard:
   - Click "New" → "Blueprint"
   - Connect your repository
   - Render will read `render.yaml` and create all services automatically

#### Option 2: Manual Setup
When creating each service in Render:

**API Server:**
- Dockerfile Path: `./Dockerfile.api`
- No need to set build context - it defaults to root

**WebSocket Server:**
- Dockerfile Path: `./Dockerfile.ws`

**Worker:**
- Dockerfile Path: `./Dockerfile.worker`

**Frontend:**
- Dockerfile Path: `./Dockerfile.frontend`

### Environment Variables

**API Server:**
```
DATABASE_URL=<from Render PostgreSQL>
REDIS_URL=<from Render Redis>
JWT_SECRET=<random secret>
PORT_API=4000
NODE_ENV=production
```

**WebSocket Server:**
```
REDIS_URL=<from Render Redis>
JWT_SECRET=<same as API>
PORT_WS=8080
NODE_ENV=production
```

**Worker:**
```
DATABASE_URL=<from Render PostgreSQL>
REDIS_URL=<from Render Redis>
NODE_ENV=production
```

**Frontend:**
```
VITE_API_URL=https://chatroom-api.onrender.com
VITE_WS_URL=wss://chatroom-ws.onrender.com
```

## Files Created/Updated

✅ `Dockerfile.api` - New simplified API Dockerfile
✅ `Dockerfile.ws` - New simplified WebSocket Dockerfile
✅ `Dockerfile.worker` - New simplified Worker Dockerfile
✅ `Dockerfile.frontend` - New simplified Frontend Dockerfile
✅ `render.yaml` - Updated to use new Dockerfiles
✅ `RENDER_DEPLOY.md` - Complete deployment guide
✅ `.dockerignore` - Updated to keep necessary files

## Next Steps

1. Commit and push these changes to GitHub
2. Follow the deployment instructions in `RENDER_DEPLOY.md`
3. Your app will deploy successfully on Render!

## Why This Works

The new Dockerfiles are at the repository root, so when Render builds them:
- Build context is automatically the repository root
- All `apps/` directories are accessible
- No need to manually configure docker context
- Works with Render's default settings
