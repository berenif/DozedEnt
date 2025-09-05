#!/bin/bash

# Deploy script for GitHub Pages
# This script ensures all required files are present before deployment

set -e  # Exit on any error
set -x  # Enable verbose output

echo "🚀 Starting deployment process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the project root?"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the project
echo "🔨 Building project..."
npm run build:all

# Build documentation
echo "📚 Building documentation..."
npm run build:docs

# Dist folder is already in root, no need to copy

# Create .nojekyll file if it doesn't exist
echo "📄 Ensuring .nojekyll file exists..."
touch .nojekyll

# Validate deployment
echo "🔍 Validating deployment..."
npm run validate:github-pages

echo "✅ Deployment preparation complete!"
echo "📁 Files ready in root folder:"
ls -la

echo "🌐 Ready for GitHub Pages deployment from root!"