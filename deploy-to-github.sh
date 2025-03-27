#!/bin/bash

# Simple script to deploy Current+ ESG Analytics Platform to GitHub

echo "🚀 Deploying Current+ ESG Analytics Platform to GitHub..."

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo "Initializing Git repository..."
    git init
fi

# Add all files
echo "Adding all files to Git..."
git add .

# Commit changes
echo "Committing changes..."
echo -n "Enter commit message (or press Enter for default): "
read commit_message

if [ -z "$commit_message" ]; then
    commit_message="Update Current+ ESG Analytics Platform"
fi

git commit -m "$commit_message"

# Check if remote exists
if ! git remote | grep -q origin; then
    echo -n "Enter your GitHub repository URL: "
    read repo_url
    
    if [ -z "$repo_url" ]; then
        echo "❌ Repository URL cannot be empty."
        exit 1
    fi
    
    echo "Adding remote origin..."
    git remote add origin "$repo_url"
fi

# Determine branch name
branch=$(git branch --show-current)
if [ -z "$branch" ]; then
    branch="main"
fi

echo "Pushing to GitHub ($branch branch)..."
git push -u origin "$branch"

echo "✅ Deployment complete! Your Current+ ESG Analytics Platform is now on GitHub."
echo "📊 If you've set up GitHub Pages, it will be available at:"
echo "    https://your-username.github.io/current-plus-esg/" 