#!/usr/bin/env node

/**
 * Script to generate RSA key pairs for JWT signing
 * Run with: npm run keygen
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const keysDir = path.join(process.cwd(), 'keys');

// Create keys directory if it doesn't exist
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
  console.log('✓ Created keys directory');
}

// Generate access token keys
console.log('\n🔑 Generating access token keys...');
const { publicKey: accessPublic, privateKey: accessPrivate } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

fs.writeFileSync(path.join(keysDir, 'jwt_access_private.pem'), accessPrivate);
fs.writeFileSync(path.join(keysDir, 'jwt_access_public.pem'), accessPublic);
console.log('✓ Access token keys generated');

// Generate refresh token keys
console.log('🔑 Generating refresh token keys...');
const { publicKey: refreshPublic, privateKey: refreshPrivate } = crypto.generateKeyPairSync(
  'rsa',
  {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  },
);

fs.writeFileSync(path.join(keysDir, 'jwt_refresh_private.pem'), refreshPrivate);
fs.writeFileSync(path.join(keysDir, 'jwt_refresh_public.pem'), refreshPublic);
console.log('✓ Refresh token keys generated');

console.log('\n✅ All JWT keys generated successfully!');
console.log(`📁 Keys saved to: ${keysDir}`);
console.log('\n⚠️  Keep these keys secure and never commit them to version control!');
