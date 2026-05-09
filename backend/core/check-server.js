#!/usr/bin/env node

const http = require('http');

console.log('🔍 Testing server health...\n');

const options = {
  hostname: 'localhost',
  port: 4002,
  path: '/api-docs',
  method: 'GET',
  timeout: 2000
};

const req = http.request(options, (res) => {
  console.log(`✅ Server is running!`);
  console.log(`   Status: ${res.statusCode}`);
  console.log(`   Server is accessible on port 4000`);
  process.exit(0);
});

req.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    console.log('❌ Server is not running on port 4000');
    console.log('   The server may still be starting up or encountered an error.');
    console.log('\n💡 Check the terminal running "npm run start:dev" for error messages.');
  } else {
    console.log(`❌ Error: ${err.message}`);
  }
  process.exit(1);
});

req.on('timeout', () => {
  console.log('⏱️  Request timed out');
  req.destroy();
  process.exit(1);
});

req.end();
