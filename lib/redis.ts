import { Redis } from "@upstash/redis";

let redisClient: Redis | null = null;

try {
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log("Upstash Redis initialized");
  } else {
    console.warn(
      "Upstash Redis credentials are not provided. Falling back to default Next.js fetch cache."
    );
  }
} catch (error) {
  console.error("Failed to initialize Upstash Redis:", error);
}

export async function getCache<T>(key: string): Promise<T | null> {
  if (!redisClient) return null;
  try {
    const data = await redisClient.get<T>(key);
    return data;
  } catch (error) {
    console.error(`Redis Get Error for key ${key}:`, error);
    return null;
  }
}

export async function setCache<T>(
  key: string,
  data: T,
  ttlSeconds: number = 3600
): Promise<void> {
  if (!redisClient) return;
  try {
    await redisClient.set(key, data, { ex: ttlSeconds });
  } catch (error) {
    console.error(`Redis Set Error for key ${key}:`, error);
  }
}

export default redisClient;
