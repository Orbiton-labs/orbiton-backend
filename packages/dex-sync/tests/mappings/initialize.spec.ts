import { Address } from '@ton/core';
import { Initialize } from '../../src/@types/core.type';
import { encodePriceSqrt } from '../helper';
import { TickMath } from '@pancakeswap/v3-sdk';
import { handleInitialize } from '../../src/mappings/core/initalize';
import { Database, DatabaseMode, db } from '../../src/db';
import { migrate } from 'drizzle-orm/pglite/migrator';

const getMockInitializeEvent = () => {
  const sqrtPriceX96 = BigInt(encodePriceSqrt(1n, 4n).toString());
  const tick = BigInt(TickMath.getTickAtSqrtRatio(sqrtPriceX96));
  const event = {
    address: Address.parse('EQC-aFP0rJXwTgKZQJPbPfTSpBFc8wxOgKHWD9cPvOl_DnaY'),
    block: {
      timestamp: 1740294550000,
      id: {
        fileHash: Buffer.from(
          '71ead6188ca8b04113e61858fba8c7e4293971ac70679bc56e77cf3b7c669a58',
          'hex',
        ),
        kind: 'tonNode.blockIdExt',
        rootHash: Buffer.from(
          'bc4f49c50ddf5ec7993dfda1a2a96d64b715956a4d6bb3cf2baf3d9f1102048e',
          'hex',
        ),
        seqno: 49883755,
        shard: 'a000000000000000',
        workchain: 0,
      },
    },
    transaction: {
      from: Address.parse('EQBDYpOew7_senlP8SzANhgeqOqGts0AySHQQ6UCQbO2NO6u'),
      to: Address.parse('EQC-aFP0rJXwTgKZQJPbPfTSpBFc8wxOgKHWD9cPvOl_DnaY'),
      hash: '3760ef15eb462b281b639bc501d1bd027205bc9d0ce02face5477e70392849bf',
    },
    sqrtPriceX96,
    tick,
    fee: 500n,
    tickSpacing: 60n,
    jetton0: Address.parse('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs'),
    jetton1: Address.parse('EQAJ8uWd7EBqsmpSWaRdf_I-8R8-XHwh3gsNKhy-UrdrPcUo'),
  } as Initialize;
  return event;
};

describe('Test Handle Initialize', () => {
  beforeEach(async () => {
    Database.init(DatabaseMode.IN_MEMORY);
    await migrate(db as any, {
      migrationsFolder: __dirname.split('/tests')[0] + '/drizzle',
    });
  });

  it('should handle initialize event when there is no pool yet', async () => {
    const event = getMockInitializeEvent();
    await handleInitialize(event).catch((err) => {
      console.log(err);
      console.log(err.stack);
    });
    let router = await db.query.router.findFirst({});
    console.log(router);
  }, 100000);
});
