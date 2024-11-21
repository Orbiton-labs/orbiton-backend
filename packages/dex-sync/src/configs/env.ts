import Joi from "joi";
import dotenv from "dotenv";
dotenv.config();

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().error(new Error("NODE_ENV is required")),
    PORT: Joi.number().default(8000),
    DUCKDB_DIR_NAME: Joi.string().default("db.duckdb"),
    STORAGE_DIR_NAME: Joi.string().default(".ton-amm-v3-sync"),
    WEBHOOK_URL: Joi.string().optional(),
    TRIGGER_BLOCK_INTERVAL: Joi.number().default(5 * 60 * 1000),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: "key" } })
  .validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export default {
  server: {
    env: envVars.NODE_ENV,
    port: envVars.PORT,
    storageDirName: envVars.STORAGE_DIR_NAME,
  },
  duckdb: {
    name: envVars.DUCKDB_DIR_NAME,
  },
};
