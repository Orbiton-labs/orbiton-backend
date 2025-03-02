import dotenv from 'dotenv';
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

dotenv.config();

const app = express();
const server = http.createServer(app);
app.use(morgan.successHandler);
app.use(morgan.errorHandler);
app.use(helmet());
app.use(
  cors({
    origin: '*',
  }),
);
app.use(express.json());
app.use(compression());
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

const PORT = env.server.port;
server.listen(PORT, async () => {
  // setup lite engine server
  const liteClient = await LiteClientService.init();
  const blockHandler = new BlockTransactionHandler(liteClient);
  const blockScanner = new BlockScanner(liteClient, blockHandler);
  await blockScanner.run(45447770);
});
