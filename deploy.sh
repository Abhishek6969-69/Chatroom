#!/bin/bash
set -e

echo "🚀 Starting Docker deployment..."

# Stop any running containers
echo "📦 Stopping existing containers..."
docker compose down

# Build all services
echo "🔨 Building Docker images..."
docker compose build

# Start services
echo "▶️  Starting services..."
docker compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Show logs
echo "📋 Service status:"
docker compose ps

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 Services are running at:"
echo "   Frontend:  http://localhost:3000"
echo "   API:       http://localhost:4000"
echo "   WebSocket: ws://localhost:8080"
echo "   Postgres:  localhost:5433"
echo "   Redis:     localhost:6379"
echo ""
echo "📊 View logs with: docker compose logs -f"
echo "🛑 Stop with: docker compose down"
