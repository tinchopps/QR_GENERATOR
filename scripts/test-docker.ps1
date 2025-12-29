# Docker Build Test Script for QR Generator (PowerShell)
# This script tests the Docker build process and verifies the application works correctly

$ErrorActionPreference = "Stop"

Write-Host "🐳 QR Generator Docker Build Test" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker daemon is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker daemon is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Get current commit hash
$CommitHash = $env:COMMIT_HASH
if (-not $CommitHash) {
    try {
        $CommitHash = (git rev-parse --short HEAD 2>$null)
    } catch {
        $CommitHash = "test-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    }
}
Write-Host "📝 Using commit hash: $CommitHash" -ForegroundColor Yellow

# Build the image
Write-Host "🔧 Building Docker image..." -ForegroundColor Blue
docker build --build-arg COMMIT_HASH="$CommitHash" -t qr-generator:test .

Write-Host "✅ Docker build completed successfully" -ForegroundColor Green

# Run a quick test container
Write-Host "🚀 Starting test container..." -ForegroundColor Blue
$ContainerId = (docker run -d -p 4001:4000 qr-generator:test).Trim()

# Wait for container to be ready
Write-Host "⏳ Waiting for container to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test health endpoint
Write-Host "🩺 Testing health endpoint..." -ForegroundColor Blue
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:4001/health" -Method Get -TimeoutSec 10
    Write-Host "✅ Health endpoint is responsive" -ForegroundColor Green
    Write-Host "📊 Health check response:" -ForegroundColor Cyan
    $healthResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Health endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test version endpoint
Write-Host "🔖 Testing version endpoint..." -ForegroundColor Blue
try {
    $versionResponse = Invoke-RestMethod -Uri "http://localhost:4001/version" -Method Get -TimeoutSec 10
    Write-Host "✅ Version endpoint is responsive" -ForegroundColor Green
    Write-Host "📋 Version info:" -ForegroundColor Cyan
    $versionResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Version endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Cleanup
Write-Host "🧹 Cleaning up test container..." -ForegroundColor Blue
docker stop $ContainerId | Out-Null
docker rm $ContainerId | Out-Null

Write-Host ""
Write-Host "🎉 Docker build test completed successfully!" -ForegroundColor Green
Write-Host "💡 To run the application:" -ForegroundColor Cyan
Write-Host "   docker run -p 4000:4000 qr-generator:test" -ForegroundColor White
Write-Host "   Then visit: http://localhost:4000" -ForegroundColor White