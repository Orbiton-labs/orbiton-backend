import {
  JettonMinterWrapper,
  JettonWalletWrapper,
  RouterWrapper,
} from '@orbiton_labs/v3-contracts-sdk';
import { tonClient } from './services/ton-client';
import { Address, beginCell } from '@ton/core';
import { LiteClientService } from './services/ton-lite-client';

const main = async () => {
  // console.time('ok');
  // const liteClient = await LiteClientService.init();
  // const data = await liteClient.getFullBlock(28949647);
  // const shards = data.shards;
  // shards.forEach((shard) => {
  //   console.log(shard);
  // });
  // console.timeEnd('ok');
  const jetton0Contract = tonClient.open(
    JettonMinterWrapper.JettonMinter.createFromAddress(
      Address.parse('kQCF8jfV05w00abPcvsW64XNanQ9vateIhCLSkNAQ7Qfo14c'),
    ),
  );
  const jetton1Contract = tonClient.open(
    JettonMinterWrapper.JettonMinter.createFromAddress(
      Address.parse('kQCqaCb9S8wqYjPT1d18Z0f-HemRnEDm4heFyNfPKMESADNa'),
    ),
  );
  const routerAddress = Address.parse('EQDr9E1JNjD5GFRsHGVdHdeZ4Yo17NeVxaUfhLaHPl74iOxP');
  const router0Wallet = await jetton0Contract.getWalletAddress(routerAddress);
  const router1Wallet = await jetton1Contract.getWalletAddress(routerAddress);
  console.log(router0Wallet, router1Wallet);
  const router0WalletHash = BigInt(
    '0x' + beginCell().storeAddress(router0Wallet).endCell().hash().toString('hex'),
  );
  const router1WalletHash = BigInt(
    '0x' + beginCell().storeAddress(router1Wallet).endCell().hash().toString('hex'),
  );
  const routerContract = tonClient.open(
    RouterWrapper.Router.createFromAddress(
      Address.parse('EQDr9E1JNjD5GFRsHGVdHdeZ4Yo17NeVxaUfhLaHPl74iOxP'),
    ),
  );
  const address =
    router0WalletHash < router1WalletHash
      ? await routerContract.getPoolAddress(router0Wallet, router1Wallet, 3000n, 60n)
      : await routerContract.getPoolAddress(router1Wallet, router0Wallet, 3000n, 60n);
  console.log(address);
};

main();
