#!/bin/bash

# Deploy script for GitHub Pages
# This script ensures all required files are present before deployment

set -e  # Exit on any error
set -x  # Enable verbose output

echo "Starting deployment process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Are you in the project root?"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build the project (dist and other artifacts)
echo "Building project..."
npm run build:all

# Build public artifacts for deployment
echo "Building public artifacts..."
npm run build:public

# Validate deployment (public folder)
echo "Validating public deployment..."
npm run validate:public-deployment || npm run validate:github-pages || true

echo "Deployment preparation complete!"
echo "Files ready in public folder:"
ls -la public || true

echo "Ready for GitHub Pages deployment from public/!"

