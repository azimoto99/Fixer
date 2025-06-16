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

// Create a root index.html that redirects to the main app
const rootIndexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fixer - Connecting Builders</title>
  <meta http-equiv="refresh" content="0; url=/dashboard">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
    }
    .logo {
      font-size: 2.5rem;
      font-weight: bold;
      margin-bottom: 1rem;
    }
    .subtitle {
      font-size: 1.2rem;
      opacity: 0.9;
      margin-bottom: 2rem;
    }
    .links {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }
    .link {
      padding: 0.75rem 1.5rem;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      color: white;
      text-decoration: none;
      transition: all 0.3s ease;
    }
    .link:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🔧 Fixer</div>
    <div class="subtitle">Connecting Builders & Creators</div>
    <div class="links">
      <a href="/dashboard" class="link">Post Jobs</a>
      <a href="/work" class="link">Find Work</a>
    </div>
  </div>
  <script>
    // Redirect to dashboard after 2 seconds
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 2000);
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(distDir, 'index.html'), rootIndexHtml);
console.log('✅ Created root index.html');

// Create _redirects file for client-side routing
const redirectsContent = `
# Fixer App Redirects
# Main app (job posting) routes
/                           /post/index.html    200
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
/api/*                      https://fixer-backend.onrender.com/api/:splat  200

# Fallback
/*                          /post/index.html    200
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
