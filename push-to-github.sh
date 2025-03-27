#!/bin/bash

# Current+ Web GitHub Push Script
# This script helps push your Current+ web project to GitHub

# Text colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}Current+ ESG Web Project GitHub Push Tool${NC}"
echo -e "${BLUE}=========================================${NC}"
echo

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: Git is not installed.${NC}"
    echo "Please install Git before continuing."
    exit 1
fi

# Navigate to the project root directory
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"
echo -e "${YELLOW}Working directory: ${PROJECT_ROOT}${NC}"

# Check if this is a git repository
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}This directory is not a git repository. Initializing...${NC}"
    git init
    echo -e "${GREEN}Git repository initialized.${NC}"
fi

# Check git status
git status

echo
echo -e "${YELLOW}Do you want to push all changes to GitHub? (y/n)${NC}"
read -r CONTINUE

if [[ "${CONTINUE}" != "y" && "${CONTINUE}" != "Y" ]]; then
    echo -e "${RED}Operation cancelled.${NC}"
    exit 0
fi

# Add files
echo -e "${YELLOW}Adding files to git...${NC}"
git add .

# Commit changes
echo -e "${YELLOW}Enter commit message:${NC}"
read -r COMMIT_MESSAGE

if [ -z "$COMMIT_MESSAGE" ]; then
    COMMIT_MESSAGE="Update Current+ ESG Web Project"
fi

git commit -m "$COMMIT_MESSAGE"

# Check if remote exists
REMOTE_EXISTS=$(git remote -v | grep origin)

if [ -z "$REMOTE_EXISTS" ]; then
    echo -e "${YELLOW}No remote repository found.${NC}"
    echo -e "${YELLOW}Enter your GitHub repository URL (like https://github.com/username/repo.git):${NC}"
    read -r REPO_URL
    
    if [ -z "$REPO_URL" ]; then
        echo -e "${RED}No repository URL provided. Cannot push.${NC}"
        echo "You can add a remote later with:"
        echo "git remote add origin YOUR_REPOSITORY_URL"
        echo "git push -u origin main"
        exit 1
    fi
    
    git remote add origin "$REPO_URL"
    echo -e "${GREEN}Remote repository added.${NC}"
fi

# Determine branch name
BRANCH=$(git branch --show-current)
if [ -z "$BRANCH" ]; then
    BRANCH="main"
fi

# Push to GitHub
echo -e "${YELLOW}Pushing to GitHub...${NC}"
git push -u origin "$BRANCH"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Successfully pushed to GitHub!${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${GREEN}Visit your GitHub repository to verify the changes.${NC}"
    echo -e "${BLUE}=========================================${NC}"
else
    echo -e "${RED}Failed to push to GitHub.${NC}"
    echo "You might need to:"
    echo "1. Make sure you have the correct repository URL"
    echo "2. Ensure you have write access to the repository"
    echo "3. If you're using SSH keys, verify they are set up correctly"
    echo "4. If the repository exists and has commits, try pulling first:"
    echo "   git pull origin $BRANCH --rebase"
    echo "   and then push again"
fi 