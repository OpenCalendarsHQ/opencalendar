// Check the current database schema for the user table
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

async function checkSchema() {
  const client = postgres(DATABASE_URL, { max: 1 });

  try {
    console.log('🔍 Checking user table schema...\n');

    // Check column definition
    const columns = await client`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'user'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;

    console.log('📋 Columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Check constraints
    console.log('\n🔒 Constraints:');
    const constraints = await client`
      SELECT
        conname as constraint_name,
        contype as constraint_type
      FROM pg_constraint
      WHERE conrelid = 'public.user'::regclass
    `;

    constraints.forEach(con => {
      const type = {
        'p': 'PRIMARY KEY',
        'u': 'UNIQUE',
        'c': 'CHECK',
        'f': 'FOREIGN KEY'
      }[con.constraint_type] || con.constraint_type;
      console.log(`  - ${con.constraint_name}: ${type}`);
    });

    // Check indexes
    console.log('\n📇 Indexes:');
    const indexes = await client`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'user'
      AND schemaname = 'public'
    `;

    indexes.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
      console.log(`    ${idx.indexdef}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

checkSchema();
