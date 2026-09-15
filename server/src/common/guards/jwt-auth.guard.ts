/** Global bearer authentication guard. @Public() endpoints bypass token validation. */
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SessionStore } from '../../infra/session.store';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService, private readonly sessions: SessionStore) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ChatGateway authenticates the Socket.IO handshake itself; HTTP bearer parsing does not apply to WS events.
    if (context.getType() === 'ws') return true;
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const req = context.switchToHttp().getRequest();
    const header = String(req.headers.authorization || '');
    if (!header.startsWith('Bearer ')) throw new UnauthorizedException('UNAUTHENTICATED');
    try {
      const payload = await this.jwt.verifyAsync(header.slice(7));
      if (payload.type !== 'access' || !(await this.sessions.isActive(payload.sid))) throw new UnauthorizedException('SESSION_REVOKED');
      req.user = payload;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('INVALID_TOKEN');
    }
  }
}
