const baseUrl = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:4242').replace(/\/$/, '');
const email = process.env.SMOKE_TEST_EMAIL || `smoke-${Date.now()}@example.test`;
const password = process.env.SMOKE_TEST_PASSWORD || 'SmokeTest123!';

async function request(path, options = {}) {
  const { token, headers, body: requestBody, ...fetchOptions } = options;
  const response = await fetch(`${baseUrl}${path}`, { ...fetchOptions, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(headers || {}) }, body: requestBody ? JSON.stringify(requestBody) : undefined });
  const responseBody = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} ${response.status}: ${JSON.stringify(responseBody)}`);
  return responseBody;
}

async function expectStatus(path, expectedStatus, options = {}) {
  const { token, headers, body: requestBody, ...fetchOptions } = options;
  const response = await fetch(`${baseUrl}${path}`, { ...fetchOptions, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(headers || {}) }, body: requestBody ? JSON.stringify(requestBody) : undefined });
  if (response.status !== expectedStatus) throw new Error(`${path} expected ${expectedStatus}, received ${response.status}`);
  return true;
}

const health = await request('/api/health');
const dependencies = await request('/api/health/dependencies');
if (process.env.REQUIRE_REDIS === 'true' && !dependencies.redis.available) throw new Error('REDIS_REQUIRED_BUT_UNAVAILABLE');
if (process.env.REQUIRE_STRIPE === 'true' && dependencies.stripe.mode !== 'live-sdk') throw new Error('STRIPE_REQUIRED_BUT_UNCONFIGURED');
if (process.env.REQUIRE_EXPO_PUSH === 'true' && dependencies.expoPush.mode !== 'expo') throw new Error('EXPO_PUSH_REQUIRED_BUT_UNCONFIGURED');
const tasks = await request('/api/app/tasks');
const stripeStatus = await request('/api/stripe/status');
const auth = await request('/api/auth/register', { method: 'POST', body: { email, password, name: 'Smoke Test', role: 'both' } });
const created = await request('/api/app/tasks', { method: 'POST', token: auth.accessToken, body: { title: 'Smoke test task', description: 'Disposable local smoke task', budget: 1, suburb: 'Carlton' } });
const paymentHeaders = { 'Idempotency-Key': `smoke-${Date.now()}` };
const payment1 = await request('/api/stripe/payment-sheet', { method: 'POST', token: auth.accessToken, headers: paymentHeaders, body: { taskId: created.id } });
const payment2 = await request('/api/stripe/payment-sheet', { method: 'POST', token: auth.accessToken, headers: paymentHeaders, body: { taskId: created.id } });
const pushDiagnostics = await request('/api/app/notifications/diagnostics', { token: auth.accessToken });
const pushTest = await request('/api/app/notifications/test', { method: 'POST', token: auth.accessToken, body: { title: 'Smoke', body: 'Push dry run' } });
const chatGate = dependencies.chat.paymentGate === 'enabled' ? await expectStatus(`/api/app/tasks/${created.id}/messages`, 403, { token: auth.accessToken }) : false;
const chatMessage = dependencies.chat.paymentGate === 'disabled' ? await request(`/api/app/tasks/${created.id}/messages`, { method: 'POST', token: auth.accessToken, body: { body: 'Chat smoke message' } }) : undefined;
const webhook1 = await request('/api/stripe/webhook', { method: 'POST', body: { id: `smoke-event-${Date.now()}`, type: 'payment_intent.processing' } });
const webhook2 = await request('/api/stripe/webhook', { method: 'POST', body: { id: webhook1.eventId, type: 'payment_intent.processing' } });
console.log(JSON.stringify({ ok: health.ok === true, dependencyModes: dependencies, taskCount: tasks.length, createdTaskId: created.id, stripeMode: stripeStatus.mode, paymentIdempotent: payment1.paymentId === payment2.paymentId, webhookDuplicateDetected: webhook2.duplicate === true, pushMode: pushTest.mode, pushDiagnostics, chatPaymentGateRejected: chatGate, chatMessageId: chatMessage?.message?.id || chatMessage?.id }, null, 2));
