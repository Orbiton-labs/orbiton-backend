import {
  liteServer_TransactionId,
  tonNode_blockIdExt,
} from '@orbiton_labs/ton-lite-client/dist/schema';

abstract class BaseBlockHandler {
  abstract execBlock(
    block: tonNode_blockIdExt,
    transactions: liteServer_TransactionId[],
    blockTimestamp: number,
  ): Promise<void>;
}

export default BaseBlockHandler;
