import { MongoClient, type Db } from 'mongodb';

const g = globalThis as unknown as { __mongoClient?: Promise<MongoClient> };

export async function mongo(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing environment variable MONGODB_URI (see .env.example)');
  if (!g.__mongoClient) {
    g.__mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 }).connect();
    g.__mongoClient.catch(() => { g.__mongoClient = undefined; });
  }
  const client = await g.__mongoClient;
  return client.db(process.env.MONGODB_DB || 'royalty_nosql');
}
