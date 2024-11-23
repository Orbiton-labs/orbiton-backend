import Joi from "joi";
import dotenv from "dotenv";
dotenv.config();

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().error(new Error("NODE_ENV is required")),
    PORT: Joi.number().default(8000),
    NETWORK: Joi.string().required(),
    PRICE_API: Joi.string().required(),
    MONGO_URL: Joi.string().required(),
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
    network: envVars.NETWORK,
    port: envVars.PORT,
    storageDirName: envVars.STORAGE_DIR_NAME,
    mongoUrl: envVars.MONGO_URL,
    priceApi: envVars.PRICE_API,
  },
};
