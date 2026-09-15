import { BadRequestException, Body, Controller, Get, Post, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('api/app')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('device-tokens') register(@Req() req: any, @Body() body: any) {
    const token = String(body?.token || '').trim();
    if (!/^Expo(nent)?PushToken\[.+\]$/.test(token)) throw new BadRequestException('INVALID_EXPO_PUSH_TOKEN');
    return this.notifications.registerToken(req.user.sub, token, String(body?.platform || 'unknown'));
  }

  @Get('notifications/diagnostics') diagnostics() { return this.notifications.diagnostics(); }

  @Post('notifications/test') async test(@Req() req: any, @Body() body: any) {
    return this.notifications.sendToUser(req.user.sub, String(body?.title || 'Australian Helper'), String(body?.body || 'Push notification test'), { type: 'diagnostic' });
  }
}
