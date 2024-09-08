#!/bin/bash

# Set up colors for console output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_colored() {
    color=$1
    message=$2
    echo -e "${color}${message}${NC}"
}

# Set variables
DIST_DIR="dist"
FILE_NAME="sd-wp"

# Remove existing zip file
if [ -f "$FILE_NAME.zip" ]; then
    print_colored $YELLOW "Removing existing zip file..."
    rm $FILE_NAME.zip
fi

# Create zip archive
print_colored $YELLOW "Creating zip archive..."
cd $DIST_DIR
if zip -r ../$FILE_NAME.zip .; then
    print_colored $GREEN "Zip archive created successfully."
else
    print_colored $RED "Error creating zip archive. Exiting."
    exit 1
fi
cd ..

print_colored $GREEN "Build process completed successfully!"
print_colored $YELLOW "Plugin zip file: $FILE_NAME.zip"
