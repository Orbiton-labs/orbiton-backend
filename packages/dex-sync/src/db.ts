import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './models/index';
import env from './configs/env';

export const db = drizzle({
  schema: schema,
  connection: env.server.pgUrl,
});
