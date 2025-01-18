import {
  LiteClient,
  LiteEngine,
  LiteRoundRobinEngine,
  LiteSingleEngine,
} from "ton-lite-client";
import dotenv from "dotenv";
import { intToIP } from "./constants";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import http from "http";
import xss from "xss-clean";
import morgan from "./configs/morgan";
import env from "./configs/env";
import "./configs/db";
import poolRoute from "./apis/routes/pool.route";
import positionRoute from "./apis/routes/position.route";
import BlockScanner from "./block-scanner.service";
import BlockTransactionHandler from "./block-transaction-handler.service";

dotenv.config();

const app = express();
const server = http.createServer(app);
// SET UP DEFAULTS APPS
app.use(morgan.successHandler);
app.use(morgan.errorHandler);
app.use(helmet());
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());
app.use(xss());
app.use(compression());
app.use((err: any, req: any, res: any, next: any) => {
  const status = err.status || 500;
  const message = err.message || "Something went wrong";
  return res.status(status).json({
    status,
    message,
    success: false,
    stack: env.server.env == "development" ? err.stack : null,
  });
});
app.use("/api/pool", poolRoute);
app.use("/api/position", positionRoute);
app.use((err, req, res, next) => {
  console.log(err);
  const status = err.status || 500;
  const message = err.message || "Something went wrong";
  return res.status(status).json({
    status,
    message,
    success: false,
    stack: env.server.env == "development" ? err.stack : null,
  });
});

const PORT = env.server.port;

server.listen(PORT, async () => {
  // setup lite engine server
  const { liteservers } = await fetch(
    `https://ton.org/${env.server.network == "mainnet" ? "" : "testnet-"}global.config.json`
  ).then((data) => data.json());
  const engines: LiteEngine[] = [];
  engines.push(
    ...liteservers.map(
      (server: any) =>
        new LiteSingleEngine({
          host: `tcp://${intToIP(server.ip)}:${server.port}`,
          publicKey: Buffer.from(server.id.key, "base64"),
        })
    )
  );
  const liteEngine = new LiteRoundRobinEngine(engines);
  const liteClient = new LiteClient({ engine: liteEngine });
  const blockHandler = new BlockTransactionHandler(liteClient);
  const blockScanner = new BlockScanner(liteClient, blockHandler);
  await blockScanner.run();
});
