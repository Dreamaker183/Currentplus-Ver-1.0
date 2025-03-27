#!/bin/bash

# Current+ Quick GitHub Push Script
# This script automatically pushes your Current+ ThingSpeak fixes to GitHub

# Text colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}Current+ Quick GitHub Push Tool${NC}"
echo -e "${BLUE}=========================================${NC}"
echo

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: Git is not installed.${NC}"
    echo "Please install Git before continuing."
    exit 1
fi

# Work in the current directory
PROJECT_ROOT="$(pwd)"
echo -e "${YELLOW}Working directory: ${PROJECT_ROOT}${NC}"

# Add files
echo -e "${YELLOW}Adding files to git...${NC}"
git add .

# Commit changes
COMMIT_MESSAGE="Fix ThingSpeak connectivity issues in dashboard"
echo -e "${YELLOW}Committing with message: ${COMMIT_MESSAGE}${NC}"
git commit -m "$COMMIT_MESSAGE"

# Push to GitHub
BRANCH=$(git branch --show-current)
if [ -z "$BRANCH" ]; then
    BRANCH="main"
fi

echo -e "${YELLOW}Pushing to GitHub branch ${BRANCH}...${NC}"
git push origin "$BRANCH"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Successfully pushed to GitHub!${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${GREEN}Visit your GitHub repository to verify the changes.${NC}"
    echo -e "${BLUE}=========================================${NC}"
else
    echo -e "${RED}Failed to push to GitHub.${NC}"
    echo "Error details above. You might need to force push:"
    echo -e "${YELLOW}Would you like to try force pushing? (y/n)${NC}"
    read -r FORCE_PUSH
    
    if [[ "${FORCE_PUSH}" == "y" || "${FORCE_PUSH}" == "Y" ]]; then
        echo -e "${YELLOW}Force pushing to GitHub...${NC}"
        git push -f origin "$BRANCH"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Successfully force pushed to GitHub!${NC}"
        else
            echo -e "${RED}Force push also failed. Please check your GitHub credentials and permissions.${NC}"
        fi
    fi
fi 