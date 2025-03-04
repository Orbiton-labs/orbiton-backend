import { tonApiClient } from './services/ton-api';
import { snakeToCamel } from './constants';
import BigDecimal from 'js-big-decimal';

function formatNumber(value: string): string {
  return value.replace(/\.0+$|(\.\d*[1-9])0+$/, '$1');
}

const main = async () => {
  // const tokenId = snakeToCamel('EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1O-8QUA3728');
  // const rateData = await tonApiClient.rates.getRates({
  //   tokens: ['EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1O-8QUA3728'],
  //   currencies: ['TON'],
  // });
  // const tonRate = rateData.rates?.[tokenId];
  // const jettonPricePerTon = tonRate.prices['TON'];
  // console.log(jettonPricePerTon.toFixed(3));

  console.log(new BigDecimal('100.01'));
  console.log(new BigDecimal(100).compareTo(new BigDecimal('100.0')));
};
main();
