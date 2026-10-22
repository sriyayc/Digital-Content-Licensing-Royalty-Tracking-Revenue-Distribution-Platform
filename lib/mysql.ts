import mysql, { type Pool, type PoolConnection } from 'mysql2/promise';

// Connection settings come from environment variables (.env.local)
const g = globalThis as unknown as { pool?: Pool };

export function pool(): Pool {
  g.pool ??= mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    connectionLimit: 10,
    dateStrings: true,
    decimalNumbers: true,
  });
  return g.pool;
}

export async function query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await pool().query(sql, params);
  return rows as T[];
}

/** Run fn inside a transaction: COMMIT on success, ROLLBACK on any error. */
export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Run fn on one connection (needed to read OUT parameters of procedures). */
export async function withConnection<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool().getConnection();
  try {
    return await fn(conn);
  } finally {
    conn.release();
  }
}
