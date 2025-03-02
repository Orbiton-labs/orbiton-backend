import { tonNode_blockIdExt } from '@orbiton_labs/ton-lite-client/dist/schema';

abstract class BaseBlockHandler {
  abstract execBlock(block: tonNode_blockIdExt): Promise<void>;
}

export default BaseBlockHandler;
