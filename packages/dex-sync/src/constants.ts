import { crc32 } from '@utils/crc32.util';

export const ZERO_BI = BigInt(0);
export const ZERO_BD = '0';
export const ONE_BD = '1';
export const ZERO_ADDRESS = 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';
export const OpCallbackCreatePool = crc32('op::cb_create_pool');
export const OpMintPosition = crc32('op::mint_position');
export const OP_CODES = [OpCallbackCreatePool, OpMintPosition];

export function intToIP(int: number) {
  const part1 = int & 255;
  const part2 = (int >> 8) & 255;
  const part3 = (int >> 16) & 255;
  const part4 = (int >> 24) & 255;

  return part4 + '.' + part3 + '.' + part2 + '.' + part1;
}
