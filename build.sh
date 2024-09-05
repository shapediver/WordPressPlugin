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
SRC_DIR="src"
DIST_DIR="dist"
PLUGIN_NAME="Shapediver WordPress Plugin"
FILE_NAME="sd-wp"

# Create dist directory if it doesn't exist
print_colored $YELLOW "Creating dist directory if it doesn't exist..."
mkdir -p $DIST_DIR

# Remove existing files in dist directory
print_colored $YELLOW "Removing existing files in dist directory..."
rm -rf $DIST_DIR/*

# Compile TypeScript to JavaScript
print_colored $YELLOW "Compiling TypeScript to JavaScript..."
if npx tsc; then
    print_colored $GREEN "TypeScript compilation successful."
else
    print_colored $RED "TypeScript compilation failed. Exiting."
    exit 1
fi

# Copy PHP and CSS files
print_colored $YELLOW "Copying PHP and CSS files to dist directory..."
cp $SRC_DIR/$FILE_NAME.php $DIST_DIR/
cp $SRC_DIR/$FILE_NAME.css $DIST_DIR/

# Check if files were copied successfully
if [ -f "$DIST_DIR/$FILE_NAME.php" ] && [ -f "$DIST_DIR/$FILE_NAME.css" ]; then
    print_colored $GREEN "Files copied successfully."
else
    print_colored $RED "Error copying files. Exiting."
    exit 1
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
