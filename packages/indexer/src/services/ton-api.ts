import { TonApiClient } from '@ton-api/client';
import env from '@src/configs/env';

class TonApiService {
  static instance: TonApiClient;

  static init(): TonApiClient {
    if (TonApiService.instance) {
      return TonApiService.instance;
    }
    const client = new TonApiClient({
      baseUrl: `https://${env.server.network === 'mainnet' ? '' : 'testnet.'}tonapi.io`,
      apiKey: env.tonApi.apiKey,
    });
    TonApiService.instance = client;
    return TonApiService.instance;
  }
}

export const tonApiClient = TonApiService.init();
