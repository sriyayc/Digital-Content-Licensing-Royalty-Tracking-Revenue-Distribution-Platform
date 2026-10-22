// Minimal .env loader for the setup scripts (Next.js loads .env.local itself).
import fs from 'node:fs';
import path from 'node:path';

for (const name of ['.env.local', '.env']) {
  const file = path.resolve(process.cwd(), name);
  if (!fs.existsSync(file)) continue;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function mysqlConfig(withDatabase = true) {
  const cfg = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    dateStrings: true,
  };
  if (withDatabase) cfg.database = process.env.MYSQL_DATABASE || 'royalty_db';
  return cfg;
}
