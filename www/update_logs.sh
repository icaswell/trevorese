#!/bin/bash

# Script to update all console.log and console.error statements in JavaScript files
# to include the filename as a prefix.

echo "Starting log statement update process..."

# Process each JavaScript file in the current directory
for file in *.js; do
  # Skip the update script itself
  if [[ "$file" == "update_logs.js" ]]; then
    continue
  fi
  
  echo "Processing $file..."
  
  # Create a temporary file for processing
  temp_file="${file}.tmp"
  
  # Use sed to replace console.log statements
  # This adds the filename prefix to console.log calls
  sed -E "s/console\.log\(/console.log(\"$file: \" + /g" "$file" > "$temp_file"
  
  # Use sed to replace console.error statements
  # This adds the filename prefix to console.error calls
  sed -E "s/console\.error\(/console.error(\"$file: \" + /g" "$temp_file" > "${temp_file}2"
  
  # Move the processed file back to the original
  mv "${temp_file}2" "$file"
  
  # Clean up the temporary file
  rm -f "$temp_file"
  
  echo "  Updated $file"
done

echo "All JavaScript files have been processed"
