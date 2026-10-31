const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL?.trim();
const databaseConfigured = Boolean(databaseUrl);

function validateDatabaseUrl() {
  if (!databaseConfigured) {
    return;
  }

  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error(
      'DATABASE_URL is not a valid PostgreSQL URL. Copy the full Supabase Session pooler URI into backend/.env and URL-encode special characters in the database password.',
    );
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must use the postgres:// or postgresql:// scheme.');
  }

  if (url.hostname === 'postgres') {
    throw new Error(
      'DATABASE_URL points to the Docker-only hostname "postgres", which is not reachable from your local machine. In Supabase, open Project Settings → Database → Connection string → Session pooler, copy the URI, and replace DATABASE_URL in backend/.env. URL-encode any special characters in the database password.',
    );
  }

  if (!url.hostname || !url.username || !url.password || !url.pathname || url.pathname === '/') {
    throw new Error(
      'DATABASE_URL is incomplete. Copy the full Supabase Session pooler URI, including username, password, host, port, and /postgres database path.',
    );
  }
}

validateDatabaseUrl();

const pool = new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 10000,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error);
});

async function initDatabase({ required = false } = {}) {
  if (!databaseConfigured) {
    if (required) {
      throw new Error('DATABASE_URL must be configured before running database initialization.');
    }

    console.warn('DATABASE_URL is not configured. Using in-memory development data.');
    return;
  }

  const projectRoot = path.resolve(__dirname, '../../../');
  const migrationDirectory = path.join(projectRoot, 'supabase/migrations');
  const migrationFiles = fs.readdirSync(migrationDirectory)
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();
  const seedSql = fs.readFileSync(path.join(projectRoot, 'supabase/seed.sql'), 'utf8');
  let client;
  try {
    client = await pool.connect();
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      const host = new URL(databaseUrl).hostname;
      if (host.startsWith('db.') && host.endsWith('.supabase.co')) {
        throw new Error(
          `Supabase direct database host "${host}" did not resolve from this machine. Supabase direct hosts may be IPv6-only; this runtime cannot resolve/reach it. In Supabase, open Project Settings → Database → Connection string → Session pooler, copy the complete URI, replace DATABASE_URL in backend/.env, and set DATABASE_SSL=true. Use the pooler host/username/port exactly as shown in the dashboard.`,
        );
      }

      throw new Error(
        `Cannot resolve PostgreSQL host "${host}". Verify the host in DATABASE_URL in backend/.env and check DNS/network access.`,
      );
    }

    if (error.code === 'ENETUNREACH' || error.code === 'EHOSTUNREACH') {
      const host = new URL(databaseUrl).hostname;
      throw new Error(
        `The network cannot reach PostgreSQL host "${host}". If this is a Supabase direct database URL, use the Session pooler connection URI instead; direct connections may require IPv6 support.`,
      );
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      const host = new URL(databaseUrl).hostname;
      throw new Error(
        `Cannot reach PostgreSQL host "${host}". Check the Supabase connection URI, password, network access, and DATABASE_SSL setting.`,
      );
    }

    if (error.code === '28P01' || error.code === '28000') {
      throw new Error(
        'Supabase reached the database, but rejected the PostgreSQL login. In Supabase, reset/copy the database password, then update DATABASE_URL with the Session pooler URI using username postgres.<project-ref>. URL-encode special characters in the password. This is the database password, not the anon key or service-role key.',
      );
    }

    throw error;
  }

  try {
    await client.query('BEGIN');
    for (const migrationFile of migrationFiles) {
      const migrationSql = fs.readFileSync(path.join(migrationDirectory, migrationFile), 'utf8');
      await client.query(migrationSql);
    }
    await client.query(seedSql);
    await client.query('COMMIT');
    console.log('PostgreSQL schema is ready and seed data is loaded.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function closeDatabase() {
  await pool.end();
}

module.exports = { pool, databaseConfigured, initDatabase, closeDatabase };
