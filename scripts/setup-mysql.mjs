// Creates the MySQL database, runs every DDL/seed file in order and
// creates the demo login accounts with bcrypt-hashed passwords.
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { mysqlConfig } from './env.mjs';
import { splitSql } from './sql-splitter.mjs';

const SQL_DIR = path.resolve('database/mysql');
const FILES = ['01_schema.sql', '02_views.sql', '03_functions_procedures.sql', '04_triggers.sql', '05_seed.sql'];
export const DEMO_PASSWORD = 'Password@123';

const DEMO_USERS = [
  { email: 'admin@royalty.example.com', role: 'ADMIN' },
  { email: 'aarav@creators.example.com', role: 'CREATOR', creator_id: 1 },
  { email: 'band@monsoon.example.com', role: 'CREATOR', creator_id: 2 },
  { email: 'finance@lumen.example.com', role: 'CREATOR', creator_id: 4 },
];

async function main() {
  const dbName = process.env.MYSQL_DATABASE || 'royalty_db';
  if (!/^[A-Za-z0-9_]+$/.test(dbName)) throw new Error('MYSQL_DATABASE may only contain letters, digits and _');

  const admin = await mysql.createConnection(mysqlConfig(false));
  await admin.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
  await admin.end();

  const conn = await mysql.createConnection(mysqlConfig(true));
  for (const file of FILES) {
    const statements = splitSql(fs.readFileSync(path.join(SQL_DIR, file), 'utf8'));
    process.stdout.write(`> ${file} (${statements.length} statements) ... `);
    for (const sql of statements) {
      try {
        await conn.query(sql);
      } catch (err) {
        console.error(`\nFailed in ${file}:\n${sql.slice(0, 400)}\n`);
        throw err;
      }
    }
    console.log('ok');
  }

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const u of DEMO_USERS) {
    await conn.execute(
      'INSERT INTO app_user (email, password_hash, role, creator_id) VALUES (?, ?, ?, ?)',
      [u.email, hash, u.role, u.creator_id ?? null],
    );
  }
  console.log(`> created ${DEMO_USERS.length} demo users (password: ${DEMO_PASSWORD})`);

  const [[counts]] = await conn.query(`
    SELECT (SELECT COUNT(*) FROM usage_record) AS usage_rows,
           (SELECT COUNT(*) FROM royalty)      AS royalty_lines,
           (SELECT COUNT(*) FROM payment)      AS payments`);
  console.log('> seed summary:', counts);
  await conn.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
