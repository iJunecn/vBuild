# vBuild UI 跳转站

用于在同一域名下提供：
- OAuth2 登录（对接 skin.ustb.world）
- 登录后访问 ComfyUI（内网 `127.0.0.1:8080`）

## 1. 安装

```bash
npm install
```

## 2. 配置环境变量

复制 `.env.example` 为 `.env`，至少修改：
- `SESSION_SECRET`
- `OAUTH_CLIENT_SECRET`

> 注意：`OAUTH_CLIENT_SECRET` 只能放在服务端环境变量，不能写进前端页面。

## 3. 启动

```bash
npm start
```

默认监听 `8000` 端口。

## 4. 路由说明

- `/`：首页（标题、副标题、登录按钮、工作流按钮）
- `/auth/login`：跳转 OAuth 授权
- `/oauth/callback`：OAuth 回调
- `/api/me`：前端获取登录态
- `/workflow/*`：登录后反代到内网 ComfyUI `127.0.0.1:8080`

## 5. 交互行为

- 未登录时：
  - 右上角显示“登录”按钮
  - “工作流”按钮为灰色，hover 提示“登录后使用”
- 登录成功后：
  - 右上角显示头像、昵称和“退出”
  - “工作流”按钮恢复可点击，跳转到 `/workflow/`

## 6. 域名保持不变

访问 ComfyUI 使用 `/workflow/` 反代路径，不会跳转到 `:8080`，浏览器地址保持你的站点域名。
