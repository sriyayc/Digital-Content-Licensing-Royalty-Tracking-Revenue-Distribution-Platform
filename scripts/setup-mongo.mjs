// Creates the MongoDB collection usage_reports (validator + indexes) and
// seeds it with the raw reports behind the seeded MySQL usage_record rows.
// Run after setup-mysql.mjs.
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import { mysqlConfig } from './env.mjs';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.MONGODB_DB || 'royalty_nosql';

const validator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['platform_id', 'currency', 'submitted_at', 'status', 'lines'],
    properties: {
      platform_id: { bsonType: 'int' },
      platform_name: { bsonType: 'string' },
      currency: { bsonType: 'string', pattern: '^[A-Z]{3}$' },
      submitted_at: { bsonType: 'date' },
      status: { enum: ['PROCESSED', 'PARTIAL', 'REJECTED'] },
      lines: { bsonType: 'array' },        // raw lines exactly as the platform sent them
      sql_usage_ids: { bsonType: 'array' },
    },
  },
};

// each platform type sends its own extra fields; MongoDB stores them as-is
const extras = {
  STREAMING: (i) => ({ avg_listen_sec: 150 + (i * 37) % 90, subscriber_type: i % 2 ? 'FREE' : 'PREMIUM' }),
  SOCIAL: () => ({ watch_time_minutes: 52000, device: { mobile: 0.68, desktop: 0.24, tv: 0.08 } }),
  DOWNLOAD: () => ({ unit_price: 89, file_format: 'FLAC' }),
  BROADCAST: () => ({ slot: 'PRIME', city: 'Bengaluru' }),
};

// how one licence's usage is spread across its territories in the raw report
function split(row, territories) {
  const list = territories.includes('WW') ? ['IN', 'US', 'GB', 'BR'] : territories;
  const share = 1 / list.length;
  let q = Number(row.quantity);
  let r = Number(row.gross_revenue);
  return list.map((territory, i) => {
    const last = i === list.length - 1;
    const quantity = last ? q : Math.round(Number(row.quantity) * share);
    const gross_revenue = last ? Math.round(r * 100) / 100 : Math.round(Number(row.gross_revenue) * share * 100) / 100;
    q -= quantity;
    r -= gross_revenue;
    return { license_id: row.license_id, usage_date: row.usage_date, territory, quantity, gross_revenue };
  });
}

const sql = await mysql.createConnection(mysqlConfig(true));
const client = await new MongoClient(uri).connect();
const db = client.db(dbName);

await db.collection('usage_reports').drop().catch(() => {});
await db.createCollection('usage_reports', { validator });
const reports = db.collection('usage_reports');
await reports.createIndex({ platform_id: 1, submitted_at: -1 });
await reports.createIndex({ 'lines.territory': 1 });

const [usage] = await sql.query(`
  SELECT u.usage_id, u.license_id, u.usage_date, u.quantity, u.gross_revenue, u.currency, u.source_batch_ref,
         p.platform_id, p.platform_name, p.platform_type
    FROM usage_record u
    JOIN license l  ON l.license_id = u.license_id
    JOIN platform p ON p.platform_id = l.platform_id
   ORDER BY u.source_batch_ref, u.usage_id`);
const [terr] = await sql.query('SELECT license_id, territory FROM license_territory');
const territoriesOf = {};
for (const t of terr) (territoriesOf[t.license_id] ??= []).push(t.territory);

const batches = {};
for (const row of usage) (batches[`${row.source_batch_ref}|${row.currency}`] ??= []).push(row);

const docs = Object.values(batches).map((rows) => {
  const first = rows[0];
  const lines = rows.flatMap((r) => split(r, territoriesOf[r.license_id]))
    .map((l, i) => ({ ...l, ...extras[first.platform_type](i) }));
  return {
    platform_id: first.platform_id,
    platform_name: first.platform_name,
    currency: first.currency,
    batch_ref: first.source_batch_ref,
    submitted_at: new Date(new Date(first.usage_date).getTime() + 3 * 86400000),
    status: 'PROCESSED',
    lines,
    errors: [],
    sql_usage_ids: rows.map((r) => r.usage_id),
  };
});
await reports.insertMany(docs);

console.log(`> MongoDB "${dbName}": ${docs.length} usage_reports`);
await client.close();
await sql.end();
