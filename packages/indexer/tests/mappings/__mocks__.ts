import { PositionTlbs } from '@orbiton_labs/v3-contracts-sdk';
import { Jetton } from '../../src/models';
//@ts-ignore
import { mock, jest } from 'bun:test';
import { Address, beginCell } from '@ton/core';

mock.module('../../src/mappings/utils/ton', () => {
  const funcs = require('../../src/mappings/utils/ton');
  return {
    ...funcs,
    getTonPrice: jest.fn().mockReturnValue(2),
    findTonPerJetton: jest.fn().mockImplementation((jetton: Jetton) => {
      switch (jetton.id) {
        case 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs':
          return '0.5';
        case 'EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1O-8QUA3728':
          return '0.5';
      }
    }),
    getFeesGrowthGlobalAtTick: jest.fn().mockImplementation((_: bigint) => {
      return ['10000', '20000'];
    }),
  };
});

mock.module('@src/services/ton-client', () => {
  return {
    tonClient: {
      open: () => ({
        getFeesGrowthGlobalAtTick: jest.fn(() => ['10000', '20000']),
        getFeesGrowthGlobal: jest.fn(() => ['10000', '20000']),
      }),
      getContractState: jest.fn().mockImplementation(async (positionAddress: Address) => {
        const builder = beginCell();
        PositionTlbs.storePositionStorage({
          kind: 'PositionStorage',
          first_ref: {
            kind: 'PositionFirst',
            tick_lower: -10,
            tick_upper: 10,
            liquidity: 1000000n,
            fee_growth_inside0_last_x128: 500000n,
            fee_growth_inside1_last_x128: 1500000n,
          },
          second_ref: {
            kind: 'PositionSecond',
            owner_address: Address.parse('EQBDYpOew7_senlP8SzANhgeqOqGts0AySHQQ6UCQbO2NO6u'),
            token_owed0: 0n,
            token_owed1: 0n,
            pool_address: Address.parse('EQC-aFP0rJXwTgKZQJPbPfTSpBFc8wxOgKHWD9cPvOl_DnaY'),
          },
        })(builder);
        return {
          data: builder.endCell().toBoc(),
        };
      }),
    },
  };
});

mock.module('@src/mappings/utils/pool', () => {
  const funcs = require('../../src/mappings/utils/pool');
  return {
    ...funcs,
    getJettonsMasterOnchain: jest
      .fn()
      .mockImplementation(() => [
        'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
        'EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1O-8QUA3728',
      ]),
  };
});
