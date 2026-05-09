#!/usr/bin/env node
/**
 * Complete Database and Server Verification Script
 * 
 * This script:
 * 1. Tests PostgreSQL connection
 * 2. Checks if tables exist
 * 3. Tests server health
 * 4. Provides detailed diagnostics
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const http = require('http');
const pg = require('pg');

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  dialectModule: pg, // for vercel
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'HIRION_clone',
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  logging: false,
});

async function checkDatabase() {
  console.log('=' .repeat(60));
  console.log('DATABASE & SERVER VERIFICATION');
  console.log('='.repeat(60));
  
  try {
    // Test connection
    console.log('\n📊 Step 1: Testing PostgreSQL Connection...');
    await sequelize.authenticate();
    console.log('   ✅ Connected to PostgreSQL');
    
    // Check tables
    console.log('\n📊 Step 2: Checking Database Tables...');
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    if (results.length === 0) {
      console.log('   ⚠️  No tables found in database');
      console.log('   💡 The server needs to run successfully to create tables');
    } else {
      console.log(`   ✅ Found ${results.length} tables:`);
      results.forEach((row, idx) => {
        console.log(`      ${idx + 1}. ${row.table_name}`);
      });
    }
    
    await sequelize.close();
    
    //Check server
    console.log('\n📊 Step 3: Testing Server on port 4000...');
    await testServer();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.original) {
      console.error('   Details:', error.original.message);
    }
    process.exit(1);
  }
}

function testServer() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: '/',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      console.log('   ✅ Server is running and accessible');
      console.log(`   Status Code: ${res.statusCode}`);
      resolve();
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        console.log('   ❌ Server is NOT running on port 4000');
        console.log('   💡 Check terminal running "npm run start:dev" for errors');
      } else {
        console.log(`   ❌ Server error: ${err.message}`);
      }
      reject(err);
    });

    req.on('timeout', () => {
      console.log('   ⏱️  Request timed out');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

// Run verification
checkDatabase().then(() => {
  console.log('\n' + '='.repeat(60));
  console.log('✅ VERIFICATION COMPLETE');
  console.log('='.repeat(60) + '\n');
  process.exit(0);
}).catch(() => {
  console.log('\n' + '='.repeat(60));
  console.log('⚠️  VERIFICATION INCOMPLETE - See errors above');
  console.log('='.repeat(60) + '\n');
  process.exit(1);
});
