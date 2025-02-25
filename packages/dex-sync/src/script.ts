import { getTonPrice } from './mappings/utils/ton';

const main = async () => {
  const tonPriceUSD = await getTonPrice();
  console.log({ tonPriceUSD });
};
main();
