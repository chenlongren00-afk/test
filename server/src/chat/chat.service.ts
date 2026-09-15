/** Task-scoped chat service. PostgreSQL/Redis adapters can replace this memory store without changing the API. */
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataStore } from '../infra/data.store';
import { NotificationsService } from '../notifications/notifications.service';

export type ChatMessage = {
  id: string;
  threadId: string;
  taskId: string;
  senderId: string;
  senderName?: string;
  body: string;
  attachments: unknown[];
  readBy: string[];
  createdAt: string;
};

@Injectable()
export class ChatService {
  private readonly messages = new Map<string, ChatMessage[]>();
  private readonly archived = new Set<string>();
  private readonly deleted = new Set<string>();

  constructor(private readonly data: DataStore, private readonly notifications: NotificationsService) {}

  /** Verify that a user is the task poster or has submitted an offer for the task. */
  assertParticipant(taskId: string, userId: string): void {
    const task = this.data.tasks.find((item) => item.id === taskId);
    if (!task) throw new NotFoundException('TASK_NOT_FOUND');
    const isPoster = task.posterId === userId;
    const hasOffer = this.data.offers.some(
      (offer) => offer.taskId === taskId && offer.helperId === userId && ['submitted', 'countered', 'accepted'].includes(offer.status),
    );
    if (!isPoster && !hasOffer) throw new ForbiddenException('CHAT_NOT_ALLOWED');
    // Production keeps conversations behind payment confirmation; local smoke tests can opt out.
    const paymentGateEnabled = process.env.CHAT_ALLOW_PREPAYMENT !== 'true' && process.env.CHAT_REQUIRE_PAYMENT !== 'false';
    if (paymentGateEnabled) {
      const allowedStatuses = new Set(['payment_secured', 'assigned', 'in_progress', 'completed', 'payment_released']);
      if (!allowedStatuses.has(task.status)) throw new ForbiddenException('CHAT_PAYMENT_REQUIRED');
    }
  }

  list(taskId: string, userId: string): ChatMessage[] {
    this.assertParticipant(taskId, userId);
    if (this.deleted.has(`${taskId}:${userId}`)) return [];
    return [...(this.messages.get(taskId) || [])];
  }

  taskTitle(taskId: string): string {
    const task = this.data.tasks.find((item) => item.id === taskId);
    if (!task) throw new NotFoundException('TASK_NOT_FOUND');
    return task.title;
  }

  send(taskId: string, userId: string, body: unknown, attachments: unknown[] = []): ChatMessage {
    this.assertParticipant(taskId, userId);
    const text = String(body ?? '').trim();
    const media = Array.isArray(attachments) ? attachments.slice(0, 5) : [];
    if (!text && media.length === 0) throw new BadRequestException('MESSAGE_REQUIRED');
    if (text.length > 1000) throw new BadRequestException('MESSAGE_TOO_LONG');
    const message: ChatMessage = {
      id: this.data.id(),
      threadId: `thread-${taskId}`,
      taskId,
      senderId: userId,
      senderName: this.data.users.find((user) => user.id === userId)?.name,
      body: text,
      attachments: media,
      readBy: [userId],
      createdAt: new Date().toISOString(),
    };
    const existing = this.messages.get(taskId) || [];
    existing.push(message);
    this.messages.set(taskId, existing);
    const task = this.data.tasks.find((item) => item.id === taskId);
    const recipients = new Set<string>(task ? [task.posterId, ...this.data.offers.filter((offer) => offer.taskId === taskId).map((offer) => offer.helperId)] : []);
    recipients.delete(userId);
    const preview = text.slice(0, 120) || (media.length ? `${media.length} attachment${media.length === 1 ? '' : 's'}` : 'New message');
    for (const recipient of recipients) void this.notifications.sendToUser(recipient, 'New task message', preview, { taskId, messageId: message.id });
    return message;
  }

  markRead(taskId: string, userId: string) {
    this.assertParticipant(taskId, userId);
    let updated = 0;
    for (const message of this.messages.get(taskId) || []) {
      if (!message.readBy.includes(userId)) {
        message.readBy.push(userId);
        updated += 1;
      }
    }
    return { success: true, taskId, updated };
  }

  archive(taskId: string, userId: string, archived = true) {
    this.assertParticipant(taskId, userId);
    if (archived) this.archived.add(`${taskId}:${userId}`);
    else this.archived.delete(`${taskId}:${userId}`);
    return { success: true, taskId, archived };
  }

  clear(taskId: string, userId: string) {
    this.assertParticipant(taskId, userId);
    this.deleted.add(`${taskId}:${userId}`);
    return { success: true, taskId };
  }
}
