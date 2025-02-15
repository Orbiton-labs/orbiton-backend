import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './models/index';
import { config } from 'dotenv';

config();

export const db = drizzle({
  schema: schema,
  connection: process.env.DATABASE_URL as string,
});
