// Database test cases. Tests that change data run inside a transaction
// that is rolled back. Results are printed and saved to docs/TEST_RESULTS.md.
import fs from 'node:fs';
import mysql from 'mysql2/promise';
import { mysqlConfig } from './env.mjs';

const conn = await mysql.createConnection(mysqlConfig(true));
const tests = [];
const test = (name, fn, tx = true) => tests.push({ name, fn, tx });

async function expectError(sql, code) {
  try {
    await conn.query(sql);
  } catch (err) {
    if (err.errno !== code) throw new Error(`expected error ${code}, got ${err.errno}: ${err.message}`);
    return err.message;
  }
  throw new Error('statement succeeded but should have failed');
}
const one = async (sql) => (await conn.query(sql))[0][0];

test('CHECK: ownership percentage 0 is rejected', () =>
  expectError(`INSERT INTO ownership VALUES (6, 10, 0, 'PRODUCER')`, 3819));
test('CHECK: licence end date before start date is rejected', () =>
  expectError(`INSERT INTO license (platform_id, content_id, license_type, start_date, end_date, royalty_rate, currency)
               VALUES (1, 10, 'NON_EXCLUSIVE', '2026-05-01', '2026-01-01', 0.3, 'INR')`, 3819));
test('CHECK: royalty rate above 1 is rejected', () =>
  expectError(`INSERT INTO license (platform_id, content_id, license_type, start_date, royalty_rate, currency)
               VALUES (1, 10, 'NON_EXCLUSIVE', '2026-05-01', 1.5, 'INR')`, 3819));
test('CHECK: invalid e-mail is rejected', () =>
  expectError(`INSERT INTO platform (platform_name, platform_type, country, contact_email)
               VALUES ('Bad Mail', 'OTHER', 'IN', 'not-an-email')`, 3819));
test('UNIQUE: duplicate platform name is rejected', () =>
  expectError(`INSERT INTO platform (platform_name, platform_type, country, contact_email)
               VALUES ('Melodia Stream', 'STREAMING', 'IN', 'a@b.example.com')`, 1062));
test('FOREIGN KEY: licence for a missing platform is rejected', () =>
  expectError(`INSERT INTO license (platform_id, content_id, license_type, start_date, royalty_rate, currency)
               VALUES (999, 1, 'NON_EXCLUSIVE', '2026-01-01', 0.3, 'INR')`, 1452));
test('FOREIGN KEY: deleting a creator who owns content is blocked', () =>
  expectError(`DELETE FROM creator WHERE creator_id = 1`, 1451));
test('UNIQUE: duplicate creator e-mail is rejected', () =>
  expectError(`INSERT INTO creator (name, creator_type, email, country)
               SELECT 'Duplicate Test', 'INDIVIDUAL', email, 'IN' FROM creator WHERE creator_id = 1`, 1062));
test('CHECK: invalid creator e-mail is rejected', () =>
  expectError(`INSERT INTO creator (name, creator_type, email, country)
               VALUES ('Bad Mail Creator', 'INDIVIDUAL', 'not-an-email', 'IN')`, 3819));
test('FOREIGN KEY: deleting a work that has a licence is blocked', () =>
  expectError(`DELETE FROM content WHERE content_id = (SELECT content_id FROM license LIMIT 1)`, 1451));
test('TRIGGER: ownership total above 100% is rejected', () =>
  expectError(`INSERT INTO ownership VALUES (7, 1, 10, 'PRODUCER')`, 1644));
test('TRIGGER: ownership up to exactly 100% is accepted', async () => {
  await conn.query(`INSERT INTO ownership VALUES (6, 10, 40, 'PRODUCER')`);
  return 'accepted';
});
test('TRIGGER: usage outside the licence period is rejected', () =>
  expectError(`INSERT INTO usage_record (license_id, usage_date, usage_type, quantity, gross_revenue, currency, source_batch_ref)
               VALUES (6, '2026-08-15', 'DOWNLOAD', 10, 890, 'INR', 'TEST')`, 1644));
test('TRIGGER: usage in the wrong currency is rejected', () =>
  expectError(`INSERT INTO usage_record (license_id, usage_date, usage_type, quantity, gross_revenue, currency, source_batch_ref)
               VALUES (1, '2026-10-01', 'STREAM', 100, 32, 'USD', 'TEST')`, 1644));
test('TRIGGER: failing a payment releases its royalty lines', async () => {
  const { pid } = await one(`SELECT payment_id AS pid FROM payment WHERE status = 'PENDING' LIMIT 1`);
  await conn.query(`UPDATE payment SET status = 'FAILED' WHERE payment_id = ${pid}`);
  const { n } = await one(`SELECT COUNT(*) AS n FROM royalty WHERE payment_id = ${pid}`);
  if (n !== 0) throw new Error(`${n} lines still attached`);
  return 'lines released';
});
test('FUNCTION: fn_creator_unpaid_balance matches the view', async () => {
  const { a, b } = await one(`SELECT fn_creator_unpaid_balance(6, 'INR') AS a,
                              (SELECT unpaid FROM v_creator_earnings WHERE creator_id = 6 AND currency = 'INR') AS b`);
  if (a !== b) throw new Error(`${a} != ${b}`);
  return `both ${a}`;
});
test('PROCEDURE: re-running royalty calculation creates no duplicates', async () => {
  await conn.query(`CALL sp_calculate_royalties('2026-01-01', '2026-06-30', @l)`);
  const { l } = await one('SELECT @l AS l');
  if (l !== 0) throw new Error(`${l} new lines`);
  return '0 new lines';
}, false);
test('PROCEDURE: payout with nothing owed is rejected', () =>
  expectError(`CALL sp_settle_creator_payout(1, 'INR', 'UPI', @p)`, 1644), false);
test('TRANSACTION: ROLLBACK undoes an insert', async () => {
  await conn.query('START TRANSACTION');
  await conn.query(`INSERT INTO content (title, content_type) VALUES ('Rollback test', 'TEXT')`);
  await conn.query('ROLLBACK');
  const { n } = await one(`SELECT COUNT(*) AS n FROM content WHERE title = 'Rollback test'`);
  if (n !== 0) throw new Error('row survived');
  return 'row removed';
}, false);

const results = [];
for (const t of tests) {
  if (t.tx) await conn.query('START TRANSACTION');
  let status = 'PASS';
  let detail;
  try { detail = await t.fn(); } catch (err) { status = 'FAIL'; detail = err.message; }
  if (t.tx) await conn.query('ROLLBACK');
  results.push({ ...t, status, detail });
  console.log(`${status}  ${t.name}${status === 'FAIL' ? `  -> ${detail}` : ''}`);
}
await conn.end();

const passed = results.filter((r) => r.status === 'PASS').length;
console.log(`\n${passed}/${results.length} passed`);

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/TEST_RESULTS.md', [
  '# Database Test Results',
  '',
  `Run with \`npm run test:db\`: **${passed}/${results.length} passed**.`,
  '',
  '| # | Test case | Result | Database response |',
  '|---|-----------|--------|-------------------|',
  ...results.map((r, i) => `| ${i + 1} | ${r.name} | ${r.status} | ${String(r.detail ?? '').replace(/\|/g, '\\|')} |`),
  '',
].join('\n'));
process.exit(passed === results.length ? 0 : 1);
