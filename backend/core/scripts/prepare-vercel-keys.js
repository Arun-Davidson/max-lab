#!/usr/bin/env node

/**
 * Script to prepare JWT keys for Vercel deployment
 * This script reads the local JWT keys and outputs them in a format
 * suitable for copying to Vercel environment variables
 */

const fs = require('fs');
const path = require('path');

const keysDir = path.join(process.cwd(), 'keys');

console.log('📋 Vercel Environment Variables Setup\n');
console.log('Copy and paste these into your Vercel project settings:\n');
console.log('Project Settings → Environment Variables\n');
console.log('=' .repeat(80));

try {
  // Read all key files
  const accessPrivate = fs.readFileSync(path.join(keysDir, 'jwt_access_private.pem'), 'utf8');
  const accessPublic = fs.readFileSync(path.join(keysDir, 'jwt_access_public.pem'), 'utf8');
  const refreshPrivate = fs.readFileSync(path.join(keysDir, 'jwt_refresh_private.pem'), 'utf8');
  const refreshPublic = fs.readFileSync(path.join(keysDir, 'jwt_refresh_public.pem'), 'utf8');

  // Output in a format easy to copy-paste
  console.log('\n1️⃣  USE_ENV_JWT_KEYS');
  console.log('Value: true');
  console.log('-'.repeat(80));

  console.log('\n2️⃣  JWT_ACCESS_PRIVATE_KEY');
  console.log('Value:');
  console.log(accessPrivate);
  console.log('-'.repeat(80));

  console.log('\n3️⃣  JWT_ACCESS_PUBLIC_KEY');
  console.log('Value:');
  console.log(accessPublic);
  console.log('-'.repeat(80));

  console.log('\n4️⃣  JWT_REFRESH_PRIVATE_KEY');
  console.log('Value:');
  console.log(refreshPrivate);
  console.log('-'.repeat(80));

  console.log('\n5️⃣  JWT_REFRESH_PUBLIC_KEY');
  console.log('Value:');
  console.log(refreshPublic);
  console.log('-'.repeat(80));

  console.log('\n✅ All keys ready for Vercel deployment!');
  console.log('\n⚠️  Instructions:');
  console.log('1. Go to your Vercel project dashboard');
  console.log('2. Navigate to Settings → Environment Variables');
  console.log('3. Add each variable above (name and full value including -----BEGIN/END----- lines)');
  console.log('4. Select all environments (Production, Preview, Development)');
  console.log('5. Click "Save"');
  console.log('6. Redeploy your application\n');

  // Also output as a .env.vercel file for backup
  const envContent = `# Vercel Environment Variables for JWT Keys
# Generated: ${new Date().toISOString()}
# Copy these values to your Vercel project settings

USE_ENV_JWT_KEYS=true

JWT_ACCESS_PRIVATE_KEY="${accessPrivate.replace(/\n/g, '\\n')}"

JWT_ACCESS_PUBLIC_KEY="${accessPublic.replace(/\n/g, '\\n')}"

JWT_REFRESH_PRIVATE_KEY="${refreshPrivate.replace(/\n/g, '\\n')}"

JWT_REFRESH_PUBLIC_KEY="${refreshPublic.replace(/\n/g, '\\n')}"
`;

  fs.writeFileSync(path.join(process.cwd(), '.env.vercel'), envContent);
  console.log('💾 Keys also saved to .env.vercel (for your reference only - do NOT commit this file!)');

} catch (error) {
  console.error('\n❌ Error reading JWT keys:', error.message);
  console.error('\n💡 Run "npm run keygen" first to generate the keys.');
  process.exit(1);
}
