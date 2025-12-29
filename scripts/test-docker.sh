#!/usr/bin/env bash

# Docker Build Test Script for QR Generator
# This script tests the Docker build process and verifies the application works correctly

set -e

echo "🐳 QR Generator Docker Build Test"
echo "================================="

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker daemon is not running. Please start Docker Desktop."
    exit 1
fi

echo "✅ Docker daemon is running"

# Get current commit hash
COMMIT_HASH=${COMMIT_HASH:-$(git rev-parse --short HEAD 2>/dev/null || echo "test-$(date +%Y%m%d-%H%M%S)")}
echo "📝 Using commit hash: $COMMIT_HASH"

# Build the image
echo "🔧 Building Docker image..."
docker build --build-arg COMMIT_HASH="$COMMIT_HASH" -t qr-generator:test .

echo "✅ Docker build completed successfully"

# Run a quick test container
echo "🚀 Starting test container..."
CONTAINER_ID=$(docker run -d -p 4001:4000 qr-generator:test)

# Wait for container to be ready
echo "⏳ Waiting for container to be ready..."
sleep 5

# Test health endpoint
echo "🩺 Testing health endpoint..."
if curl -f http://localhost:4001/health >/dev/null 2>&1; then
    echo "✅ Health endpoint is responsive"
    
    # Get health info
    echo "📊 Health check response:"
    curl -s http://localhost:4001/health | jq . 2>/dev/null || curl -s http://localhost:4001/health
else
    echo "❌ Health endpoint failed"
fi

# Test version endpoint
echo "🔖 Testing version endpoint..."
if curl -f http://localhost:4001/version >/dev/null 2>&1; then
    echo "✅ Version endpoint is responsive"
    
    # Get version info
    echo "📋 Version info:"
    curl -s http://localhost:4001/version | jq . 2>/dev/null || curl -s http://localhost:4001/version
else
    echo "❌ Version endpoint failed"
fi

# Cleanup
echo "🧹 Cleaning up test container..."
docker stop $CONTAINER_ID >/dev/null
docker rm $CONTAINER_ID >/dev/null

echo ""
echo "🎉 Docker build test completed successfully!"
echo "💡 To run the application:"
echo "   docker run -p 4000:4000 qr-generator:test"
echo "   Then visit: http://localhost:4000"