import { TonClient } from '@ton/ton';
import env from '@src/configs/env';

class TonClientService {
  static instance: TonClient;

  static init(): TonClient {
    if (TonClientService.instance) {
      return TonClientService.instance;
    }
    const client = new TonClient({
      endpoint: env.tonCenter.url,
      apiKey: env.tonCenter.apiKey,
    });
    TonClientService.instance = client;
    return TonClientService.instance;
  }
}

export const tonClient = TonClientService.init();
