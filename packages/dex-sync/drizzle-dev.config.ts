import { defineConfig } from 'drizzle-kit';
import env from './src/configs/env';

export default defineConfig({
  schema: './src/models/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.server.pgUrl,
  },
});
