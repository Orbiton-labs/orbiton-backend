import { DatabaseType, db } from '@src/db';
import { Address, Cell } from '@ton/core';
import { eq } from 'drizzle-orm';
import * as schema from '@src/models';
import { tonClient } from '@src/services/ton-client';
import { PositionTlbs } from '@orbiton_labs/v3-contracts-sdk';
import { Position } from '@src/models/position';
import { PositionData } from '@src/models/position-data';
import { ZERO_BD } from '@src/constants';
import { TraceEvent } from '@src/@types';
import { loadTransaction } from '.';
import { encodeBlockId } from './block';

export const getPosition = async (address: Address, event: TraceEvent, _db: DatabaseType = db) => {
  const positionData = await _db.query.position.findFirst({
    where: eq(schema.position.id, address.toString()),
  });
  if (!positionData) {
    console.log('position address:', address);
    const positionInformation = await tonClient.getContractState(address);
    const positionStorage = PositionTlbs.loadPositionStorage(
      Cell.fromBoc(Buffer.from(positionInformation.data))[0].asSlice(),
    );
    const pool = await _db.query.pool.findFirst({
      where: eq(schema.pool.id, positionStorage.second_ref.pool_address.toString()),
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

export const updateFeeVars = async (
  position: Position,
  _db: DatabaseType = db,
): Promise<Position> => {
  const positionInformation = await tonClient
    .getContractState(Address.parse(position.id))
    .catch((err) => null);
  if (!positionInformation) return position;
  const positionStorage = PositionTlbs.loadPositionStorage(
    Cell.fromBoc(Buffer.from(positionInformation.data))[0].asSlice(),
  );
  position.feeGrowthInside0LastX128 =
    positionStorage.first_ref.fee_growth_inside0_last_x128.toString();
  position.feeGrowthInside1LastX128 =
    positionStorage.first_ref.fee_growth_inside1_last_x128.toString();
  return position;
};

export const savePositionSnapshot = async (
  position: Position,
  event: TraceEvent,
  _db: DatabaseType = db,
) => {
  const positionSnapshotId = `${position.id}-${encodeBlockId(event.block.id)}`;
  const positionSnapshotData: PositionData = {
    id: positionSnapshotId,
    owner: position.owner,
    poolId: position.poolId,
    block: event.block,
    timestamp: new Date(event.block.timestamp),
    liquidity: position.liquidity,
    depositedJetton0: position.depositedJetton0,
    depositedJetton1: position.depositedJetton1,
    withdrawnJetton0: position.withdrawnJetton0,
    withdrawnJetton1: position.withdrawnJetton1,
    collectedFeeJetton0: position.collectedFeeJetton0,
    collectedFeeJetton1: position.collectedFeeJetton1,
    feeGrowthInside0LastX128: position.feeGrowthInside0LastX128,
    feeGrowthInside1LastX128: position.feeGrowthInside1LastX128,
    positionId: position.id,
  };
  await _db.insert(schema.positionData).values(positionSnapshotData);
};
