// Apply migration statements one by one
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

async function applyMigration() {
  const client = postgres(DATABASE_URL, { max: 1 });

  try {
    console.log('🔄 Starting migration...\n');

    // Step 1: Update empty strings to NULL
    console.log('Step 1: Updating empty email strings to NULL...');
    const updated = await client`
      UPDATE "user"
      SET "email" = NULL
      WHERE "email" = ''
    `;
    console.log(`✅ Updated ${updated.count} rows\n`);

    // Step 2: Drop the old unique constraint
    console.log('Step 2: Dropping old unique constraint...');
    await client`
      ALTER TABLE "user"
      DROP CONSTRAINT IF EXISTS "user_email_unique"
    `;
    console.log('✅ Constraint dropped\n');

    // Step 3: Make email column nullable
    console.log('Step 3: Making email column nullable...');
    await client`
      ALTER TABLE "user"
      ALTER COLUMN "email" DROP NOT NULL
    `;
    console.log('✅ Column is now nullable\n');

    // Step 4: Create partial unique index
    console.log('Step 4: Creating partial unique index...');
    await client`
      CREATE UNIQUE INDEX IF NOT EXISTS "user_email_unique_idx"
      ON "user" ("email")
      WHERE "email" IS NOT NULL
    `;
    console.log('✅ Partial unique index created\n');

    console.log('✅ Migration completed successfully!\n');

    // Verify
    console.log('🔍 Verifying changes...');
    const columns = await client`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user' AND column_name = 'email'
    `;
    console.log(`Email column nullable: ${columns[0].is_nullable}`);

    const indexes = await client`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'user' AND indexname LIKE '%email%'
    `;
    console.log(`Email indexes: ${indexes.map(i => i.indexname).join(', ')}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

applyMigration();
