import { DatabaseType, db } from '@src/db';
import { Address, Cell } from '@ton/core';
import { eq } from 'drizzle-orm';
import * as schema from '@src/models';
import { tonClient } from '@src/services/ton-client';
import { PositionTlbs } from '@orbiton_labs/v3-contracts-sdk';
import { Position } from '@src/models/position';
import { Pool } from '@src/models/pool';
import { Transaction } from '@src/models/transaction';
import { ZERO_BD } from '@src/constants';
import { TraceEvent } from '@src/@types';
import { loadTransaction } from '.';
import { encodeBlockId } from './block';

export const getPosition = async (address: Address, event: TraceEvent, _db: DatabaseType = db) => {
  const positionData = await _db.query.position.findFirst({
    where: eq(schema.position.id, address.toString()),
  });
  if (!positionData) {
    const positionInformation = await tonClient.getContractState(address);
    const positionStorage = PositionTlbs.loadPositionStorage(
      Cell.fromBoc(Buffer.from(positionInformation.code))[0].asSlice(),
    );
    const pool = await _db.query.pool.findFirst({
      where: eq(schema.pool.address, positionStorage.second_ref.pool_address.toString()),
    });
    const [transaction, _] = await loadTransaction(event, _db);
    const position: Position = {
      id: address.toString(),
      poolId: pool.id,
      transactionId: transaction.id,
      jetton0Id: pool.jetton0Id,
      jetton1Id: pool.jetton1Id,
      liquidity: positionStorage.first_ref.liquidity.toString(),
      collectedFeeJetton0: ZERO_BD,
      collectedFeeJetton1: ZERO_BD,
      depositedJetton0: ZERO_BD,
      depositedJetton1: ZERO_BD,
      withdrawnJetton0: ZERO_BD,
      withdrawnJetton1: ZERO_BD,
      feeGrowthInside0LastX128: positionStorage.first_ref.fee_growth_inside0_last_x128.toString(),
      feeGrowthInside1LastX128: positionStorage.first_ref.fee_growth_inside1_last_x128.toString(),
      tickLower: BigInt(positionStorage.first_ref.tick_lower),
      tickUpper: BigInt(positionStorage.first_ref.tick_upper),
      owner: positionStorage.second_ref.owner_address.toString(),
    };
    return position;
  }
  return positionData;
};

export const savePositionSnapshot = async (
  position: Position,
  event: TraceEvent,
  _db: DatabaseType = db,
) => {
  const positionSnapshotId = `${position.id}#${encodeBlockId(event.block.id)}`;
  const positionSnapshotData = {};
};
