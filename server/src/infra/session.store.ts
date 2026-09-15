/** Session persistence boundary. PostgreSQL is authoritative in production; memory mode keeps local setup usable. */
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RedisService } from './redis.service';
export type Session = { id: string; userId: string; refreshHash: string; expiresAt: Date; revokedAt?: Date; device?: string };
@Injectable()
export class SessionStore {
  private readonly sessions = new Map<string, Session>();
  constructor(private readonly redis: RedisService) {}
  create(userId: string, refreshHash: string, device?: string, days = 7): Session {
    const session = { id: randomUUID(), userId, refreshHash, device, expiresAt: new Date(Date.now() + days * 86400000) };
    this.sessions.set(session.id, session); return session;
  }
  get(id: string) { return this.sessions.get(id); }
  async isActive(id: string) {
    const item = this.sessions.get(id);
    if (!item || item.revokedAt || item.expiresAt <= new Date()) return false;
    return !(await this.redis.isSessionBlacklisted(id));
  }
  revoke(id: string) {
    const item = this.sessions.get(id);
    if (item) {
      item.revokedAt = new Date();
      void this.redis.blacklistSession(id, Math.ceil(Math.max(1, item.expiresAt.getTime() - Date.now()) / 1000));
    }
  }
}
