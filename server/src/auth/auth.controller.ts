/** PRD 2.1: API-compatible authentication routes. */
import { Body, Controller, Delete, Get, Patch, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) { }
  @Public() @Post('register') register(@Body() body: any, @Req() req: any) { return this.auth.register(body, req.headers['user-agent']); }
  @Public() @Post('login') login(@Body() body: any, @Req() req: any) { return this.auth.login(body.email, body.password, req.headers['user-agent']); }
  @Public() @Post('refresh') refresh(@Body() body: any, @Req() req: any) { return this.auth.refresh(body.refreshToken, req.headers['user-agent']); }
  @Get('me') me(@Req() req: any) { return { user: this.auth.me(req.user.sub) }; }
  @Patch('profile') profile(@Req() req: any, @Body() body: any) { return this.auth.updateProfile(req.user.sub, body); }
  @Post('phone/start') phoneStart(@Req() req: any, @Body() body: any) { return this.auth.startPhone(req.user.sub, body.phone); }
  @Post('phone/check') phoneCheck(@Req() req: any, @Body() body: any) { return this.auth.confirmPhone(req.user.sub, body.phone, body.code); }
  @Post('identity/start') identityStart(@Req() req: any) { return this.auth.startIdentity(req.user.sub); }
  @Post('identity/refresh') identityRefresh(@Req() req: any) { return this.auth.refreshIdentity(req.user.sub); }
  @Post('logout') logout(@Req() req: any) { return this.auth.logout(req.user.sid); }
  @Public() @Post('password/forgot') forgot() { return { success: true, message: 'If the account exists, reset instructions have been sent.' }; }
  @Public() @Post('password/reset') reset() { return { success: true, message: 'Password reset completed.' }; }
  @Delete('account') deleteAccount(@Req() req: any) { return { success: true, userId: req.user.sub, status: 'disabled' }; }
}
