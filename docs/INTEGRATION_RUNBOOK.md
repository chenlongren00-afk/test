# 联调与真实环境接入记录

当前项目在没有外部凭据时也可以启动。服务端会通过 `/api/health/dependencies` 明确报告每项依赖的模式，方便替换为真实环境。

## App Expo SDK 57

移动端已升级到 Expo SDK 57（Expo `~57.0.22`、React Native `0.86.3`、Expo Router `~57.0.21`）。在 `app` 目录执行 `npm install` 后，可用以下命令确认依赖和导出结果：

```bash
npx expo-doctor
npm run typecheck
npm run build
```

当前验证结果为 18/18 项 Expo Doctor 检查通过，类型检查和 iOS/Android/Web 导出均通过。React Native 0.86.3 建议使用 Node `22.13.0` 或更高版本；Node `22.12.0` 仍可安装和构建，但 npm 会提示 engine warning。真实设备/EAS 联调前需要填入 `EXPO_PUBLIC_EAS_PROJECT_ID`，并配置 APNs/FCM 凭据。

## 启动基础设施

在项目根目录执行 `docker compose up -d postgres redis`，然后在 `server` 目录设置 `DATABASE_URL` 并执行 `npm run db:migrate`。Redis 使用 `REDIS_URL` 连接；默认连接失败时降级到内存，会话撤销仍在单进程内生效。生产环境可设置 `REDIS_REQUIRED=true`，此时 Redis 不可用会阻止服务启动。

真机调试时，手机和开发机连接同一 Wi-Fi。当前开发机 IPv4 是 `192.168.110.200`，App 的 `app/.env.local` 已配置 `EXPO_PUBLIC_API_URL=http://192.168.110.200:4242`，启动命令为 `npm run start:lan`。IP 变化时更新该文件。API 已监听 `0.0.0.0`；Windows 防火墙需要允许 Node.js/端口 `4242` 在当前网络配置下入站访问。

完整初始化顺序：

```powershell
docker compose up -d postgres redis
docker compose ps
docker compose exec redis redis-cli ping
docker compose exec postgres pg_isready -U helper -d australian_helper
cd server
$env:DATABASE_URL="postgres://helper:helper@localhost:5432/australian_helper"
npm run db:migrate
npm run build
npm run start
```

使用 `http://<电脑局域网IP>:4242/api/health` 检查手机可达性，再在 `app` 目录执行 `npm run start:lan`。`/api/health/dependencies` 会报告 PostgreSQL 和 Redis 的实际连接状态。Docker Desktop 未安装时，可以暂时不配置数据库和 Redis，服务端仍会以内存模式启动，但数据不会持久化。

## 支付（Stripe）

设置 `STRIPE_SECRET_KEY`、`STRIPE_PUBLISHABLE_KEY` 和 `STRIPE_WEBHOOK_SECRET` 后，`/api/stripe/payment-sheet`、Connect 账户链接、转账释放和 webhook 会走 Stripe SDK。没有密钥时这些接口返回可识别的 mock/pending 结果，便于前端联调。正式环境必须把 `POST /api/stripe/webhook` 暴露给 Stripe，并配置签名密钥；事件按事件 ID 做幂等处理。

## 聊天（WebSocket + REST）

聊天模块同时提供 REST 历史/发送接口和 Socket.IO `/chat` 命名空间。客户端握手可传 `auth.token` 或 `Authorization`，连接后通过 `joinTask` 加入任务房间，再用 `sendMessage` 广播消息。默认要求任务进入支付相关状态后才允许聊天；本地联调可设置 `CHAT_ALLOW_PREPAYMENT=true`（或 `CHAT_REQUIRE_PAYMENT=false`）暂时关闭支付门槛。

已验证：服务端在 `CHAT_ALLOW_PREPAYMENT=true` 下注册用户、创建任务、调用 `/api/app/tasks/:taskId/messages` 发送消息，再从 `/api/app/threads/:taskId/messages` 读取历史，返回 1 条消息；`npm run chat:smoke` 可重复执行。

## Expo Push

移动端在物理设备、用户已登录且授予通知权限时自动获取 Expo token，并调用 `POST /api/app/device-tokens` 注册。设置 `EXPO_PUSH_ENABLED=true` 后服务端通过 Expo Push API 发送；`EXPO_ACCESS_TOKEN` 用于受保护项目，`EXPO_PUBLIC_EAS_PROJECT_ID` 用于 EAS 构建。未启用时 `/api/app/notifications/test` 返回 mock 结果，不会发出网络推送。

真机调试（Expo Go）按下面步骤操作：

1. 让手机和开发电脑连接同一个 Wi-Fi。在本机查看 IPv4 地址（Windows PowerShell）：

   ```powershell
   Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike '127.*'}
   ```

2. 复制 `app/.env.lan.example` 为 `app/.env`，把 `EXPO_PUBLIC_API_URL` 改成电脑地址和 API 端口，例如 `http://192.168.110.200:4242`。也可以留空，让 Expo Go 开发清单自动推导局域网地址；显式配置更适合多网卡、VPN 或隧道场景。

3. 在 `server` 目录复制 `.env.lan.example` 为 `.env`，确认 `HOST=0.0.0.0`。启动服务端后先在手机浏览器打开 `http://电脑地址:4242/api/health`，确认返回健康状态；若无法打开，在 Windows 防火墙放行 TCP 端口 4242。

4. 在 `app` 目录执行 `npm run start:lan`，用 Expo Go 扫描终端二维码。修改 `.env` 后需要停止并重新启动 Expo，以便重新注入 `EXPO_PUBLIC_*` 变量。

不要把 API 地址写成手机上的 `localhost`，那会指向手机本身。Socket.IO 聊天也使用同一 API 主机和端口。

## 冒烟验证

服务端启动后执行 `npm run smoke`。该脚本会检查健康状态和依赖诊断，读取公开任务，注册一次临时用户并创建一个临时任务，同时验证 Stripe mock 幂等和 webhook 去重。它不需要 PostgreSQL、Redis、Stripe 或 Expo 凭据。若要验证完整聊天 REST 链路，设置 `CHAT_ALLOW_PREPAYMENT=true`（或 `CHAT_REQUIRE_PAYMENT=false`）后执行 `npm run chat:smoke`。推送 dry-run 可通过已登录用户调用 `POST /api/app/notifications/test` 验证。

## 上线前替换清单

- 将 `DataStore`、`SessionStore` 和聊天/推送内存集合替换为 PostgreSQL/Redis repository。
- 配置 Stripe webhook 端点、Connect 平台账户与生产幂等存储。
- 使用 EAS 项目 ID 构建 iOS/Android，并在真实设备上验证 APNs/FCM 权限及 token。
- 为 Socket.IO 配置多实例 Redis adapter，并限制 CORS、速率和消息大小。
- 运行依赖诊断、冒烟测试及完整端到端支付沙盒测试后再切换生产密钥。

## 原项目 UI 迁移记录

已确认 `E:\myProject\Helper\android-app` 使用 Expo Router + React Native，与当前 `app` 项目是同一移动端技术栈。当前项目已完整迁移原项目的 `app/`、`src/` 和 `assets/`，包括底部五个主导航、任务详情、聊天、支付、提现、通知、设置、资料和帮助页面。入口 `app/index.tsx` 重定向到 `/(tabs)`，Android 和 iOS 共用这套页面实现。

迁移后删除了新项目简化的 `login.tsx`、`post.tsx`、`tasks.tsx`，避免路由覆盖原页面。页面统一通过 `src/state/app-store.tsx` 与 `src/api/client.ts` 使用同一状态/API 客户端。

为保证旧页面在本地真机联调时可点击，Nest API 已提供资料更新、手机号验证（开发码 `123456`）、身份验证 mock、任务删除与状态流转、报价接受/反报价、评价、通知已读、媒体举报、Google Play Pro、提现刷新及支付 checkout mock 兼容路由。真实短信、身份服务、Stripe、PostgreSQL、Redis、Expo Push 仍由环境变量启用，未配置时接口明确返回 mock 或 pending 状态。
