import {
  LiteClient,
  LiteEngine,
  LiteRoundRobinEngine,
  LiteSingleEngine,
} from "ton-lite-client";
import TonWeb from "tonweb";
import TonBlockProcessor from "./block-processor";
import TonTxProcessor from "./tx-processor";
import dotenv from "dotenv";
import { intToIP } from "./constants";
import { createLogger, format, transports } from "winston";
import { setTimeout } from "timers/promises";
import { DuckDbNode } from "./db";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import http from "http";
import xss from "xss-clean";
import morgan from "./configs/morgan";
import env from "./configs/env";
import poolRoute from "./apis/routes/pool.route";
import positionRoute from "./apis/routes/position.route";

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

const PORT = env.server.port;

server.listen(PORT, async () => {
  let duckDb: DuckDbNode;
  duckDb = await DuckDbNode.create("db.duckdb");
  await duckDb.createTable();

  const logger = createLogger({
    level: "info",
    format: format.combine(format.timestamp(), format.json()),
    transports: [new transports.Console()],
  });
  // setup lite engine server
  const { liteservers } = await fetch(
    "https://ton.org/testnet-global.config.json"
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
  const routerContractAddress = process.env.ROUTER_ADDRESS;

  // should host a private ton http api in production: https://github.com/toncenter/ton-http-api
  const tonWeb = new TonWeb(
    new TonWeb.HttpProvider(process.env.TON_HTTP_API_URL)
  );

  const blockProcessor = new TonBlockProcessor(liteClient, tonWeb, logger);
  const txProcessor = new TonTxProcessor(
    liteClient,
    logger,
    [routerContractAddress],
    [""],
    routerContractAddress
  );

  const processInterval = 3000; // 3s
  while (true) {
    try {
      const latestMasterchainBlock = await blockProcessor.getMasterchainInfo();
      const { parsedBlock } = await blockProcessor.queryKeyBlock(
        latestMasterchainBlock.last.seqno
      );
      logger.info("Masterchain: " + latestMasterchainBlock.last.seqno);
      logger.info("Keyblock: " + parsedBlock.info.seq_no);
      await txProcessor.processTransactions(latestMasterchainBlock.last);
    } catch (error) {
      logger.error("error processing block and tx: " + error);
    }
    await setTimeout(processInterval);
  }
});
