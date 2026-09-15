# Australian Helper Plus

可运行的重构基线：NestJS 服务端、React Native + Expo App、React/Vite 管理端和官网。工程保留旧系统使用的 `/api/auth/*`、`/api/app/*`、`/api/stripe/*` 路径，便于按模块逐步切换 Route Owner。

## 目录

- `server`：NestJS 模块化单体，默认端口 `4242`
- `app`：Expo Router 移动端
- `web/admin`：运营管理端，默认端口 `5173`
- `web/site`：官网，默认端口 `5174`

## 本地启动

1. `docker compose up -d postgres redis`（可选；服务端无数据库时使用内存联调）
2. 分别进入 `server`、`app`、`web/admin`、`web/site` 执行 `npm install`
3. 服务端执行 `npm run build && npm run start`；健康检查：`http://localhost:4242/api/health`
4. Web 端执行 `npm run dev`；App 执行 `npx expo start`

### Expo Go 真机调试（局域网）

当前开发机局域网地址为 `192.168.110.200`。App 已提供 `app/.env.local`，其中 `EXPO_PUBLIC_API_URL` 指向 `http://192.168.110.200:4242`。如果电脑换了 Wi-Fi 或 IP，请同步修改该文件。手机和电脑必须连接同一个 Wi-Fi，服务端监听 `0.0.0.0:4242`。

在 `app` 目录运行 `npm run start:lan`，终端会显示二维码；手机 Expo Go 扫码打开项目。若无法访问 API，先在电脑浏览器打开 `http://192.168.110.200:4242/api/health`，并允许 Node.js 通过 Windows 防火墙当前网络配置的 TCP 端口 `4242`（当前网络若显示为 Public，请为 Public 配置放行，或将网络改为 Private）。

### PostgreSQL 与 Redis 初始化

安装并启动 Docker Desktop 后，在项目根目录执行：

```powershell
docker compose up -d postgres redis
docker compose ps
docker compose exec redis redis-cli ping
docker compose exec postgres pg_isready -U helper -d australian_helper
```

首次初始化数据库（或表结构升级）在 `server` 目录执行：

```powershell
$env:DATABASE_URL="postgres://helper:helper@localhost:5432/australian_helper"
npm run db:migrate
```

然后复制 `server/.env.lan.example` 为 `server/.env.local`（Nest 会自动读取），启动 API：

```powershell
npm run build
npm run start
```

确认数据库和 Redis 已连接：`http://192.168.110.200:4242/api/health/dependencies`。其中 `database.mode` 应为 `migration-ready`，`redis.available` 应为 `true`。停止基础设施使用 `docker compose stop`，删除本地数据使用 `docker compose down -v`。

服务端生产环境请复制 `server/.env.example`，设置随机 `JWT_SECRET`、`DATABASE_URL`、`REDIS_URL`、Stripe 和推送凭据，并执行 `server/database/schema.sql`。

真实环境联调步骤、支付 webhook、Socket.IO 聊天、Expo Push 和上线前替换项见 [`docs/INTEGRATION_RUNBOOK.md`](docs/INTEGRATION_RUNBOOK.md)。没有外部凭据时进入 `server` 目录运行 `npm run smoke`，脚本会验证健康检查、依赖诊断、注册、建任务、Stripe mock 幂等和 webhook 去重。
