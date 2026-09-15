import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SessionStore } from '../infra/session.store';

/** Socket.IO gateway for task rooms. Clients send auth.token and then joinTask/sendMessage events. */
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: (process.env.CORS_ORIGINS || '*').split(','),
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly sessions: SessionStore,
    private readonly chat: ChatService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = this.readToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload: any = await this.jwt.verifyAsync(token);
      if (payload.type !== 'access' || !(await this.sessions.isActive(payload.sid))) throw new Error('invalid session');
      client.data.userId = payload.sub;
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('joinTask')
  async joinTask(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
    const taskId = String(body?.taskId || '').trim();
    if (!client.data.userId || !taskId) throw new WsException('TASK_REQUIRED');
    try {
      this.chat.assertParticipant(taskId, client.data.userId);
      await client.join(this.room(taskId));
      return { ok: true, taskId };
    } catch (error: any) {
      throw new WsException(error?.message || 'CHAT_NOT_ALLOWED');
    }
  }

  @SubscribeMessage('sendMessage')
  sendMessage(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
    const taskId = String(body?.taskId || '').trim();
    if (!client.data.userId || !taskId) throw new WsException('TASK_REQUIRED');
    try {
      const message = this.chat.send(taskId, client.data.userId, body?.body ?? body?.message, body?.attachments ?? body?.photos ?? body?.media);
      this.server.to(this.room(taskId)).emit('message', message);
      return message;
    } catch (error: any) {
      throw new WsException(error?.message || 'MESSAGE_FAILED');
    }
  }

  private room(taskId: string): string {
    return `task:${taskId}`;
  }

  private readToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) return authToken.replace(/^Bearer\s+/i, '').trim();
    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) return header.slice(7).trim();
    return undefined;
  }
}
