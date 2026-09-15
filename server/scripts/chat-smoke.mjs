const baseUrl = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:4242').replace(/\/$/, '');
const email = process.env.SMOKE_CHAT_EMAIL || `chat-smoke-${Date.now()}@example.test`;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

const auth = await request('/api/auth/register', {
  method: 'POST',
  body: { email, password: 'ChatSmoke123!', name: 'Chat Smoke', role: 'poster' },
});
const task = await request('/api/app/tasks', {
  method: 'POST',
  token: auth.accessToken,
  body: { title: 'Chat smoke task', description: 'Disposable local chat task', budget: 1, suburb: 'Carlton' },
});
const sent = await request(`/api/app/tasks/${task.id}/messages`, {
  method: 'POST',
  token: auth.accessToken,
  body: { body: 'hello from chat smoke', attachments: [] },
});
const history = await request(`/api/app/threads/${task.id}/messages`, { token: auth.accessToken });
if (history.messages?.length !== 1 || history.messages[0].id !== sent.message.id) throw new Error('CHAT_HISTORY_MISMATCH');
console.log(JSON.stringify({ ok: true, taskId: task.id, messageId: sent.message.id, count: history.messages.length }, null, 2));
