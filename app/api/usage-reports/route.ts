import { route, requireUser } from '@/lib/api';
import { mongo } from '@/lib/mongo';
import { ingestReport } from '@/lib/ingest';

// List raw reports + MongoDB aggregations
export const GET = route(async () => {
  await requireUser('ADMIN');
  const col = (await mongo()).collection('usage_reports');
  const [reports, byTerritory, byPlatform] = await Promise.all([
    col.find({}, { projection: { lines: 0 } }).sort({ submitted_at: -1 }).limit(100).toArray(),
    // usage per territory: only available in the raw reports
    col.aggregate([
      { $match: { status: { $ne: 'REJECTED' } } },
      { $unwind: '$lines' },
      { $match: { 'lines.accepted': { $ne: false } } },
      { $group: { _id: { territory: '$lines.territory', currency: '$currency' },
                  quantity: { $sum: '$lines.quantity' }, revenue: { $sum: '$lines.gross_revenue' } } },
      { $sort: { quantity: -1 } },
    ]).toArray(),
    // reports and lines per platform
    col.aggregate([
      { $group: { _id: '$platform_name', reports: { $sum: 1 }, lines: { $sum: { $size: '$lines' } },
                  rejected_lines: { $sum: { $size: { $ifNull: ['$errors', []] } } } } },
      { $sort: { reports: -1 } },
    ]).toArray(),
  ]);
  return { reports, byTerritory, byPlatform };
});

// Submit a report: { platform_id, currency, lines: [...] }
export const POST = route(async (req) => {
  await requireUser('ADMIN');
  const b = await req.json();
  return ingestReport(Number(b.platform_id), String(b.currency).toUpperCase(), b.lines);
});
