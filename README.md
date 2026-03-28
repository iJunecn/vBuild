# vBuild UI 跳转站

用于在同一域名下提供：
- OAuth2 登录（对接 skin.ustb.world）
- 未登录拦截，登录后反代内网应用（默认 `127.0.0.1:8080`）

## 1. 安装

```bash
npm install
```

## 2. 配置环境变量

复制 `.env.example` 为 `.env`，至少修改：
- `SESSION_SECRET`
- `OAUTH_CLIENT_SECRET`
- `UPSTREAM_URL`（例如 `http://127.0.0.1:8080`）

> 注意：`OAUTH_CLIENT_SECRET` 只能放在服务端环境变量，不能写进前端页面。

## 3. 启动

```bash
npm start
```

默认监听 `8000` 端口。

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
  - 登录页显示“登录”按钮，“进入应用”不可用
- 登录成功后：
  - 右上角显示头像、昵称和“退出”
  - 可从登录页点击“进入应用”，或直接访问原业务路径

## 6. 域名保持不变

由 8000 端口网关统一接管登录与反代，浏览器地址保持外网域名，不暴露内网 `:8080`。
