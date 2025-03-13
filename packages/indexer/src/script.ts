import {
  JettonMinterWrapper,
  JettonWalletWrapper,
  PoolWrapper,
  RouterWrapper,
} from '@orbiton_labs/v3-contracts-sdk';
import { tonClient } from './services/ton-client';
import { Address, beginCell, Cell } from '@ton/core';
import { LiteClientService } from './services/ton-lite-client';

const main = async () => {
  const pool = tonClient.open(
    PoolWrapper.Pool.createFromAddress(
      Address.parse('EQAOHbHlJDVheYtNHjpYrFiBblXG-42y5UHUy_QhQO4jNVQd'),
    ),
  );
  console.log(await pool.getPoolInfo());

  // const slice = Cell.fromBoc(
  //   Buffer.from(
  //     'b5ee9c7241021301000391000114ff00f4a413f4bcf2c80b0102016202030202cb04050011a19a99e003f089f08b0201ce06070015a180fd221880fd2218dd4004851b088831c02456f8007434c0c05c6c2456f83c007e900c0074c7f4cfc8a0843f99a9726eb8c088a084111925eb2eb8c088a0840cc54e92eeb8c080a0843226bbbe6ea008090a0b00693b51343500743485c07e187485c07e18b4dfc07e18f4ffc07e1934ffcc3e1975007434dfc07e19b4dfc07e19fe90007e1a3e1a746002ea32f8495003f013f2e3e8d27fd3ffd3ffd430f843f844f845f846f84710465513544888db3c04f86302f864f865f866f867f842f841c8f848cf16f848cf16ca17ca1712ca7fcc8210e672c96901c958830771800cc8cb03cb01cb0813cbff216e967032cb61cb3f96327158cb61cce2c970fb00db3c0d1201fe32f8485003f013f2e3e8d37f30f847f846f845f844f843c8cb7fcbffcbffcb7fcb7fc9f842f8418210bae7fba1c8cb1f15cb3f14ca1713ca175210cb7ff848cf1612cc8d045bdc0e8e989d5c9b97dc1bdcda5d1a5bdba0fe143001fe2030f843fe2030f844fe2030f845fe2030f846fe2030f847fe203070f84902c91280400c02da32f8495003f013f2e3e8d3ffd3ffd37fd430d0d2ffd2ff30f843f844f845f846f847104655135447a9db3c04f86302f864f865f866f86702a301a321c20021c200b19cf84622a0f866f84721a0f867def842f841c8f848cf16ca17ca1713cb7fcbffcbff8210b537c46501c9580d0e02f08f6ff8485003f013f2e3e8fa40d37fd37f30f8465220bc9331f8469101e2f8475220bc9331f8479101e221c20096f84622a1f866de20c20096f84721a1f867de01c8ca7fca7fc9f842f841821078f4b9d0c8cb1f15cb3f14ca1713ca17f848cf1601cf16cc70f84902c9128040db3cdb3ce05f03840ff2f011120208db3cdb3c1112038222c00098830c28c200f2f4278e845372db3ce25228a128837fdb3c5217a128837fdb3c03c300933710569136e224c20002c20012b1965123a003a0129133e210230f1010014c830771800cc8cb03cb01cb0813cbff216e967032cb61cb3f96327158cb61cce2c970fb00db3c12005e20c1009d81100201a35220a15203b9f2f49b2181100302a05203bef2f4e281100221c2fff2f481100321847fbbf2f40006a98c30002c718018c8cb055004cf165004fa0212cb6accc901fb00005cf847f846c8cb7fcb7ff848cf16f849cf16c9f845f844f843f842f841c8ca17ca17cb7fcbffcbffc9c8ccccc9ed54d4d406d8',
  //     'hex',
  //   ),
  // )[0].asSlice();
  // console.log(slice.remainingBits, slice.remainingRefs);
  // console.time('ok');
  // const liteClient = await LiteClientService.init();
  // const data = await liteClient.getFullBlock(28949647);
  // const shards = data.shards;
  // shards.forEach((shard) => {
  //   console.log(shard);
  // });
  // console.timeEnd('ok');
  // const jetton0Contract = tonClient.open(
  //   JettonMinterWrapper.JettonMinter.createFromAddress(
  //     Address.parse('kQCF8jfV05w00abPcvsW64XNanQ9vateIhCLSkNAQ7Qfo14c'),
  //   ),
  // );
  // const jetton1Contract = tonClient.open(
  //   JettonMinterWrapper.JettonMinter.createFromAddress(
  //     Address.parse('kQCqaCb9S8wqYjPT1d18Z0f-HemRnEDm4heFyNfPKMESADNa'),
  //   ),
  // );
  // const routerAddress = Address.parse('EQDr9E1JNjD5GFRsHGVdHdeZ4Yo17NeVxaUfhLaHPl74iOxP');
  // const router0Wallet = await jetton0Contract.getWalletAddress(routerAddress);
  // const router1Wallet = await jetton1Contract.getWalletAddress(routerAddress);
  // console.log(router0Wallet, router1Wallet);
  // const router0WalletHash = BigInt(
  //   '0x' + beginCell().storeAddress(router0Wallet).endCell().hash().toString('hex'),
  // );
  // const router1WalletHash = BigInt(
  //   '0x' + beginCell().storeAddress(router1Wallet).endCell().hash().toString('hex'),
  // );
  // const routerContract = tonClient.open(
  //   RouterWrapper.Router.createFromAddress(
  //     Address.parse('EQDr9E1JNjD5GFRsHGVdHdeZ4Yo17NeVxaUfhLaHPl74iOxP'),
  //   ),
  // );
  // const address =
  //   router0WalletHash < router1WalletHash
  //     ? await routerContract.getPoolAddress(router0Wallet, router1Wallet, 3000n, 60n)
  //     : await routerContract.getPoolAddress(router1Wallet, router0Wallet, 3000n, 60n);
  // console.log(address);
};

main();
