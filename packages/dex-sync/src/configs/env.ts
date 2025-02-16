import Joi from 'joi';
import dotenv from 'dotenv';
dotenv.config();

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().error(new Error('NODE_ENV is required')),
    NETWORK: Joi.string().default('mainnet'),
    PORT: Joi.number().default(8000),
    DATABASE_URL: Joi.string().required(),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: 'key' } })
  .validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export default {
  server: {
    env: envVars.NODE_ENV,
    network: envVars.NETWORK,
    port: envVars.PORT,
    pgUrl: envVars.DATABASE_URL,
  },
};
