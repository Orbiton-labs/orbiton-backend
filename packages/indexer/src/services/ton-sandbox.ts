import { Address, beginCell, Dictionary, TonClient4, Cell } from '@ton/ton';
import env from '@src/configs/env';
import { Blockchain, RemoteBlockchainStorage, wrapTonClient4ForRemote } from '@ton/sandbox';
import { getHttpV4Endpoint, Network } from '@orbs-network/ton-access';
import { db } from '@src/db';
import { JettonMinterWrapper, PoolWrapper, RouterWrapper } from '@orbiton_labs/v3-contracts-sdk';
import { Jetton, Pool } from '@src/models';
import { LiteClient } from '@orbiton_labs/ton-lite-client';
import { HARDCODE_LIBS } from '@src/constants';

const getCodeContract = async (blockchain: Blockchain, address: Address) => {
  const contract = await blockchain.getContract(address);
  if (contract.accountState.type === 'uninit' || contract.accountState.type === 'frozen') {
    throw new Error(`Contract ${address.toString()} is not initialized or frozen`);
  }
  return contract.accountState.state.code;
};

export class TonSandboxBlockchainService {
  static instance: Blockchain;

  static async init(liteClient: LiteClient) {
    let blockchain = await Blockchain.create({
      storage: new RemoteBlockchainStorage(
        wrapTonClient4ForRemote(
          new TonClient4({
            endpoint: await getHttpV4Endpoint({
              network: env.server.network as Network,
            }),
          }),
        ),
      ),
    });
    const libResults = await liteClient.getLibraries(
      HARDCODE_LIBS.map((lib) => Buffer.from(lib, 'hex')),
    );
    const _libs = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
    for (const libResult of libResults.result) {
      _libs.set(BigInt(`0x${libResult.hash.toString('hex')}`), Cell.fromBoc(libResult.data)[0]);
    }
    blockchain.libs = beginCell().storeDictDirect(_libs).endCell();

    //@ts-ignore
    const pools = (await db.query.pool.findMany()) as Pool[];
    await Promise.all(
      pools.map(async (pool) => {
        const poolContract = blockchain.openContract(
          PoolWrapper.Pool.createFromAddress(Address.parse(pool.id)),
        );
        const poolCode = await getCodeContract(blockchain, poolContract.address);
        _libs.set(BigInt(`0x${poolCode.hash().toString('hex')}`), poolCode);
      }),
    );

    const jettons = (await db.query.jetton.findMany()) as Jetton[];
    await Promise.all(
      jettons.map(async (jetton) => {
        let jettonContract = blockchain.openContract(
          JettonMinterWrapper.JettonMinter.createFromAddress(Address.parse(jetton.id)),
        );
        const jettonCode = await getCodeContract(blockchain, jettonContract.address);
        _libs.set(BigInt(`0x${jettonCode.hash().toString('hex')}`), jettonCode);
        blockchain.libs = beginCell().storeDictDirect(_libs).endCell();

        jettonContract = blockchain.openContract(
          JettonMinterWrapper.JettonMinter.createFromAddress(Address.parse(jetton.id)),
        );
        const jettonWalletAddress = await jettonContract.getWalletAddress(
          Address.parse(env.indexer.routerAddress),
        );
        const jettonWalletCode = await getCodeContract(blockchain, jettonWalletAddress);
        _libs.set(BigInt(`0x${jettonWalletCode.hash().toString('hex')}`), jettonWalletCode);
      }),
    );
    blockchain.libs = beginCell().storeDictDirect(_libs).endCell();
    const libs = beginCell().storeDictDirect(_libs).endCell();
    blockchain.libs = libs;
    TonSandboxBlockchainService.instance = blockchain;
  }
}

export const syncTonSandbox = async (liteClient: LiteClient) => {
  while (true) {
    await TonSandboxBlockchainService.init(liteClient);
    await new Promise((resolve) => setTimeout(resolve, 30000));
  }
};
