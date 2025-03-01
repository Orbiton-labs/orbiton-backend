import { getTonPrice } from './mappings/utils/ton';
import BigDecimal from 'js-big-decimal';

const main = async () => {
  // const tonPriceUSD = await getTonPrice();
  // console.log({ tonPriceUSD });
  console.log(new BigDecimal('1').compareTo(new BigDecimal('1')));
};
main();
