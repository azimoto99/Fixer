#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script to merge both frontend builds for deployment on Render
 * This allows both apps to be served from the same domain with different routes
 */

const distDir = path.join(__dirname, '../dist-merged');
const postBuildDir = path.join(__dirname, '../apps/fixer-post/dist');
const workBuildDir = path.join(__dirname, '../apps/fixer-work/dist');

// Create the merged dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

console.log('🔧 Merging frontend builds...');

// Copy fixer-post build to /post subdirectory
const postDestDir = path.join(distDir, 'post');
if (fs.existsSync(postBuildDir)) {
  fs.mkdirSync(postDestDir, { recursive: true });
  copyDir(postBuildDir, postDestDir);
  console.log('✅ Copied fixer-post build to /post');
} else {
  console.error('❌ fixer-post build directory not found:', postBuildDir);
  process.exit(1);
}

// Copy fixer-work build to /work subdirectory
const workDestDir = path.join(distDir, 'work');
if (fs.existsSync(workBuildDir)) {
  fs.mkdirSync(workDestDir, { recursive: true });
  copyDir(workBuildDir, workDestDir);
  console.log('✅ Copied fixer-work build to /work');
} else {
  console.error('❌ fixer-work build directory not found:', workBuildDir);
  process.exit(1);
}

// Copy the static landing page instead of creating inline HTML
const landingPageSource = path.join(__dirname, '../static-landing/index.html');
const landingPageDest = path.join(distDir, 'index.html');

if (fs.existsSync(landingPageSource)) {
  fs.copyFileSync(landingPageSource, landingPageDest);
  console.log('✅ Copied landing page to root');
} else {
  console.error('❌ Landing page not found, creating basic one');
  // Fallback to basic landing page
  const basicLanding = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fixer - Connect Builders & Creators</title>
</head>
<body>
  <h1>🔧 Fixer</h1>
  <p><a href="/dashboard">Post Jobs</a> | <a href="/work">Find Work</a></p>
</body>
</html>`;
  fs.writeFileSync(landingPageDest, basicLanding);
  console.log('✅ Created basic landing page');
}

// Create _redirects file for client-side routing
const redirectsContent = `
# Fixer App Redirects

# Root landing page
/                           /index.html         200

# Main app (job posting) routes
/dashboard                  /post/index.html    200
/dashboard/*                /post/index.html    200
/jobs                       /post/index.html    200
/jobs/*                     /post/index.html    200
/payments                   /post/index.html    200
/payments/*                 /post/index.html    200
/profile                    /post/index.html    200
/profile/*                  /post/index.html    200
/auth/*                     /post/index.html    200
/enterprise                 /post/index.html    200
/enterprise/*               /post/index.html    200
/notifications              /post/index.html    200
/notifications/*            /post/index.html    200

# Worker app routes
/work                       /work/index.html    200
/work/*                     /work/index.html    200
/find-work                  /work/index.html    200
/find-work/*                /work/index.html    200

# API routes (proxy to backend)
/api/*                      https://fixer-backend-api.onrender.com/api/:splat  200
`;

fs.writeFileSync(path.join(distDir, '_redirects'), redirectsContent.trim());
console.log('✅ Created _redirects file');

console.log('🎉 Frontend merge completed successfully!');
console.log(`📦 Merged build available at: ${distDir}`);

// Helper function to recursively copy directories
function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
