// Quick script to run the migration
// Usage: node run-migration.js

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Load environment variables
config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local');
  process.exit(1);
}

async function runMigration() {
  console.log('🔄 Connecting to database...');

  const client = postgres(DATABASE_URL, { max: 1 });

  try {
    // Read the migration file
    const migrationSQL = readFileSync('./apply-migration.sql', 'utf-8');

    console.log('🔄 Running migration...');
    console.log('\nSQL to execute:');
    console.log(migrationSQL);
    console.log('\n');

    // Split by statement and execute each one
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await client.unsafe(statement);
        console.log('✅ Done');
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nYou can now try the Google OAuth connection again.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
