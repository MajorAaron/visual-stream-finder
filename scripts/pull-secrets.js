#!/usr/bin/env node

/**
 * Script to pull secrets from production Supabase Edge Functions
 * Note: This requires you to have the Supabase CLI configured and authenticated
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_REF = 'mrkcgfsbdcukufgwvjap';

console.log('🔐 Pulling secrets from production Supabase project...\n');

// Secrets we need for local development
const requiredSecrets = [
  'OPENAI_API_KEY',
  'TMDB_API_KEY',
  'YOUTUBE_API_KEY',
  'FIRECRAWL_API_KEY',
  'STREAMING_AVAILABILITY_API_KEY'
];

console.log(`To pull secrets from production, you need to:

1. Get your Supabase access token from:
   https://supabase.com/dashboard/account/tokens

2. Run this command with your token:
   SUPABASE_ACCESS_TOKEN='your-token-here' node scripts/pull-secrets.js

Alternatively, you can manually copy the secrets from:
https://supabase.com/dashboard/project/${PROJECT_REF}/settings/vault

Required secrets:
${requiredSecrets.map(s => `  - ${s}`).join('\n')}
`);

// Check if token is provided
if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.log('❌ SUPABASE_ACCESS_TOKEN environment variable not set');
  process.exit(1);
}

try {
  // Create a template .env file
  const envPath = path.join(__dirname, '..', 'supabase', 'functions', '.env.local');
  const envContent = `# Production secrets pulled from Supabase
# Generated on ${new Date().toISOString()}

${requiredSecrets.map(secret => `${secret}=<value-from-dashboard>`).join('\n')}
`;

  fs.writeFileSync(envPath, envContent);
  console.log(`✅ Created template at: ${envPath}`);
  console.log('\nPlease fill in the actual values from your Supabase dashboard.');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}