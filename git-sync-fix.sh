#!/bin/bash

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================================${NC}"
echo -e "${BLUE}           Current+ ESG GitHub Sync Fix Script           ${NC}"
echo -e "${BLUE}========================================================${NC}"
echo ""

# Define the repository URL
REPO_URL="https://github.com/Dreamaker183/Initial-commit---Current-ESG-Analytics-Platform.git"

echo -e "${YELLOW}This script will fix your 'non-fast-forward' rejection error.${NC}"
echo "The issue is that your local repository is behind the remote repository."
echo ""

# 1. First, make sure we're tracking the remote branch
echo -e "${BLUE}Step 1: Configuring remote tracking...${NC}"
git remote set-url origin $REPO_URL
git fetch origin
echo ""

# 2. Save local changes to a temporary branch if needed
echo -e "${BLUE}Step 2: Saving your local changes temporarily...${NC}"
TEMP_BRANCH="temp-fixes-$(date +%s)"
git branch $TEMP_BRANCH

echo -e "Your changes are saved in branch: ${GREEN}$TEMP_BRANCH${NC}"
echo ""

# 3. Sync with the remote repository
echo -e "${BLUE}Step 3: Syncing with the remote repository...${NC}"
echo "Checking out main branch..."
git checkout main

echo "Pulling the latest changes from remote repository..."
git pull origin main
echo ""

# 4. Apply our changes on top of the updated main branch
echo -e "${BLUE}Step 4: Applying your changes on top of the updated repository...${NC}"
echo "Do you want to:"
echo "1) Create a new branch with your changes (safer option)"
echo "2) Merge your changes directly into main (might have conflicts)"
read -p "Choose option (1/2): " MERGE_OPTION

if [[ $MERGE_OPTION == "1" ]]; then
    NEW_BRANCH="error-handling-improvements"
    echo "Creating a new branch: $NEW_BRANCH"
    git checkout -b $NEW_BRANCH
    
    echo "Merging your temporary changes..."
    git merge $TEMP_BRANCH
    
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}There were some merge conflicts.${NC}"
        echo "Please resolve the conflicts, then continue."
        read -p "Press Enter when you've resolved the conflicts..." CONTINUE
        
        git add .
        git commit -m "Merge error handling improvements"
    fi
    
    echo -e "${GREEN}Your changes are now in branch: $NEW_BRANCH${NC}"
    echo "Pushing this branch to GitHub..."
    git push -u origin $NEW_BRANCH
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Successfully pushed to GitHub! 🎉${NC}"
        echo -e "You can now create a pull request at: ${BLUE}$REPO_URL${NC}"
    else
        echo -e "${RED}Failed to push to GitHub.${NC}"
    fi
    
elif [[ $MERGE_OPTION == "2" ]]; then
    echo "Merging your temporary changes into main..."
    git merge $TEMP_BRANCH
    
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}There were some merge conflicts.${NC}"
        echo "Please resolve the conflicts, then continue."
        read -p "Press Enter when you've resolved the conflicts..." CONTINUE
        
        git add .
        git commit -m "Merge error handling improvements"
    fi
    
    echo "Pushing to GitHub main branch..."
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Successfully pushed to GitHub! 🎉${NC}"
        echo -e "View your changes at: ${BLUE}$REPO_URL${NC}"
    else
        echo -e "${RED}Failed to push to GitHub.${NC}"
        echo "You might need to try with a new branch (option 1) instead."
    fi
else
    echo -e "${RED}Invalid option. Please run the script again and choose 1 or 2.${NC}"
    exit 1
fi

# 5. Cleanup
echo -e "${BLUE}Step 5: Cleaning up...${NC}"
read -p "Do you want to delete the temporary branch $TEMP_BRANCH? (y/n): " DELETE_TEMP

if [[ $DELETE_TEMP == "y" || $DELETE_TEMP == "Y" ]]; then
    git branch -D $TEMP_BRANCH
    echo "Temporary branch deleted."
else
    echo "Temporary branch kept for reference."
fi

echo ""
echo -e "${BLUE}========================================================${NC}"
echo -e "${GREEN}             Sync Fix Operation Completed               ${NC}"
echo -e "${BLUE}========================================================${NC}" 