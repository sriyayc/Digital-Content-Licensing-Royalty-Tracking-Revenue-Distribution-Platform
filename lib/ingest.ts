import { ObjectId } from 'mongodb';
import { mongo } from './mongo';
import { query, withTransaction } from './mysql';
import { ApiError } from './api';

const USAGE_TYPE: Record<string, string> = {
  STREAMING: 'STREAM', SOCIAL: 'VIEW', DOWNLOAD: 'DOWNLOAD', BROADCAST: 'BROADCAST', OTHER: 'SYNC',
};

type Line = Record<string, any> & { error?: string };

/**
 * Usage report ingestion:
 *  1. validate each raw line (licence belongs to platform, territory covered)
 *  2. sum valid lines per (licence, date) and insert into MySQL usage_record
 *     in ONE transaction, with a SAVEPOINT per row so a row rejected by
 *     trg_usage_bi does not undo the others
 *  3. store the raw report + outcome in MongoDB usage_reports
 */
export async function ingestReport(platformId: number, currency: string, lines: Line[]) {
  if (!Array.isArray(lines) || lines.length === 0) throw new ApiError(400, 'Report must contain a non-empty "lines" array');

  const platform = (await query('SELECT platform_id, platform_name, platform_type FROM platform WHERE platform_id = ?', [platformId]))[0];
  if (!platform) throw new ApiError(404, 'Platform not found');

  const licenses = await query(
    `SELECT l.license_id, l.platform_id, GROUP_CONCAT(t.territory) AS territories
       FROM license l LEFT JOIN license_territory t ON t.license_id = l.license_id
      WHERE l.platform_id = ? GROUP BY l.license_id, l.platform_id`, [platformId]);
  const byId = new Map(licenses.map((l) => [l.license_id, String(l.territories ?? '').split(',')]));

  // 1. validate
  for (const l of lines) {
    const terr = byId.get(Number(l.license_id));
    if (!terr) l.error = `Licence ${l.license_id} does not belong to ${platform.platform_name}`;
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(String(l.usage_date))) l.error = 'usage_date must be YYYY-MM-DD';
    else if (new Date(l.usage_date) > new Date()) l.error = 'usage_date cannot be in the future';
    else if (!(Number(l.quantity) > 0)) l.error = 'quantity must be positive';
    else if (!(Number(l.gross_revenue) >= 0)) l.error = 'gross_revenue must be 0 or more';
    else if (!terr.includes('WW') && !terr.includes(String(l.territory))) l.error = `Territory ${l.territory} not covered by licence ${l.license_id}`;
  }

  // 2. load into MySQL
  const groups = new Map<string, { license_id: number; usage_date: string; quantity: number; gross: number; lines: Line[] }>();
  for (const l of lines.filter((x) => !x.error)) {
    const key = `${l.license_id}|${l.usage_date}`;
    const g = groups.get(key) ?? { license_id: Number(l.license_id), usage_date: l.usage_date, quantity: 0, gross: 0, lines: [] as Line[] };
    g.quantity += Number(l.quantity);
    g.gross = Math.round((g.gross + Number(l.gross_revenue)) * 100) / 100;
    g.lines.push(l);
    groups.set(key, g);
  }

  const _id = new ObjectId();
  const usageIds: number[] = [];
  if (groups.size) {
    await withTransaction(async (conn) => {
      let i = 0;
      for (const g of groups.values()) {
        await conn.query(`SAVEPOINT row_${i}`);
        try {
          const [res]: any = await conn.query(
            `INSERT INTO usage_record (license_id, usage_date, usage_type, quantity, gross_revenue, currency, source_batch_ref)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [g.license_id, g.usage_date, USAGE_TYPE[platform.platform_type], g.quantity, g.gross, currency, _id.toHexString()],
          );
          usageIds.push(res.insertId);
        } catch (err: any) {
          await conn.query(`ROLLBACK TO SAVEPOINT row_${i}`);
          for (const l of g.lines) l.error = err.sqlMessage ?? err.message;
        }
        i++;
      }
    });
  }

  // 3. keep the raw report in MongoDB
  const errors = lines.map((l, i) => (l.error ? { line: i + 1, error: l.error } : null)).filter(Boolean);
  const accepted = lines.length - errors.length;
  const status = accepted === 0 ? 'REJECTED' : errors.length ? 'PARTIAL' : 'PROCESSED';
  const raw = lines.map(({ error, ...rest }) => ({ ...rest, accepted: !error }));
  await (await mongo()).collection('usage_reports').insertOne({
    _id,
    platform_id: platform.platform_id,
    platform_name: platform.platform_name,
    currency,
    submitted_at: new Date(),
    status,
    lines: raw,
    errors,
    sql_usage_ids: usageIds,
  });

  return { report_id: _id.toHexString(), status, accepted, total: lines.length, errors, usage_ids: usageIds };
}
