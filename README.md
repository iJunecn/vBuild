# vBuild UI 跳转站

用于在同一域名下提供：
- OAuth2 登录（对接 skin.ustb.world）
- 未登录拦截，登录后反代上游应用（默认 `122.225.39.158:31204`）

## 1. 安装

```bash
npm install
```

## 2. 配置环境变量

复制 `.env.example` 为 `.env`，至少修改：
- `SESSION_SECRET`
- `OAUTH_CLIENT_SECRET`
- `UPSTREAM_URL`（例如 `http://122.225.39.158:31204`）

> 注意：`OAUTH_CLIENT_SECRET` 只能放在服务端环境变量，不能写进前端页面。

## 3. 启动

```bash
npm start
```

默认监听 `18000` 端口。

## 4. 路由说明

- `/gateway`：网关登录页
- `/_gateway/*`：网关静态资源
- `/auth/login`：跳转 OAuth 授权
- `/oauth/callback`：OAuth 回调
- `/api/me`：前端获取登录态
- `/healthz`：健康检查
- 其余所有路径：登录后直接反代到 `UPSTREAM_URL`

## 5. 交互行为

- 未登录时：
  - 访问业务路径会被引导到 `/gateway`
  - 登录页显示“登录”按钮，“进入 ComfyUI”不可用
- 登录成功后：
  - 右上角显示头像、昵称和“退出”
  - 可从登录页点击“进入 ComfyUI”，或直接访问原业务路径

## 6. 域名保持不变

由 18000 端口网关统一接管登录与反代，浏览器地址保持外网域名，不暴露内网 `:8080`。

## 7. 白名单网关场景

当 ComfyUI 仅对白名单公网服务器开放时，用户始终访问公网 UI 域名，所有业务请求（含 WebSocket）由网关服务器转发到 `UPSTREAM_URL`。这样最终用户无需进入白名单，也不会直接访问内网服务地址。
