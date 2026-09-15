import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const schemaPath = path.resolve(process.cwd(), 'database/schema.sql');
const schema = await fs.readFile(schemaPath, 'utf8');
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required for migrations.');
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
try {
  await pool.query(schema);
  console.log('Australian Helper schema applied.');
} finally {
  await pool.end();
}
