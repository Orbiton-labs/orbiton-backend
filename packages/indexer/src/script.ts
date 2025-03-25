import { Address } from '@ton/core';
import { Database, DatabaseMode, db } from './db';
import { getOrLoadJetton } from './mappings/utils/jetton';
import { LiteClientService } from './services/ton-lite-client';
import * as schema from '../src/models';
import { eq } from 'drizzle-orm';
import { objectWithoutId } from './mappings/common';

const main = async () => {
  Database.init(DatabaseMode.NORMAL);
  // const jettonAddresses = [
  //   'kQCF8jfV05w00abPcvsW64XNanQ9vateIhCLSkNAQ7Qfo14c',
  //   'kQCqaCb9S8wqYjPT1d18Z0f-HemRnEDm4heFyNfPKMESADNa',
  //   'kQBMX7QVmqvs5Gtx5_eSGm1FF88YPTOou1yKEz8CRX8QTNP0',
  //   'kQBXJHKfXkPHxs8Ex9yy8gu6DWm9_FgoPCMJfx-tZlDIm0tu',
  // ].map((item) => Address.parse(item));
  // for (const jettonAddress of jettonAddresses) {
  //   await getOrLoadJetton(jettonAddress);
  // }
  const jetton = await db.query.jetton.findFirst({
    where: (jetton, { eq }) => eq(jetton.id, 'EQCqaCb9S8wqYjPT1d18Z0f-HemRnEDm4heFyNfPKMESAIjQ'),
  });
  jetton.image = 'https://pbs.twimg.com/profile_images/1900284998013374464/ZHYwqELr_400x400.jpg';
  await db
    .update(schema.jetton)
    .set(objectWithoutId(jetton))
    .where(eq(schema.jetton.id, jetton.id));
};

main();
