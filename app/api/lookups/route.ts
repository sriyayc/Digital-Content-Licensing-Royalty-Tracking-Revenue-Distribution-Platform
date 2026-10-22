import { route, requireUser } from '@/lib/api';
import { query } from '@/lib/mysql';

// id / name lists for dropdowns
export const GET = route(async () => {
  await requireUser('ADMIN');
  const [platforms, creators, content] = await Promise.all([
    query('SELECT platform_id, platform_name FROM platform ORDER BY platform_name'),
    query('SELECT creator_id, name FROM creator ORDER BY name'),
    query('SELECT content_id, title FROM content ORDER BY title'),
  ]);
  return { platforms, creators, content };
});
