// Test database connection
const postgres = require('postgres');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env.local');
  process.exit(1);
}

console.log('🔍 Testing database connection...');
console.log('📍 Connection string:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

const sql = postgres(DATABASE_URL, {
  prepare: false,
  max: 1,
  connect_timeout: 10, // 10 seconds timeout
});

async function testConnection() {
  try {
    console.log('⏳ Attempting to connect...');
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    console.log('✅ Database connection successful!');
    console.log('🕐 Current time:', result[0].current_time);
    console.log('🗄️  PostgreSQL version:', result[0].pg_version.split(' ')[0] + ' ' + result[0].pg_version.split(' ')[1]);

    // Test user table
    console.log('\n🔍 Testing user table access...');
    const userCount = await sql`SELECT COUNT(*) as count FROM "user"`;
    console.log('✅ User table accessible. Total users:', userCount[0].count);

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);

    if (error.code === 'ETIMEDOUT') {
      console.error('\n💡 Possible causes:');
      console.error('   1. Supabase project is paused (check: https://supabase.com/dashboard)');
      console.error('   2. Network/firewall blocking connection');
      console.error('   3. Connection string is incorrect');
      console.error('   4. Database server is down');
    }

    await sql.end();
    process.exit(1);
  }
}

testConnection();
