import { z } from 'zod';
import dotenv from 'dotenv';

console.log(Bun?.env?.BUN_ENV === 'testing');
dotenv.config({
  path: Bun?.env?.BUN_ENV === 'testing' ? '.env.test' : '.env',
});

const envSchema = z
  .object({
    NODE_ENV: z.string({
      required_error: 'NODE_ENV is required',
    }),
    NETWORK: z.string().default('mainnet'),
    PORT: z.coerce.number().default(8000),
    DATABASE_URL: z.string({
      required_error: 'DATABASE_URL is required',
    }),
    TON_CENTER_URL: z.string({
      required_error: 'TON_CENTER_URL is required',
    }),
    TON_CENTER_API_KEY: z.string({
      required_error: 'TON_CENTER_API_KEY is required',
    }),
    TON_API_KEY: z.string({
      required_error: 'TON_API_KEY is required',
    }),
    ROUTER_ADDRESS: z.string({
      required_error: 'ROUTER_ADDRESS is required',
    }),
  })
  .passthrough();

const envVars = envSchema.parse(process.env);
export default {
  server: {
    env: envVars.NODE_ENV,
    network: envVars.NETWORK,
    port: envVars.PORT,
    pgUrl: envVars.DATABASE_URL,
  },
  tonCenter: {
    url: envVars.TON_CENTER_URL,
    apiKey: envVars.TON_CENTER_API_KEY,
  },
  tonApi: {
    apiKey: envVars.TON_API_KEY,
  },
  indexer: {
    routerAddress: envVars.ROUTER_ADDRESS,
  },
};
