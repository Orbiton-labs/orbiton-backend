import { tonNode_blockIdExt } from "@orbiton/ton-lite-client/dist/schema";

abstract class BaseBlockHandler {
  abstract execBlock(block: tonNode_blockIdExt): Promise<void>;
}

export default BaseBlockHandler;
