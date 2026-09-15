/** PRD 2.3: task lifecycle and public marketplace queries. External dependencies: PostgreSQL repository, object storage, moderation queue. */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataStore } from '../infra/data.store';
@Injectable()
export class TasksService {
  constructor(private readonly data: DataStore) {}
  /** PRD 2.3: only authenticated poster/both can create a draft task. */
  create(userId: string, body: any) { const title = String(body.title || '').trim(); if (!title) throw new BadRequestException('TITLE_REQUIRED'); const budget = Number(body.budget || 0); if (!Number.isFinite(budget) || budget < 0) throw new BadRequestException('INVALID_BUDGET'); const task = { id: this.data.id(), posterId: userId, title, description: String(body.description || '').trim(), category: String(body.category || 'Others'), budget, suburb: String(body.suburb || '').trim(), status: 'open', createdAt: new Date().toISOString(), offers: [] }; this.data.tasks.push(task); return task; }
  list(query: any) { const status = query.status || 'open'; return this.data.tasks.filter(t => t.status === status && (!query.category || t.category === query.category)); }
  get(id: string) { const task = this.data.tasks.find(item => item.id === id); if (!task) throw new NotFoundException('TASK_NOT_FOUND'); return task; }
  update(id: string, userId: string, body: any) { const task = this.get(id); if (task.posterId !== userId) throw new NotFoundException('TASK_NOT_FOUND'); Object.assign(task, body); return task; }
}
