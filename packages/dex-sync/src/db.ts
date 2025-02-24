import { drizzle as drizzlePg, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePgLite } from 'drizzle-orm/pglite';
import * as schema from './models/index';
import env from './configs/env';

export enum DatabaseMode {
  IN_MEMORY,
  POSTGREQL,
}

let db: NodePgDatabase<typeof schema> & {
  $client: {
    schema: typeof schema;
    connection: any;
  };
} = undefined;

export class Database {
  static instance: any;

  static init(mode: DatabaseMode) {
    switch (mode) {
      case DatabaseMode.IN_MEMORY:
        const client = new PGlite();
        Database.instance = drizzlePgLite({ client, schema });
        break;
      case DatabaseMode.POSTGREQL:
        Database.instance = drizzlePg({
          schema: schema,
          connection: env.server.pgUrl,
        });
        break;
      default:
        throw new Error('Invalid database mode');
    }
    db = Database.instance;
  }
}

export { db };
