/** Compatibility data store used while the JSON-to-PostgreSQL migration runs. Replace writes with repositories per module. */
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
export type User = { id: string; email: string; name: string; passwordHash: string; role: 'poster'|'helper'|'both'; status: string; createdAt: string };
export type Task = { id: string; posterId: string; title: string; description?: string; category?: string; budget?: number; suburb?: string; status: string; createdAt: string; offers: any[] };
export type Payment = {
  id: string;
  taskId: string;
  posterId: string;
  helperId?: string;
  amountCents: number;
  currency: string;
  stripePaymentIntentId?: string;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
@Injectable()
export class DataStore {
  readonly users: User[] = [];
  readonly tasks: Task[] = [];
  readonly offers: any[] = [];
  /** Compatibility collections; replace with PostgreSQL repositories during cutover. */
  readonly payments: Payment[] = [];
  readonly stripeWebhookEvents = new Map<string, { type: string; payload: unknown; processedAt?: string }>();
  constructor() {
    const adminHash = process.env.DEMO_ADMIN_PASSWORD_HASH;
    if (adminHash) this.users.push({ id: 'admin', email: 'admin@australianhelper.com', name: 'Admin', passwordHash: adminHash, role: 'both', status: 'active', createdAt: new Date().toISOString() });
    this.tasks.push(
      { id: 'demo-task-1', posterId: 'demo-poster', title: 'Garden tidy up in Carlton', description: 'Trim hedges and remove green waste from a small courtyard.', category: 'Gardening', budget: 120, suburb: 'Carlton', status: 'open', createdAt: new Date().toISOString(), offers: [] },
      { id: 'demo-task-2', posterId: 'demo-poster', title: 'Help move a sofa upstairs', description: 'One hour of lifting help this Saturday morning.', category: 'Moving', budget: 80, suburb: 'Richmond', status: 'open', createdAt: new Date().toISOString(), offers: [] },
    );
  }
  id() { return randomUUID(); }
}
