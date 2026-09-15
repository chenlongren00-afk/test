import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import Stripe = require('stripe');
import { createHash } from 'node:crypto';
import { DataStore, Payment } from '../infra/data.store';

export type PaymentSheetResult = {
  paymentIntent: string | null;
  clientSecret: string | null;
  taskId: string;
  paymentId: string;
  amountCents: number;
  currency: string;
  mode: 'stripe' | 'mock';
};

/**
 * Stripe boundary. The DataStore collections intentionally mirror the
 * PostgreSQL payments and stripe_webhook_events tables so the repository can
 * be swapped in without changing controllers or webhook behavior.
 */
@Injectable()
export class PaymentsService {
  private readonly stripe?: Stripe;
  private readonly idempotency = new Map<string, PaymentSheetResult>();
  private readonly currency = (process.env.STRIPE_CURRENCY || 'aud').toLowerCase();

  constructor(private readonly data: DataStore) {
    const secret = process.env.STRIPE_SECRET_KEY?.trim();
    if (secret) this.stripe = new Stripe(secret);
  }

  status() {
    return {
      mode: this.stripe ? 'stripe' : 'mock',
      configured: Boolean(this.stripe),
      webhookSignatureVerification: this.stripe ? Boolean(process.env.STRIPE_WEBHOOK_SECRET) : false,
      currency: this.currency,
      persistence: 'in-memory-compatibility-store',
      requiredForProduction: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'DATABASE_URL'],
    };
  }

  async createPaymentSheet(userId: string, body: any, idempotencyKey?: string): Promise<PaymentSheetResult> {
    const taskId = String(body?.taskId || '').trim();
    if (!taskId) throw new BadRequestException('TASK_ID_REQUIRED');
    const task = this.data.tasks.find((item) => item.id === taskId);
    if (!task) throw new BadRequestException('TASK_NOT_FOUND');
    if (task.posterId !== userId) throw new BadRequestException('TASK_NOT_OWNED');

    const key = idempotencyKey || body?.idempotencyKey;
    if (key && this.idempotency.has(key)) return this.idempotency.get(key)!;

    const amountCents = this.resolveAmountCents(body, task);
    const helperId = body?.helperId ? String(body.helperId) : undefined;
    const payment: Payment = {
      id: this.data.id(),
      taskId,
      posterId: userId,
      helperId,
      amountCents,
      currency: this.currency,
      status: 'requires_payment',
      metadata: { taskId, posterId: userId, ...(helperId ? { helperId } : {}) },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let result: PaymentSheetResult;
    if (this.stripe) {
      try {
        const intent = await this.stripe.paymentIntents.create(
          {
            amount: amountCents,
            currency: this.currency,
            automatic_payment_methods: { enabled: true },
            metadata: payment.metadata as Record<string, string>,
          },
          key ? { idempotencyKey: key } : undefined,
        );
        payment.stripePaymentIntentId = intent.id;
        payment.status = intent.status;
        result = {
          paymentIntent: intent.id,
          clientSecret: intent.client_secret,
          taskId,
          paymentId: payment.id,
          amountCents,
          currency: this.currency,
          mode: 'stripe',
        };
      } catch {
        throw new ServiceUnavailableException('STRIPE_PAYMENT_INTENT_FAILED');
      }
    } else {
      result = {
        paymentIntent: null,
        clientSecret: null,
        taskId,
        paymentId: payment.id,
        amountCents,
        currency: this.currency,
        mode: 'mock',
      };
    }

    this.data.payments.push(payment);
    if (key) this.idempotency.set(key, result);
    return result;
  }

  async createAccountLink(userId: string, body: any) {
    if (!this.stripe) {
      return {
        url: `${process.env.PUBLIC_BASE_URL || 'http://localhost:4242'}/mock/stripe-connect`,
        userId,
        mode: 'mock' as const,
      };
    }

    try {
      const accountId = body?.accountId
        ? String(body.accountId)
        : (await this.stripe.accounts.create({
            type: 'express',
            country: process.env.STRIPE_CONNECT_COUNTRY || 'AU',
            email: body?.email ? String(body.email) : undefined,
            capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
            metadata: { userId },
          })).id;
      const base = process.env.PUBLIC_BASE_URL || 'http://localhost:4242';
      const refreshUrl = process.env.STRIPE_CONNECT_REFRESH_URL || `${base}/api/stripe/connect/refresh`;
      const returnUrl = process.env.STRIPE_CONNECT_RETURN_URL || `${base}/api/stripe/connect/return`;
      const link = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });
      return { url: link.url, expiresAt: link.expires_at, accountId, userId, mode: 'stripe' as const };
    } catch {
      throw new ServiceUnavailableException('STRIPE_ACCOUNT_LINK_FAILED');
    }
  }

  async release(userId: string, body: any, idempotencyKey?: string) {
    const taskId = body?.taskId ? String(body.taskId) : undefined;
    const payment = body?.paymentId
      ? this.data.payments.find((item) => item.id === String(body.paymentId))
      : taskId
        ? this.data.payments.find((item) => item.taskId === taskId && item.posterId === userId)
        : undefined;
    if (payment && payment.posterId !== userId) throw new BadRequestException('PAYMENT_NOT_OWNED');
    const amountCents = Number(body?.amountCents ?? payment?.amountCents);
    if (!Number.isFinite(amountCents) || amountCents <= 0) throw new BadRequestException('INVALID_RELEASE_AMOUNT');
    const destination = body?.destinationAccountId ? String(body.destinationAccountId) : undefined;

    if (!this.stripe) {
      if (payment) this.updatePayment(payment, 'release_pending_confirmation');
      return { success: true, status: 'release_pending_confirmation', taskId: taskId || payment?.taskId, mode: 'mock' as const };
    }
    if (!destination) throw new BadRequestException('DESTINATION_ACCOUNT_REQUIRED');

    try {
      const params: Stripe.TransferCreateParams = {
        amount: Math.round(amountCents),
        currency: this.currency,
        destination,
        metadata: { taskId: taskId || payment?.taskId || '', paymentId: payment?.id || '' },
      };
      if (body?.sourceTransaction) params.source_transaction = String(body.sourceTransaction);
      const transfer = await this.stripe.transfers.create(params, idempotencyKey ? { idempotencyKey } : undefined);
      if (payment) {
        payment.metadata.transferId = transfer.id;
        this.updatePayment(payment, 'released');
      }
      return { success: true, status: 'released', transferId: transfer.id, taskId: taskId || payment?.taskId, mode: 'stripe' as const };
    } catch {
      throw new ServiceUnavailableException('STRIPE_TRANSFER_FAILED');
    }
  }

  async handleWebhook(rawBody: Buffer | string | undefined, signature?: string, parsedBody?: any) {
    let event: Stripe.Event | any;
    if (this.stripe) {
      const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
      if (!secret) throw new ServiceUnavailableException('STRIPE_WEBHOOK_SECRET_NOT_CONFIGURED');
      if (!signature) throw new BadRequestException('STRIPE_SIGNATURE_REQUIRED');
      if (!rawBody) throw new BadRequestException('STRIPE_RAW_BODY_REQUIRED');
      try {
        event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
      } catch {
        throw new BadRequestException('STRIPE_SIGNATURE_INVALID');
      }
    } else {
      event = parsedBody || this.parseRawBody(rawBody);
      if (!event || typeof event !== 'object') throw new BadRequestException('INVALID_WEBHOOK_PAYLOAD');
      event.id = event.id || `mock_${createHash('sha256').update(rawBody || JSON.stringify(event)).digest('hex')}`;
    }

    const eventId = String(event.id || '');
    if (!eventId) throw new BadRequestException('STRIPE_EVENT_ID_REQUIRED');
    const previous = this.data.stripeWebhookEvents.get(eventId);
    if (previous) return { received: true, duplicate: true, eventId, type: previous.type, mode: this.stripe ? 'stripe' : 'mock' };

    await this.applyEvent(event);
    this.data.stripeWebhookEvents.set(eventId, { type: String(event.type || 'unknown'), payload: event, processedAt: new Date().toISOString() });
    return { received: true, duplicate: false, eventId, type: event.type, mode: this.stripe ? 'stripe' : 'mock' };
  }

  private async applyEvent(event: any) {
    const object = event?.data?.object || {};
    const intentId = object.id;
    const payment = this.data.payments.find((item) =>
      (intentId && item.stripePaymentIntentId === intentId) ||
      (object.metadata?.paymentId && item.id === String(object.metadata.paymentId)) ||
      (object.metadata?.taskId && item.taskId === String(object.metadata.taskId)),
    );
    if (!payment) return;
    const statusByType: Record<string, string> = {
      'payment_intent.succeeded': 'succeeded',
      'payment_intent.payment_failed': 'failed',
      'payment_intent.processing': 'processing',
      'payment_intent.canceled': 'canceled',
    };
    const next = statusByType[event.type];
    if (next) this.updatePayment(payment, next);
  }

  private updatePayment(payment: Payment, status: string) {
    payment.status = status;
    payment.updatedAt = new Date().toISOString();
    if (status === 'succeeded') {
      const task = this.data.tasks.find((item) => item.id === payment.taskId);
      if (task && ['open', 'awaiting_payment'].includes(task.status)) task.status = 'payment_secured';
    }
  }

  private resolveAmountCents(body: any, task: { budget?: number }) {
    const explicit = body?.amountCents !== undefined ? Number(body.amountCents) : Number(body?.amount) * 100;
    const amountCents = Number.isFinite(explicit) && explicit > 0 ? Math.round(explicit) : Math.round(Number(task.budget || 0) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) throw new BadRequestException('INVALID_PAYMENT_AMOUNT');
    return amountCents;
  }

  private parseRawBody(rawBody?: Buffer | string) {
    if (!rawBody) return undefined;
    try { return JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody); } catch { return undefined; }
  }
}
