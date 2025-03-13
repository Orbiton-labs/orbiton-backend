import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import http from 'http';
import morgan from './configs/morgan';
import env from './configs/env';
import BlockScanner from '@services/block-scanner';
import BlockTransactionHandler from '@services/block-handler';
import { LiteClientService } from './services/ton-lite-client';
import { buildSchema } from 'drizzle-graphql';
import { Database, DatabaseMode, db } from './db';
import { createYoga } from 'graphql-yoga';
import { Meta } from './models';
import { tonNode_blockIdExt } from '@orbiton_labs/ton-lite-client/dist/schema';
import { updateMeta } from './mappings/utils/meta';
import { EventEmitter } from 'events';

// Set max listeners to avoid memory leak warning
Database.init(DatabaseMode.NORMAL);
const app = express();
const bootstrapServer = async () => {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'style-src': ["'self'", 'unpkg.com'],
          'script-src': ["'self'", 'unpkg.com', "'unsafe-inline'"],
          'img-src': ["'self'", 'raw.githubusercontent.com'],
        },
      },
    }),
  );
  app.use(
    cors({
      origin: '*',
    }),
  );
  app.use(express.json());

  // Configure compression with proper cleanup
  app.use(compression({}));

  app.use((err: any, req: any, res: any, next: any) => {
    const status = err.status || 500;
    const message = err.message || 'Something went wrong';
    return res.status(status).json({
      status,
      message,
      success: false,
      stack: env.server.env == 'development' ? err.stack : null,
    });
  });

  const { schema } = buildSchema(db, {
    mutations: false,
    relationsDepthLimit: 2,
  });
  const yoga = createYoga({ schema });
  app.use(yoga.graphqlEndpoint, yoga);

  app.use((err: any, req: any, res: any, next: any) => {
    const status = err.status || 500;
    const message = err.message || 'Something went wrong';
    return res.status(status).json({
      status,
      message,
      success: false,
      stack: env.server.env == 'development' ? err.stack : null,
    });
  });

  const server = http.createServer(app);
  const PORT = env.server.port;
  server.listen(PORT, async () => {
    const liteClient = await LiteClientService.init();
    const blockHandler = new BlockTransactionHandler(liteClient);
    const blockScanner = new BlockScanner(liteClient, blockHandler);
    const meta = (await db.query.meta.findFirst({})) as Meta | undefined;
    blockScanner.on('mc_block', async (data: tonNode_blockIdExt) => {
      console.log('seqno:', data.seqno);
      await updateMeta(data);
    });
    await blockScanner.run(meta?.seqno);
  });
};

bootstrapServer();
