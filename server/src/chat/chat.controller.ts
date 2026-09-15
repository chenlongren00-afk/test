import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ChatService } from './chat.service';

/** REST fallback for clients that cannot maintain a WebSocket connection. */
@Controller('api/app')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get(['threads/:taskId/messages', 'tasks/:taskId/messages'])
  list(@Req() req: any, @Param('taskId') taskId: string) {
    return { messages: this.chat.list(taskId, req.user.sub) };
  }

  @Post(['threads/:taskId/messages', 'tasks/:taskId/messages'])
  send(@Req() req: any, @Param('taskId') taskId: string, @Body() body: any) {
    const message = this.chat.send(taskId, req.user.sub, body?.body ?? body?.message, body?.attachments ?? body?.photos ?? body?.media);
    return {
      message,
      thread: {
        id: message.threadId,
        taskId: message.taskId,
        taskTitle: this.chat.taskTitle(taskId),
        messages: this.chat.list(taskId, req.user.sub),
      },
      notifications: [],
      state: { tasks: [], notifications: [], messages: this.chat.list(taskId, req.user.sub), offers: [], payments: [] },
    };
  }

  @Post('tasks/:taskId/messages/read')
  read(@Req() req: any, @Param('taskId') taskId: string) {
    return this.chat.markRead(taskId, req.user.sub);
  }

  @Post('tasks/:taskId/messages/archive')
  archive(@Req() req: any, @Param('taskId') taskId: string, @Body() body: any) {
    return this.chat.archive(taskId, req.user.sub, body?.archived !== false);
  }

  @Post('tasks/:taskId/messages/delete')
  delete(@Req() req: any, @Param('taskId') taskId: string) {
    return this.chat.clear(taskId, req.user.sub);
  }
}
