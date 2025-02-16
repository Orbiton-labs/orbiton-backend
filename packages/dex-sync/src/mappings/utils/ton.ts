import { ONE_BD, ZERO_ADDRESS } from '@src/constants';
import { Jetton } from '@src/models';
import { tonApiClient } from '@src/services/ton-api';
import { setTimeout } from 'timers/promises';

export const getTonPrice = async (): Promise<number> => {
  while (true) {
    try {
      const rateData = await tonApiClient.rates.getRates({
        tokens: ['TON'],
        currencies: ['TON', 'USDT'],
      });
      const tonRate = rateData.rates['TON'];
      const tonPrice = tonRate.prices['USDT'];
      return tonPrice;
    } catch (err) {}
    await setTimeout(500);
  }
};

// On this we will use off-chain data instead of on-chain for correct price
export const findTonPerJetton = async (jetton: Jetton): Promise<string> => {
  while (true) {
    try {
      if (jetton.address === ZERO_ADDRESS) {
        return ONE_BD;
      }

      const rateData = await tonApiClient.rates.getRates({
        tokens: [jetton.address],
        currencies: ['TON'],
      });
      const tonRate = rateData.rates[jetton.address];
      const jettonPricePerTon = tonRate.prices['TON'];
      return jettonPricePerTon.toString();
    } catch (err) {}
    await setTimeout(500);
  }
};
