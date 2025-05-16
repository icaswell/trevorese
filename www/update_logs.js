/**
 * Script to update all console.log and console.error statements in JavaScript files
 * to include the filename as a prefix.
 * 
 * Usage: Run this script with Node.js
 */

const fs = require('fs');
const path = require('path');

// Directory to scan for JavaScript files
const directoryPath = __dirname;

// Get all JavaScript files in the directory
const jsFiles = fs.readdirSync(directoryPath)
  .filter(file => file.endsWith('.js') && file !== 'update_logs.js');

console.log(`Found ${jsFiles.length} JavaScript files to process`);

// Process each JavaScript file
jsFiles.forEach(file => {
  const filePath = path.join(directoryPath, file);
  console.log(`Processing ${file}...`);
  
  // Read the file content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Count original log statements
  const originalLogCount = (content.match(/console\.log\(/g) || []).length;
  const originalErrorCount = (content.match(/console\.error\(/g) || []).length;
  
  // Skip files that don't have any log statements
  if (originalLogCount === 0 && originalErrorCount === 0) {
    console.log(`  No log statements found in ${file}, skipping`);
    return;
  }
  
  // Replace console.log statements
  // This regex matches console.log calls that don't already have the filename prefix
  content = content.replace(
    /console\.log\((?!['"`].*?\.js:)/g, 
    `console.log('${file}: ' + `
  );
  
  // Replace console.error statements
  // This regex matches console.error calls that don't already have the filename prefix
  content = content.replace(
    /console\.error\((?!['"`].*?\.js:)/g, 
    `console.error('${file}: ' + `
  );
  
  // Special handling for formatted console logs with %c
  content = content.replace(
    /console\.log\(['"`].*?\.js: ['"] \+ ['"`]%c/g,
    match => match.replace(' + \'%c', ', \'%c')
  );
  
  // Count updated log statements
  const updatedLogCount = (content.match(/console\.log\(['"`].*?\.js:/g) || []).length;
  const updatedErrorCount = (content.match(/console\.error\(['"`].*?\.js:/g) || []).length;
  
  // Write the updated content back to the file
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log(`  Updated ${updatedLogCount} console.log statements and ${updatedErrorCount} console.error statements in ${file}`);
});

console.log('All JavaScript files have been processed');
