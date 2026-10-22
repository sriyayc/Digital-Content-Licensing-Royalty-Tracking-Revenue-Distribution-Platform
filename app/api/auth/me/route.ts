import { route, requireUser } from '@/lib/api';

export const GET = route(async () => ({ user: await requireUser() }));
