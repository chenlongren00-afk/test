/** PRD 2.5: Stripe payment and release boundary. Webhook remains the payment fact source. */
import { Body, Controller, Get, Headers, Post, Req } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';

@Controller('api/stripe')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Public() @Get('status')
  status() { return this.payments.status(); }

  @Post('payment-sheet')
  paymentSheet(@Body() body: any, @Req() req: any, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.payments.createPaymentSheet(req.user.sub, body, idempotencyKey);
  }

  @Post('connect/account-link')
  accountLink(@Req() req: any, @Body() body: any) {
    return this.payments.createAccountLink(req.user.sub, body);
  }

  @Post('transfers/release')
  release(@Body() body: any, @Req() req: any, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.payments.release(req.user.sub, body, idempotencyKey);
  }

  @Public() @Post('webhook')
  webhook(@Req() req: any, @Headers('stripe-signature') signature?: string, @Body() body?: any) {
    return this.payments.handleWebhook(req.rawBody, signature, body);
  }
}
