import { JettonWalletWrapper } from '@orbiton_labs/v3-contracts-sdk';
import { tonClient } from './services/ton-client';
import { Address } from '@ton/core';
import { LiteClientService } from './services/ton-lite-client';

const main = async () => {
  console.time('ok');
  const liteClient = await LiteClientService.init();
  const data = await liteClient.getFullBlock(28949647);
  const shards = data.shards;
  shards.forEach((shard) => {
    console.log(shard);
  });
  console.timeEnd('ok');
};

main();
