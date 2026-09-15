import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

/** Optional Redis boundary. Local development remains usable when Redis is absent. */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client?: Redis;
  private connected = false;
  private lastError?: string;

  get configured() { return Boolean(process.env.REDIS_URL); }
  get available() { return this.connected; }
  get error() { return this.lastError; }

  async onModuleInit() {
    const url = process.env.REDIS_URL;
    if (!url) return;
    this.client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false, retryStrategy: () => null });
    this.client.on('error', (error) => { this.connected = false; this.lastError = error.message; });
    try {
      await this.client.connect();
      await this.client.ping();
      this.connected = true;
      this.lastError = undefined;
      this.logger.log('Redis connected');
    } catch (error: any) {
      this.connected = false;
      this.lastError = error?.message || 'REDIS_CONNECTION_FAILED';
      if (process.env.REDIS_REQUIRED === 'true') throw new Error(this.lastError);
      this.logger.warn(`Redis unavailable; using memory fallback (${this.lastError})`);
    }
  }

  async onModuleDestroy() { if (this.client) await this.client.quit().catch(() => undefined); }

  async blacklistSession(sessionId: string, ttlSeconds: number) {
    if (!this.client || !this.connected) return false;
    try { await this.client.set(`helper:revoked-session:${sessionId}`, '1', 'EX', Math.max(1, ttlSeconds)); return true; }
    catch (error: any) { this.lastError = error?.message || 'REDIS_WRITE_FAILED'; return false; }
  }

  async isSessionBlacklisted(sessionId: string) {
    if (!this.client || !this.connected) return false;
    try { return (await this.client.get(`helper:revoked-session:${sessionId}`)) === '1'; }
    catch (error: any) { this.lastError = error?.message || 'REDIS_READ_FAILED'; return false; }
  }

  async increment(key: string, ttlSeconds = 60) {
    if (!this.client || !this.connected) return undefined;
    try {
      const value = await this.client.incr(key);
      if (value === 1) await this.client.expire(key, ttlSeconds);
      return value;
    } catch (error: any) { this.lastError = error?.message || 'REDIS_WRITE_FAILED'; return undefined; }
  }
}
