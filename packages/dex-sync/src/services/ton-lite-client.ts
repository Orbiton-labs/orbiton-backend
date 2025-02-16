import {
  LiteClient,
  LiteEngine,
  LiteRoundRobinEngine,
  LiteSingleEngine,
} from '@orbiton/ton-lite-client';
import { intToIP } from '@src/constants';
import env from '@src/configs/env';

export class LiteClientService {
  static instance: LiteClient;

  static async init(): Promise<LiteClient> {
    const { liteservers } = await fetch(
      `https://ton.org/${env.server.network == 'mainnet' ? '' : 'testnet-'}global.config.json`,
    ).then((data) => data.json());
    const engines: LiteEngine[] = [];
    engines.push(
      ...liteservers.map(
        (server: any) =>
          new LiteSingleEngine({
            host: `tcp://${intToIP(server.ip)}:${server.port}`,
            publicKey: Buffer.from(server.id.key, 'base64'),
          }),
      ),
    );
    const liteEngine = new LiteRoundRobinEngine(engines);
    const liteClient = new LiteClient({ engine: liteEngine });
    LiteClientService.instance = liteClient;
    return LiteClientService.instance;
  }
}
