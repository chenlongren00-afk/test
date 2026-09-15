/** PRD 2.3: task endpoints retain /api/app/tasks paths used by existing clients. */
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { TasksService } from './tasks.service';
@Controller('api/app/tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}
  @Public() @Get() list(@Query() query: any) { return this.tasks.list(query); }
  @Public() @Get(':id') get(@Param('id') id: string) { return this.tasks.get(id); }
  @Roles('poster', 'both') @Post() create(@Req() req: any, @Body() body: any) { const task = this.tasks.create(req.user.sub, body); return { ...task, task, notifications: [] }; }
  @Roles('poster', 'both') @Patch(':id') update(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.tasks.update(id, req.user.sub, body); }
  @Roles('poster', 'both') @Delete(':id') remove(@Req() req: any, @Param('id') id: string) {
    const task = this.tasks.get(id); if (task.posterId !== req.user.sub) throw new ForbiddenException('FORBIDDEN');
    task.status = 'cancelled'; return { taskId: id, deleted: true, notifications: [] };
  }
  @Post(':id/start') start(@Req() req: any, @Param('id') id: string) { return this.transition(req.user.sub, id, 'in_progress'); }
  @Post(':id/payment/request') requestPayment(@Req() req: any, @Param('id') id: string) { return this.transition(req.user.sub, id, 'payment_requested'); }
  @Post(':id/payment/release') releasePayment(@Req() req: any, @Param('id') id: string) { return this.transition(req.user.sub, id, 'payment_released'); }
  @Post(':id/cancellation/request') cancellation(@Req() req: any, @Param('id') id: string) { return this.transition(req.user.sub, id, 'cancel_requested'); }
  @Post(':id/checkout-session') checkout(@Req() req: any, @Param('id') id: string) {
    const result = this.transition(req.user.sub, id, 'awaiting_payment');
    return { mode: 'mock', sessionId: `mock_${id}`, url: '', task: result.task, notifications: [], state: null };
  }
  @Post(':id/payment/confirm') confirmPayment(@Req() req: any, @Param('id') id: string) { return this.transition(req.user.sub, id, 'payment_secured'); }
  @Post(':id/reviews') review(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const task = this.tasks.get(id); const review = { id: `review_${Date.now()}`, taskId: id, taskTitle: task.title, authorUserId: req.user.sub, authorRole: 'tasker', targetRole: body.targetRole || 'helper', rating: Number(body.rating || 0), comment: String(body.comment || ''), createdAt: new Date().toISOString() };
    return { review, task, notifications: [] };
  }
  private transition(userId: string, id: string, status: string) {
    const task: any = this.tasks.get(id); if (task.posterId !== userId && !task.offers.some((offer: any) => offer.helperId === userId && offer.status === 'accepted')) throw new ForbiddenException('FORBIDDEN');
    task.status = status; return { task, notifications: [] };
  }
}
  
