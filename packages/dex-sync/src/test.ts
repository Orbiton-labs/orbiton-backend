import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const db = drizzle({
  schema,
  connection: process.env.DATABASE_URL as string,
});

const main = async () => {
  const router = await db.query.router.findFirst();
  console.log(router);
};

main();
