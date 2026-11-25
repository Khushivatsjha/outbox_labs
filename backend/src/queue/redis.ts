import Redis, { RedisOptions } from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const redisConnectionOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD ? env.REDIS_PASSWORD : undefined,
  tls: {},
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
};

export const createRedisConnection = () => {
  const client = new Redis(redisConnectionOptions);
  client.on('error', (err) => {
    logger.error({ err: err.message }, 'Redis connection error');
  });
  return client;
};
