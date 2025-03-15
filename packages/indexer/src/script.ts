import { Address } from '@ton/core';
import env from './configs/env';
import { Database, DatabaseMode } from './db';
import { getOrLoadJetton } from './mappings/utils/jetton';

const main = async () => {
  Database.init(DatabaseMode.NORMAL);
  const jettonAddresses = [
    'kQCF8jfV05w00abPcvsW64XNanQ9vateIhCLSkNAQ7Qfo14c',
    'kQCqaCb9S8wqYjPT1d18Z0f-HemRnEDm4heFyNfPKMESADNa',
    'kQBMX7QVmqvs5Gtx5_eSGm1FF88YPTOou1yKEz8CRX8QTNP0',
    'kQBXJHKfXkPHxs8Ex9yy8gu6DWm9_FgoPCMJfx-tZlDIm0tu',
  ].map((item) => Address.parse(item));
  for (const jettonAddress of jettonAddresses) {
    await getOrLoadJetton(jettonAddress);
  }
};

main();
