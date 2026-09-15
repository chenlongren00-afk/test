import { Injectable, Logger } from '@nestjs/common';

export type DeviceToken = { userId: string; token: string; platform: string; updatedAt: string; enabled: boolean };

/** Expo Push boundary. It stays in dry-run mode until EXPO_PUSH_ENABLED=true. */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly tokens = new Map<string, DeviceToken>();
  private lastSend?: { mode: string; at: string; error?: string };

  registerToken(userId: string, token: string, platform = 'unknown') {
    const item = { userId, token, platform, updatedAt: new Date().toISOString(), enabled: true };
    this.tokens.set(token, item);
    return item;
  }

  diagnostics() {
    return { configured: Boolean(process.env.EXPO_ACCESS_TOKEN), enabled: process.env.EXPO_PUSH_ENABLED === 'true', tokenCount: this.tokens.size, lastSend: this.lastSend };
  }

  async sendToUser(userId: string, title: string, body: string, data: Record<string, unknown> = {}) {
    const recipients = [...this.tokens.values()].filter(item => item.userId === userId && item.enabled);
    if (process.env.EXPO_PUSH_ENABLED !== 'true' || recipients.length === 0) {
      this.lastSend = { mode: 'mock', at: new Date().toISOString() };
      return { mode: 'mock', recipients: recipients.length, tickets: [] };
    }
    const messages = recipients.map(item => ({ to: item.token, title, body, data }));
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
      const response = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers, body: JSON.stringify(messages) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`EXPO_HTTP_${response.status}`);
      this.lastSend = { mode: 'expo', at: new Date().toISOString() };
      return { mode: 'expo', recipients: messages.length, tickets: payload.data || payload };
    } catch (error: any) {
      this.lastSend = { mode: 'error', at: new Date().toISOString(), error: error?.message || 'EXPO_PUSH_FAILED' };
      this.logger.warn(this.lastSend.error);
      return { mode: 'error', recipients: messages.length, tickets: [], error: this.lastSend.error };
    }
  }
}
