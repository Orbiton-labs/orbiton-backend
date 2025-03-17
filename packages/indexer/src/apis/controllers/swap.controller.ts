import { Request, Response } from 'express';
import { SwapDto } from '../dtos/swap.dto';
import { db } from '@src/db';
import * as schema from '@src/models';
import { and, eq, or } from 'drizzle-orm';
import env from '@src/configs/env';
import { Address, beginCell, Dictionary, toNano } from '@ton/core';
import {
  JettonMinterWrapper,
  JettonWalletWrapper,
  PoolWrapper,
  PTonMinterWrapper,
  PTonWalletWrapper,
} from '@orbiton_labs/v3-contracts-sdk';
import { MAX_SQRT_RATIO, MIN_SQRT_RATIO } from '@src/constants';
import { encodeResponseObject } from '@src/utils/object';
import { TonSandboxBlockchainService } from '@src/services/ton-sandbox';
import { storeSwapParams, SwapParams } from '@orbiton_labs/v3-contracts-sdk/build/tlbs/jetton';
import { printTransactionFees } from '@ton/sandbox';

// TODO: use swap sdk instead of use ton-sandbox to avoiding cache & enhancing performance
export const simulateSwap = async (req: Request, res: Response) => {
  const { offerJettonAddress, askJettonAddress, offerAmount, senderAddress } = req.query as SwapDto;
  const pools = await db.query.pool.findMany({
    where: or(
      and(
        eq(schema.pool.jetton0Id, Address.parse(offerJettonAddress).toString()),
        eq(schema.pool.jetton1Id, Address.parse(askJettonAddress).toString()),
      ),
      and(
        eq(schema.pool.jetton0Id, Address.parse(askJettonAddress).toString()),
        eq(schema.pool.jetton1Id, Address.parse(offerJettonAddress).toString()),
      ),
    ),
  });
  if (pools.length === 0) {
    res.status(404).json({
      error: 'There is no pool for this swap',
    });
    return;
  }
  if (BigInt(offerAmount) <= 0n) {
    res.status(400).json({
      error: 'Offer amount must be greater than 0',
    });
    return;
  }

  const sender = Address.parse(senderAddress);
  let blockchain = TonSandboxBlockchainService.instance;
  const senderContract = blockchain.getContract(sender);
  let senderSigner = blockchain.sender(sender);

  // <BEGIN> SET UP
  const offerJettonMasterContract = blockchain.openContract(
    JettonMinterWrapper.JettonMinter.createFromAddress(Address.parse(offerJettonAddress)),
  );
  const askJettonMasterContract = blockchain.openContract(
    JettonMinterWrapper.JettonMinter.createFromAddress(Address.parse(askJettonAddress)),
  );
  const [offerUserJettonWalletAddress, askUserJettonWalletAddress] = await Promise.all([
    offerJettonMasterContract.getWalletAddress(sender),
    askJettonMasterContract.getWalletAddress(sender),
  ]);
  const offerJettonWalletContract = blockchain.openContract(
    JettonWalletWrapper.JettonWallet.createFromAddress(offerUserJettonWalletAddress),
  );
  const askJettonWalletContract = blockchain.openContract(
    JettonWalletWrapper.JettonWallet.createFromAddress(askUserJettonWalletAddress),
  );
  const askRouterJettonWalletAddress = await askJettonMasterContract.getWalletAddress(
    Address.parse(env.indexer.routerAddress),
  );
  // <END> SET UP

  let returnAmount = 0n;
  let paths = [];
  for (const pool of pools) {
    const zeroForOne = pool.jetton0Id === offerJettonAddress && pool.jetton1Id === askJettonAddress;
    const isPton = offerJettonAddress === env.indexer.ptonAddress;
    let userAskBeforeBalance = 0n;
    if (askJettonAddress === env.indexer.ptonAddress) {
      userAskBeforeBalance = (await blockchain.getContract(sender)).balance;
    } else {
      userAskBeforeBalance = (await askJettonWalletContract.getWalletData()).balance;
    }
    const swapParams = {
      kind: 'SwapParams',
      forward_opcode: PoolWrapper.Opcodes.Swap,
      fee: Number(pool.feeTier),
      jetton1_wallet: askRouterJettonWalletAddress,
      sqrt_price_limit: zeroForOne ? MIN_SQRT_RATIO + 1n : MAX_SQRT_RATIO - 1n,
      tick_spacing: Number(pool.tickSpacing),
      zero_for_one: zeroForOne ? -1 : 0,
    };
    if (isPton) {
      const pTonMinterContract = blockchain.openContract(
        PTonMinterWrapper.PTonMinterV2.createFromAddress(Address.parse(offerJettonAddress)),
      );
      const pTonMinterWalletAddress = await pTonMinterContract.getWalletAddress(
        Address.parse(env.indexer.routerAddress),
      );
      const pTonWalletContract = blockchain.openContract(
        PTonWalletWrapper.PTonWalletV2.createFromAddress(pTonMinterWalletAddress),
      );
      console.log({ pTonMinterWalletAddress });
      const swapCell = beginCell();
      storeSwapParams(swapParams as SwapParams)(swapCell);
      const tx = await pTonWalletContract.sendTonTransfer(senderSigner, {
        tonAmount: BigInt(offerAmount),
        refundAddress: sender,
        fwdPayload: swapCell.endCell(),
        gas: BigInt(offerAmount),
      });
      printTransactionFees(tx.transactions);
    } else {
      await offerJettonWalletContract.sendTransferSwap(
        senderSigner,
        {
          kind: 'OpJettonTransferSwap',
          query_id: 0,
          jetton_amount: BigInt(offerAmount),
          to_address: Address.parse(env.indexer.routerAddress),
          response_address: sender,
          custom_payload: beginCell().storeDict(Dictionary.empty()).endCell(),
          forward_ton_amount: toNano(0.8),
          either_payload: true,
          swap: swapParams as SwapParams,
        },
        {
          value: toNano(1.2),
        },
      );
    }
    let userAskAfterBalance = 0n;
    if (askJettonAddress === env.indexer.ptonAddress) {
      userAskAfterBalance = (await blockchain.getContract(sender)).balance;
    } else {
      userAskAfterBalance = (await askJettonWalletContract.getWalletData()).balance;
    }
    const simulateReturnAmount = userAskAfterBalance - userAskBeforeBalance;
    if (simulateReturnAmount > returnAmount) {
      returnAmount = simulateReturnAmount;
      paths = [pool].map((item) => encodeResponseObject(item));
    }
  }
  res.status(200).json({
    data: {
      returnAmount: returnAmount.toString(),
      paths,
    },
  });
  return;
};
