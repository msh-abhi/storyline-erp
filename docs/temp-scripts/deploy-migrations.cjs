const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Database URL template (replace [YOUR-PASSWORD] with actual password)
const DB_URL_TEMPLATE = 'postgresql://postgres.otscpicqgfvbaokqzaac:[YOUR-PASSWORD]@aws-0-eu-north-1.pooler.supabase.com:6543/postgres';

// Migration directory
const MIGRATION_DIR = './supabase/migrations';

/**
 * Get all migration files sorted by timestamp
 */
function getMigrationFiles(migrationDir) {
  if (!fs.existsSync(migrationDir)) {
    console.error(`Migration directory ${migrationDir} not found`);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Sort lexicographically (timestamps should be in order)

  return files.map(file => path.join(migrationDir, file));
}

/**
 * Check if migration has been applied
 */
async function isMigrationApplied(client, migrationFile) {
  const migrationName = path.basename(migrationFile);
  const result = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM supabase_migration_history
      WHERE migration_name = $1
    )
  `, [migrationName]);

  return result.rows[0].exists;
}

/**
 * Mark migration as applied
 */
async function markMigrationApplied(client, migrationFile) {
  const migrationName = path.basename(migrationFile);
  await client.query(`
    INSERT INTO supabase_migration_history (migration_name, applied_at)
    VALUES ($1, NOW())
    ON CONFLICT (migration_name) DO NOTHING
  `, [migrationName]);
}

/**
 * Apply a single migration
 */
async function applyMigration(client, migrationFile) {
  const migrationName = path.basename(migrationFile);
  const sql = fs.readFileSync(migrationFile, 'utf8');

  console.log(`Applying migration: ${migrationName}`);

  try {
    await client.query(sql);
    console.log(`✓ Migration ${migrationName} applied successfully`);
  } catch (error) {
    console.error(`✗ Failed to apply migration ${migrationName}:`, error.message);
    // Continue with other migrations instead of stopping
    // You can uncomment the next line if you want to stop on error
    // throw error;
  }
}

/**
 * Create migration tracking table if not exists
 */
async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS supabase_migration_history (
      migration_name TEXT PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

/**
 * Manual deployment function
 */
async function deployMigrations() {
  const migrationFiles = getMigrationFiles(MIGRATION_DIR);

  if (migrationFiles.length === 0) {
    console.log('No migration files found');
    return;
  }

  rl.question('Enter your database password: ', async (password) => {
    // URL encode the password to handle special characters
    const encodedPassword = encodeURIComponent(password);
    const dbUrl = DB_URL_TEMPLATE.replace('[YOUR-PASSWORD]', encodedPassword);

    console.log('🔗 Connecting with URL:', dbUrl.replace(/:[^:@]{4}/g, ':****')); // Hide most of password for security

    const client = new Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });

    try {
      console.log('Connecting to database...');
      await client.connect();
      console.log('✓ Connected successfully');

      // Ensure migration tracking table exists
      await ensureMigrationTable(client);

      let appliedCount = 0;
      let skippedCount = 0;

      for (const migrationFile of migrationFiles) {
        const migrationName = path.basename(migrationFile);

        const isApplied = await isMigrationApplied(client, migrationFile);

        if (isApplied) {
          console.log(`⏭️  Migration ${migrationName} already applied - skipping`);
          skippedCount++;
        } else {
          await applyMigration(client, migrationFile);
          await markMigrationApplied(client, migrationFile);
          appliedCount++;
        }
      }

      console.log(`\n✅ Deployment complete!`);
      console.log(`Applied: ${appliedCount} migrations`);
      console.log(`Skipped: ${skippedCount} migrations (already applied)`);

    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
    } finally {
      await client.end();
      rl.close();
    }
  });
}

// Option 2: Check migration status only
async function checkMigrationStatus() {
  rl.question('Enter your database password: ', async (password) => {
    // URL encode the password to handle special characters
    const encodedPassword = encodeURIComponent(password);
    const dbUrl = DB_URL_TEMPLATE.replace('[YOUR-PASSWORD]', encodedPassword);

    const client = new Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });

    try {
      console.log('Connecting to database...');
      await client.connect();
      await ensureMigrationTable(client);

      const migrationFiles = getMigrationFiles(MIGRATION_DIR);
      console.log('\n📋 Migration Status:\n');

      for (const migrationFile of migrationFiles) {
        const migrationName = path.basename(migrationFile);
        const isApplied = await isMigrationApplied(client, migrationFile);

        if (isApplied) {
          console.log(`✅ ${migrationName} - APPLIED`);
        } else {
          console.log(`⏸️  ${migrationName} - PENDING`);
        }
      }

      // Check for remote migrations not in local
      const result = await client.query('SELECT migration_name FROM supabase_migration_history');
      const appliedMigrations = result.rows.map(row => row.migration_name);

      console.log('\n🔍 Remote-only migrations (applied but not in local files):');
      const localFiles = migrationFiles.map(file => path.basename(file));

      for (const appliedMigration of appliedMigrations) {
        if (!localFiles.some(file => file === appliedMigration)) {
          console.log(`⚠️  ${appliedMigration} - REMOTE ONLY`);
        }
      }

    } catch (error) {
      console.error('❌ Check failed:', error.message);
    } finally {
      await client.end();
      rl.close();
    }
  });
}

// Main execution
const command = process.argv[2] || 'deploy';

if (command === 'deploy') {
  console.log('🚀 Deploying migrations...');
  deployMigrations();
} else if (command === 'status') {
  console.log('📋 Checking migration status...');
  checkMigrationStatus();
} else {
  console.log('Usage: node deploy-migrations.cjs [deploy|status]');
  console.log('  deploy - Apply pending migrations');
  console.log('  status - Check which migrations are applied/pending');
  process.exit(1);
}
