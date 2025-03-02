import { handleMint } from '../../src/mappings/core/mint';
import { Database, DatabaseMode, db } from '../../src/db';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { Jetton, Pool, Router, Transaction } from '../../src/models';
import { getMockInitializeEvent, getMockMintEventInsideCurrentTick } from './common';
import { handleInitialize } from '../../src/mappings/core/initalize';
import { convertJettonToDecimal } from '../../src/mappings/utils/jetton';
import * as schema from '../../src/models';
import { ONE_DAY_IN_MILLISECONDS } from '../../src/constants';
import { eq } from 'drizzle-orm';
import BigDecimal from 'js-big-decimal';
import './__mocks__';
//@ts-ignore
import { describe, it, expect, beforeAll } from 'bun:test';
import { bigDecimalExponated } from '../../src/mappings/utils';

describe('Test Handle Swap', () => {
  beforeAll(async () => {
    Database.init(DatabaseMode.IN_MEMORY);
    await migrate(db as any, {
      migrationsFolder: __dirname.split('/tests')[0] + '/drizzle',
    });
    const initializeEvent = getMockInitializeEvent();
    await handleInitialize(initializeEvent);
    const mintEvent = getMockMintEventInsideCurrentTick();
    await handleMint(mintEvent);
  });

  it('should handle swap event', async () => {});
});
