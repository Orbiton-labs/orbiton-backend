import { Database, DatabaseMode, db } from '../src/db';
import * as schema from '../src/models';
import { migrate } from 'drizzle-orm/pglite/migrator';

describe('Test me', () => {
  it('should pass', async () => {
    // console.log(process.cwd() + '/drizzle');
    Database.init(DatabaseMode.IN_MEMORY);
    await migrate(db as any, {
      migrationsFolder: __dirname.split('/tests')[0] + '/drizzle',
    });

    const res = await db
      .insert(schema.transaction)
      .values([
        {
          id: '0x123',
          block: 1,
          timestamp: new Date(),
        },
      ])
      .returning({
        id: schema.transaction.id,
      });

    const transactions = await db.query.transaction.findMany();
    console.log(transactions);
  });
});
