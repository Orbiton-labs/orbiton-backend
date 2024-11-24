import PoolRepository from "../../apis/repositories/pool.repository";
import { Address } from "@ton/ton";
import { JettonWalletWrapper } from "orbiton-contracts";
import { setTimeout } from "timers/promises";
import { createTonWallet } from "../../utils";

export const syncJettonsMasterPool = async () => {
  let { client } = await createTonWallet();

  while (true) {
    const pools = await PoolRepository.getAll({});
    for (const pool of pools) {
      if (pool?.jetton0MasterAddress && pool?.jetton1MasterAddress) {
        continue;
      }
      let jetton0MasterAddress: string | undefined = undefined;
      let jetton1MasterAddress: string | undefined = undefined;

      try {
        if (!pool?.jetton0MasterAddress) {
          const jetton0Contract = client.open(
            JettonWalletWrapper.JettonWallet.createFromAddress(
              Address.parse(pool.jetton0WalletAddress)
            )
          );
          const jetton0Info = await jetton0Contract.getWalletData();
          jetton0MasterAddress = jetton0Info.jettonMasterAddress.toString();
        }
      } catch (err) {}

      try {
        if (!pool?.jetton1MasterAddress) {
          const jetton1Contract = client.open(
            JettonWalletWrapper.JettonWallet.createFromAddress(
              Address.parse(pool.jetton1WalletAddress)
            )
          );
          const jetton1Info = await jetton1Contract.getWalletData();
          jetton1MasterAddress = jetton1Info.jettonMasterAddress.toString();
        }
      } catch (err) {}

      await PoolRepository.update(pool.poolAddress, {
        ...pool.toJSON(),
        jetton0MasterAddress,
        jetton1MasterAddress,
      });
    }

    await setTimeout(5000);
  }
};
