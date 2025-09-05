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

# Copy dist folder to docs
echo "📋 Copying dist folder to docs..."
cp -r dist docs/

# Create .nojekyll file if it doesn't exist
echo "📄 Ensuring .nojekyll file exists..."
touch docs/.nojekyll

# Validate deployment
echo "🔍 Validating deployment..."
npm run validate:github-pages

echo "✅ Deployment preparation complete!"
echo "📁 Files ready in docs/ folder:"
ls -la docs/

echo "🌐 Ready for GitHub Pages deployment!"