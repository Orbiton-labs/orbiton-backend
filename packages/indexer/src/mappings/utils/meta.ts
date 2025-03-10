import { tonNode_blockIdExt } from '@orbiton_labs/ton-lite-client/dist/schema';
import * as schema from '../../models';
import { db } from '@src/db';

export const updateMeta = async (mcBlock: tonNode_blockIdExt) => {
  let meta = (await db.query.meta.findFirst({})) as schema.Meta | undefined;
  if (!meta) {
    await db.insert(schema.meta).values({
      seqno: mcBlock.seqno,
    });
    return;
  }
  meta.seqno = mcBlock.seqno;
  await db.update(schema.meta).set({
    seqno: mcBlock.seqno,
  });
};
