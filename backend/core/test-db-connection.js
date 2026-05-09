#!/usr/bin/env node
require('dotenv').config();
const { Sequelize } = require('sequelize');

console.log('='.repeat(60));
console.log('PostgreSQL Connection Test');
console.log('='.repeat(60));
console.log('\n📋 Environment Variables:');
console.log(`  POSTGRES_HOST: ${process.env.POSTGRES_HOST || 'NOT SET (default: localhost)'}`);
console.log(`  POSTGRES_PORT: ${process.env.POSTGRES_PORT || 'NOT SET (default: 5432)'}`);
console.log(`  POSTGRES_DB: ${process.env.POSTGRES_DB || 'NOT SET'}`);
console.log(`  POSTGRES_USER: ${process.env.POSTGRES_USER || 'NOT SET'}`);
console.log(`  POSTGRES_PASSWORD: ${process.env.POSTGRES_PASSWORD ? '***' : 'NOT SET'}`);

console.log('\n🔍 Attempting connection...\n');

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'postgres',
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  logging: false,
});

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ SUCCESS! Connected to PostgreSQL database');
    
    const [results] = await sequelize.query('SELECT current_database(), version();');
    console.log('\n📊 Database Info:');
    console.log(`  Current Database: ${results[0].current_database}`);
    console.log(`  Version: ${results[0].version.split(',')[0]}`);
    
    await sequelize.close();
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR: Failed to connect to PostgreSQL');
    console.error(`\n💡 Error Details:`);
    console.error(`  Code: ${error.original?.code || error.code || 'N/A'}`);
    console.error(`  Message: ${error.message}`);
    
    if (error.original?.code === 'ECONNREFUSED') {
      console.error('\n💡 Suggestion: PostgreSQL is not running or wrong port');
      console.error('   Try: docker-compose up -d postgres');
    } else if (error.original?.code === '3D000') {
      console.error('\n💡 Suggestion: Database does not exist');
      console.error('   Try: docker exec HIRION-postgres createdb -U postgres HIRION_clone');
    } else if (error.original?.code === 'ENOTFOUND') {
      console.error('\n💡 Suggestion: Wrong hostname in POSTGRES_HOST');
    }
    
    process.exit(1);
  }
}

testConnection();
