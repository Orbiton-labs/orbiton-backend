import { Address, beginCell } from '@ton/core';

export const sortAddress = (address1: Address, address2: Address) => {
  const hashAddr1 = BigInt(
    '0x' + beginCell().storeAddress(address1).endCell().hash().toString('hex'),
  );
  const hashAddr2 = BigInt(
    '0x' + beginCell().storeAddress(address2).endCell().hash().toString('hex'),
  );
  return hashAddr1 < hashAddr2 ? [address1, address2] : [address2, address1];
};
