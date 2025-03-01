import { TickMath } from '@pancakeswap/v3-sdk';
import { encodePriceSqrt } from '../helper';
import { Address } from '@ton/core';
import { InitializeEvent, MintEvent } from '../../src/@types/core.type';

export const getMockInitializeEvent = () => {
  const sqrtPriceX96 = BigInt(encodePriceSqrt(1n, 1n).toString());
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
  } as InitializeEvent;
  return event;
};

export const getMockMintEventInsideCurrentTick = () => {
  const event = {
    address: Address.parse('EQC-aFP0rJXwTgKZQJPbPfTSpBFc8wxOgKHWD9cPvOl_DnaY'),
    block: {
      timestamp: 1740671544,
      id: {
        fileHash: Buffer.from(
          '3138a79c5be7f099c44dd4bc6adbabf48d2a227ea9c41ef9b11677123f7b78aa',
          'hex',
        ),
        kind: 'tonNode.blockIdExt',
        rootHash: Buffer.from(
          '5664b4edc8d57a8578f3613132129ec5ddf006ab64f0197256c0bf2c78bd7a48',
          'hex',
        ),
        seqno: 50051188,
        shard: 'e000000000000000',
        workchain: 0,
      },
    },
    transaction: {
      from: Address.parse('UQDIfz58KSx9PFo10uS_3HJSJ_leYsIicIjMGO3d94peClZX'),
      to: Address.parse('EQC-aFP0rJXwTgKZQJPbPfTSpBFc8wxOgKHWD9cPvOl_DnaY'),
      hash: '45f0985e1e413bf9c39a60bc09878147c26f13833d52eea592c3b205922f1025',
    },
    amount: 15000000n,
    amount0: 17000000n,
    amount1: 9000000n,
    sender: Address.parse('EQBDYpOew7_senlP8SzANhgeqOqGts0AySHQQ6UCQbO2NO6u'),
    owner: Address.parse('EQBDYpOew7_senlP8SzANhgeqOqGts0AySHQQ6UCQbO2NO6u'),
    tickLower: -10n,
    tickUpper: 10n,
  } as MintEvent;
  return event;
};

export const getMockMintEventOutsideCurrentTick = () => {
  const event = {
    address: Address.parse('EQC-aFP0rJXwTgKZQJPbPfTSpBFc8wxOgKHWD9cPvOl_DnaY'),
    block: {
      timestamp: 1740671544,
      id: {
        fileHash: Buffer.from(
          '3138a79c5be7f099c44dd4bc6adbabf48d2a227ea9c41ef9b11677123f7b78aa',
          'hex',
        ),
        kind: 'tonNode.blockIdExt',
        rootHash: Buffer.from(
          '5664b4edc8d57a8578f3613132129ec5ddf006ab64f0197256c0bf2c78bd7a48',
          'hex',
        ),
        seqno: 50051188,
        shard: 'e000000000000000',
        workchain: 0,
      },
    },
    transaction: {
      from: Address.parse('UQDIfz58KSx9PFo10uS_3HJSJ_leYsIicIjMGO3d94peClZX'),
      to: Address.parse('EQC-aFP0rJXwTgKZQJPbPfTSpBFc8wxOgKHWD9cPvOl_DnaY'),
      hash: '43902193a7065bda7089b1a74562df2fa9b4162368ef0412762a0d8135598f51',
    },
    amount: 14000000n,
    amount0: 3000000n,
    amount1: 50000000n,
    sender: Address.parse('EQBDYpOew7_senlP8SzANhgeqOqGts0AySHQQ6UCQbO2NO6u'),
    owner: Address.parse('EQBDYpOew7_senlP8SzANhgeqOqGts0AySHQQ6UCQbO2NO6u'),
    tickLower: 1n,
    tickUpper: 10n,
  } as MintEvent;
  return event;
};
