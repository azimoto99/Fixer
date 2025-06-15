#!/usr/bin/env tsx

/**
 * Generate secure secrets for environment variables
 * This script generates cryptographically secure random strings for JWT and session secrets
 */

import crypto from 'crypto';

function generateSecret(length: number = 64): string {
  return crypto.randomBytes(length).toString('hex');
}

function generateSecrets() {
  console.log('🔐 Generating secure secrets for your .env file...\n');

  const jwtSecret = generateSecret(32); // 64 hex chars = 32 bytes
  const sessionSecret = generateSecret(32);

  console.log('Copy these values to your .env file:\n');
  console.log(`JWT_SECRET=${jwtSecret}`);
  console.log(`SESSION_SECRET=${sessionSecret}\n`);

  console.log('✅ Secrets generated successfully!');
  console.log('📝 Make sure to keep these secrets secure and never commit them to version control.');
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case 'generate':
  case undefined:
    generateSecrets();
    break;
  default:
    console.log(`
Usage: npm run generate:secrets

This will generate secure random secrets for:
- JWT_SECRET (for JSON Web Token signing)
- SESSION_SECRET (for session management)

Example:
  npm run generate:secrets
    `);
    process.exit(1);
}
