import { TraceEvent } from '@src/@types';
import { ONE_BD, ONE_BI, ZERO_BD, ZERO_BI } from '@src/constants';
import { DatabaseType, db } from '@src/db';
import { Transaction } from '@src/models';
import * as schema from '@src/models';
import { BigIntHelper } from '@src/utils/bigint';
import { eq } from 'drizzle-orm';
import BigDecimal from 'decimal.js';

export const bigDecimalExponated = (value: BigDecimal, power: bigint): BigDecimal => {
  if (power == ZERO_BI) {
    return new BigDecimal(ONE_BD);
  }
  let negativePower = power < ZERO_BI;
  let result = new BigDecimal(ZERO_BD).add(value);
  let powerAbs = BigIntHelper.abs(power);
  for (let i = ONE_BI; i < powerAbs; i = i + ONE_BI) {
    result = result.mul(value);
  }

  if (negativePower) {
    result = new BigDecimal(ONE_BD).div(result);
  }
  return result;
};

export const loadTransaction = async (
  event: TraceEvent,
  _db: DatabaseType = db,
): Promise<[Transaction, boolean]> => {
  let transaction = await _db.query.transaction.findFirst({
    where: eq(schema.transaction.hash, event.transaction.hash),
  });
  let existed = true;
  if (!transaction) {
    await _db.insert(schema.transaction).values({
      hash: event.transaction.hash,
      block: event.block.id,
      timestamp: new Date(event.block.timestamp),
    });
    transaction = await _db.query.transaction.findFirst({
      where: eq(schema.transaction.hash, event.transaction.hash),
    });
    existed = false;
  }
  return [transaction, existed];
};
