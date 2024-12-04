import { Cell, address, loadTransaction } from "@ton/core";
import { LiteClient } from "ton-lite-client";
import { setTimeout } from "timers/promises";
import { Logger } from "winston";
import { tonNode_blockIdExt } from "ton-lite-client/dist/schema";
import { Transaction } from "@ton/core";
import { BlockID } from "ton-lite-client";
import PoolRepository from "../../apis/repositories/pool.repository";
import PositionRepository from "../../apis/repositories/position.repository";
import ProcessedTransactionRepository from "../../apis/repositories/processed_transaction.repository";

export type StringHex = string;
export type TransactionWithBlockId = {
  tx: Transaction;
  blockId: BlockID;
};

export default class TonTxProcessor {
  private limitPerTxQuery = 100;
  private mapLatestProcessedHashOnContract: { [key: string]: StringHex } = {};
  private initiallatestProcessedTxHashOnContract: { [key: string]: StringHex } =
    {};

  constructor(
    protected readonly liteClient: LiteClient,
    protected logger: Logger,
    protected watchContracts: string[],
    protected latestProcessedTxHash: StringHex[],
    protected routerContract: string
  ) {
    this.sync(watchContracts, latestProcessedTxHash);
  }

  private sync(watchContracts: string[], latestProcessedTxHash: string[]) {
    for (let i = 0; i < watchContracts.length; i++) {
      this.mapLatestProcessedHashOnContract[watchContracts[i]] =
        latestProcessedTxHash[i];
      this.initiallatestProcessedTxHashOnContract[watchContracts[i]] =
        latestProcessedTxHash[i];
    }
  }

  private async queryUnprocessedTransactions(
    masterchainInfo: tonNode_blockIdExt
  ) {
    let results: { [key: string]: TransactionWithBlockId[] } = {};
    for (const watchContract of this.watchContracts) {
      const transactions: TransactionWithBlockId[] = [];
      const contractAddr = address(watchContract);
      const accState = await this.liteClient.getAccountState(
        contractAddr,
        masterchainInfo
      );
      let offset = {
        hash: accState.lastTx.hash.toString(16),
        lt: accState.lastTx.lt.toString(10),
      };
      const latestProcessedTxHash =
        this.mapLatestProcessedHashOnContract[watchContract];
      this.logger.info("latest processed tx hash: " + latestProcessedTxHash);
      if (latestProcessedTxHash === offset.hash) return [];
      while (true) {
        this.logger.info("Current processing tx hash: " + offset.hash);
        // workaround. Bug of loadTransaction that causes the prev trans hash to be incomplete
        if (offset.hash.length < 64) {
          this.logger.error(
            "TonTxProcessor queryUnprocessedTransactions offset hash length < 64: " +
              offset.hash
          );
          while (offset.hash.length < 64) {
            offset.hash = "0" + offset.hash;
          }
          this.logger.error(
            "TonTxProcessor queryUnprocessedTransactions new offset hash: " +
              offset.hash
          );
        }
        const rawTxs = await this.liteClient.getAccountTransactions(
          contractAddr,
          offset.lt,
          Buffer.from(offset.hash, "hex"),
          this.limitPerTxQuery
        );
        const txs = Cell.fromBoc(rawTxs.transactions).map((cell, i) => ({
          tx: loadTransaction(cell.asSlice()),
          blockId: rawTxs.ids[i],
        }));

        if (!latestProcessedTxHash) {
          transactions.push(...txs);
          // if (transactions.length > 0)
          //   this.mapLatestProcessedHashOnContract[watchContract] =
          //     transactions[0].tx.hash().toString("hex");
          break;
        }

        const indexOf = txs.findIndex(
          (tx) => tx.tx.hash().toString("hex") === latestProcessedTxHash
        );
        if (indexOf === -1) {
          const oldestTx = txs[txs.length - 1].tx;
          if (!oldestTx.prevTransactionHash) {
            this.logger.error(
              "TonTxProcessor queryUnprocessedTransactions new offset hash is undefined"
            );
            continue;
          }
          transactions.push(...txs);
          // increase offset and continue querying txs until we find our oldest transaction that we can remember
          offset = {
            hash: oldestTx.prevTransactionHash.toString(16),
            lt: oldestTx.prevTransactionLt.toString(10),
          };
          await setTimeout(2000);
          continue;
        } else {
          // only push more txs if the latest is not the first index to avoid redundancy
          if (indexOf > 0) transactions.push(...txs.slice(0, indexOf));
          if (transactions.length > 0)
            this.mapLatestProcessedHashOnContract[watchContract] =
              transactions[0].tx.hash().toString("hex");
          break;
        }
      }
      results[watchContract] = transactions;
    }
    return results;
  }

  async processTransactions(masterchainInfo: tonNode_blockIdExt) {
    const results = await this.queryUnprocessedTransactions(masterchainInfo);

    for (const watchContract of this.watchContracts) {
      try {
        const transactions = results[watchContract] ?? [];
        this.logger.info(
          "TonTxProcessor:unprocessed transactions: " + transactions.length
        );
        // since we query our transactions from latest to earliest -> process the latest txs first
        let i = 0;
        for (const tx of transactions) {
          await this.processTransaction(tx, watchContract);
          i++;
        }
      } catch (error) {
        console.log(error);
        // reset latestProcessedTxHash so we can start over to prevent missed txs in case of having errors
        this.logger.error(
          "TonTxProcessor:Error querying unprocessed transactions: ",
          error
        );
        this.mapLatestProcessedHashOnContract[watchContract] =
          this.initiallatestProcessedTxHashOnContract[watchContract];
        return;
      }
    }
  }

  async processTransaction(tx: TransactionWithBlockId, watchContract: string) {
    // TODO: process transaction here
    const transaction = tx.tx;
    const messages = transaction.outMessages.values();
    for (let i = 0; i < messages.length; i++) {
      const processedTx = await ProcessedTransactionRepository.get(
        transaction.hash().toString("hex"),
        i
      );
      if (processedTx) {
        this.logger.info(
          `Already processed tx: ${transaction.hash().toString("hex")} message index: ${i}`
        );
        continue;
      }
      const message = messages[i];
      if (message.info.src.toString() !== watchContract) {
        continue;
      }
      const cellSlice = message.body.beginParse();

      let exist = false;
      switch (watchContract) {
        case this.routerContract:
          // sync pool
          if (message.info.type === "external-out") {
            let poolAddress = cellSlice.loadAddress();
            let jetton0Address = cellSlice.loadAddress();
            let jetton1Address = cellSlice.loadAddress();
            let fee = cellSlice.loadUint(24);
            let tickSpacing = cellSlice.loadInt(24);
            this.watchContracts = [
              ...this.watchContracts,
              poolAddress.toString(),
            ];
            console.log(this.mapLatestProcessedHashOnContract);
            this.sync(
              this.watchContracts,
              Object.keys(this.mapLatestProcessedHashOnContract).map(
                (key) => this.mapLatestProcessedHashOnContract?.[key] || ""
              )
            );
            await PoolRepository.create({
              poolAddress: poolAddress.toString(),
              jetton0WalletAddress: jetton0Address.toString(),
              jetton1WalletAddress: jetton1Address.toString(),
              fee: Number(fee.toString()),
              tickSpacing: Number(tickSpacing.toString()),
            });
            exist = true;
          }
          break;
        default:
          if (message.info.type == "external-out") {
            let positionAddress = cellSlice.loadAddress();
            let firstRef = cellSlice.loadRef().beginParse();
            let tickLower = firstRef.loadInt(24);
            let tickUpper = firstRef.loadInt(24);
            let liquidity = firstRef.loadUint(128);
            let feeGrowthInside0LastX128 = firstRef.loadUint(256);
            let feeGrowthInside1LastX128 = firstRef.loadUint(256);
            let secondRef = cellSlice.loadRef().beginParse();
            let tokenOwed0 = secondRef.loadUint(128);
            let tokenOwed1 = secondRef.loadUint(128);
            let ownerAddress = secondRef.loadAddress();
            const poolData =
              await PoolRepository.getByPoolAddress(watchContract);
            await PositionRepository.create({
              poolId: poolData._id.toString(),
              positionAddress: positionAddress.toString(),
              tickLower: Number(tickLower.toString()),
              tickUpper: Number(tickUpper.toString()),
              liquidity: liquidity.toString(),
              feeGrowthInside0LastX128: feeGrowthInside0LastX128.toString(),
              feeGrowthInside1LastX128: feeGrowthInside1LastX128.toString(),
              tokenOwed0: tokenOwed0.toString(),
              tokenOwed1: tokenOwed1.toString(),
              ownerAddress: ownerAddress.toString(),
            });
            exist = true;
          }
          break;
      }
      if (exist) {
        await ProcessedTransactionRepository.create({
          transactionHash: transaction.hash().toString("hex"),
          messageIndex: i,
        });
      }
    }
  }
}
