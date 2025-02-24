import { Database, DatabaseMode, db } from '../src/db';
import * as schema from '../src/models';
import { migrate } from 'drizzle-orm/pglite/migrator';
import process from 'process';

describe('Test me', () => {
  it('should pass', async () => {
    // console.log(process.cwd() + '/drizzle');
    Database.init(DatabaseMode.IN_MEMORY);
    await migrate(db as any, {
      migrationsFolder: process.cwd() + '/drizzle',
    });

    await db.insert(schema.transaction).values({
      hash: '0x123',
      block: 1,
      timestamp: new Date(),
    });

    const transactions = await db.query.transaction.findMany();
    console.log(transactions);
  });
});
