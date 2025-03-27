#!/bin/bash

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================================${NC}"
echo -e "${BLUE}           Current+ ESG GitHub Update Script            ${NC}"
echo -e "${BLUE}========================================================${NC}"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: Git is not installed on this system.${NC}"
    echo "Please install Git and try again."
    exit 1
fi

# Define the repository URL
REPO_URL="https://github.com/Dreamaker183/Initial-commit---Current-ESG-Analytics-Platform.git"

# Check if we're in the current-plus-esg directory
CURRENT_DIR=$(basename "$PWD")
if [ "$CURRENT_DIR" != "current-plus-esg" ]; then
    echo -e "${YELLOW}Warning: You don't appear to be in the current-plus-esg directory.${NC}"
    read -p "Do you want to continue anyway? (y/n): " CONTINUE
    if [[ $CONTINUE != "y" && $CONTINUE != "Y" ]]; then
        echo "Aborting."
        exit 1
    fi
fi

# Check if .git directory exists
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}This directory is not a Git repository.${NC}"
    read -p "Do you want to initialize a Git repository and connect to $REPO_URL? (y/n): " INIT_GIT
    
    if [[ $INIT_GIT == "y" || $INIT_GIT == "Y" ]]; then
        echo "Initializing Git repository..."
        git init
        
        echo "Adding remote origin..."
        git remote add origin $REPO_URL
    else
        echo "Aborting."
        exit 1
    fi
else
    # Check if the remote is correctly set
    CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null)
    
    if [ $? -ne 0 ] || [ -z "$CURRENT_REMOTE" ]; then
        echo -e "${YELLOW}Remote 'origin' is not set.${NC}"
        read -p "Do you want to set it to $REPO_URL? (y/n): " SET_REMOTE
        
        if [[ $SET_REMOTE == "y" || $SET_REMOTE == "Y" ]]; then
            git remote add origin $REPO_URL
        else
            echo "Continuing without setting remote..."
        fi
    elif [ "$CURRENT_REMOTE" != "$REPO_URL" ]; then
        echo -e "${YELLOW}Remote 'origin' is set to a different URL:${NC}"
        echo "Current: $CURRENT_REMOTE"
        echo "Expected: $REPO_URL"
        
        read -p "Do you want to update it? (y/n): " UPDATE_REMOTE
        
        if [[ $UPDATE_REMOTE == "y" || $UPDATE_REMOTE == "Y" ]]; then
            git remote set-url origin $REPO_URL
        else
            echo "Continuing with current remote..."
        fi
    fi
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --staged --quiet; then
    echo -e "${YELLOW}You have uncommitted changes.${NC}"
    
    # Show a summary of changes
    echo -e "${BLUE}Summary of changes:${NC}"
    git status -s
    
    # Ask to commit
    read -p "Do you want to commit these changes? (y/n): " COMMIT_CHANGES
    
    if [[ $COMMIT_CHANGES == "y" || $COMMIT_CHANGES == "Y" ]]; then
        # Suggested commit message
        DEFAULT_MSG="Fix: Implement robust error handling for ThingSpeak API null references"
        
        read -p "Enter commit message [$DEFAULT_MSG]: " COMMIT_MSG
        COMMIT_MSG=${COMMIT_MSG:-$DEFAULT_MSG}
        
        git add .
        git commit -m "$COMMIT_MSG"
        
        echo -e "${GREEN}Changes committed successfully.${NC}"
    else
        echo "Continuing without committing changes..."
    fi
fi

# Try to pull the latest changes from the remote repository
echo -e "${BLUE}Fetching latest changes from the remote repository...${NC}"
git fetch origin

# Check if pull is needed
if git rev-list HEAD..origin/main --count > /dev/null 2>&1 && [ $(git rev-list HEAD..origin/main --count) -gt 0 ]; then
    echo -e "${YELLOW}The remote repository has updates that you don't have locally.${NC}"
    read -p "Do you want to pull these changes? (y/n): " PULL_CHANGES
    
    if [[ $PULL_CHANGES == "y" || $PULL_CHANGES == "Y" ]]; then
        git pull origin main
    else
        echo "Continuing without pulling changes..."
    fi
fi

# Push to GitHub
echo -e "${BLUE}Preparing to push to GitHub...${NC}"
read -p "Are you ready to push your changes to GitHub? (y/n): " PUSH_CHANGES

if [[ $PUSH_CHANGES == "y" || $PUSH_CHANGES == "Y" ]]; then
    # Choose branch
    DEFAULT_BRANCH="main"
    read -p "Enter branch name [$DEFAULT_BRANCH]: " BRANCH_NAME
    BRANCH_NAME=${BRANCH_NAME:-$DEFAULT_BRANCH}
    
    # Check if branch exists locally
    if ! git show-ref --verify --quiet refs/heads/$BRANCH_NAME; then
        echo -e "${YELLOW}Branch '$BRANCH_NAME' doesn't exist locally.${NC}"
        read -p "Do you want to create it? (y/n): " CREATE_BRANCH
        
        if [[ $CREATE_BRANCH == "y" || $CREATE_BRANCH == "Y" ]]; then
            git checkout -b $BRANCH_NAME
        else
            echo "Aborting."
            exit 1
        fi
    else
        # Switch to the branch
        git checkout $BRANCH_NAME
    fi
    
    # Push to GitHub
    echo -e "${BLUE}Pushing to GitHub...${NC}"
    git push -u origin $BRANCH_NAME
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Successfully pushed to GitHub! 🎉${NC}"
        echo -e "View your changes at: ${BLUE}$REPO_URL${NC}"
    else
        echo -e "${RED}Failed to push to GitHub.${NC}"
        echo "Please check your permissions and try again."
    fi
else
    echo "Push cancelled."
fi

echo ""
echo -e "${BLUE}========================================================${NC}"
echo -e "${BLUE}                 Operation completed                    ${NC}"
echo -e "${BLUE}========================================================${NC}"

# Make the script executable
chmod +x update-github-repo.sh 