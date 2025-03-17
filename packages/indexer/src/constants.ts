import { crc32 } from '@utils/crc32.util';
import env from '@src/configs/env';

export const ZERO_BI = BigInt(0);
export const ONE_BI = BigInt(1);
export const ZERO_BD = '0';
export const ONE_BD = '1';
export const TWO_BD = '2';
export const ZERO_ADDRESS = 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';
export const OpCallbackCreatePool = crc32('op::cb_create_pool');
export const OpMintPosition = crc32('op::mint_position');
export const OP_CODES = [OpCallbackCreatePool, OpMintPosition];
export const ONE_DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
export const MIN_SQRT_RATIO = 4295128739n;
export const MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342n;

export function intToIP(int: number) {
  const part1 = int & 255;
  const part2 = (int >> 8) & 255;
  const part3 = (int >> 16) & 255;
  const part4 = (int >> 24) & 255;

  return part4 + '.' + part3 + '.' + part2 + '.' + part1;
}

export function snakeToCamel(snakeCaseString: string) {
  return snakeCaseString.replace(/(_\w)/g, (match) => match[1]?.toUpperCase() ?? '');
}
