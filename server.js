require('dotenv').config();

const express = require('express');
const path = require('path');
const axios = require('axios');
const cookieSession = require('cookie-session');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

const PORT = Number(process.env.PORT || 8000);
const BASE_URL = process.env.BASE_URL || 'https://ui.ustb.world';
const SESSION_SECRET = process.env.SESSION_SECRET || 'replace-this-in-production';
const COOKIE_SECURE =
  process.env.COOKIE_SECURE === undefined
    ? process.env.NODE_ENV !== 'development'
    : process.env.COOKIE_SECURE === 'true';

const OAUTH = {
  clientId: process.env.OAUTH_CLIENT_ID || '8',
  clientSecret: process.env.OAUTH_CLIENT_SECRET || '',
  authorizeUrl:
    process.env.OAUTH_AUTHORIZE_URL ||
    'https://skin.ustb.world/oauth/authorize',
  tokenUrl:
    process.env.OAUTH_TOKEN_URL || 'https://skin.ustb.world/skinapi/oauth/token',
  userInfoUrl:
    process.env.OAUTH_USERINFO_URL ||
    'https://skin.ustb.world/skinapi/oauth/userinfo',
  redirectUri:
    process.env.OAUTH_REDIRECT_URI || 'https://ui.ustb.world/oauth/callback',
  scope: process.env.OAUTH_SCOPE || 'userinfo profile avatar'
};

function createState() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

app.set('trust proxy', 1);
app.use(
  cookieSession({
    name: 'vbuild_session',
    keys: [SESSION_SECRET],
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    httpOnly: true
  })
);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

if (!OAUTH.clientSecret) {
  throw new Error('Missing OAUTH_CLIENT_SECRET environment variable');
}

app.get('/auth/login', (req, res) => {
  const state = createState();
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id: OAUTH.clientId,
    redirect_uri: OAUTH.redirectUri,
    response_type: 'code',
    state,
    scope: OAUTH.scope
  });

  res.redirect(`${OAUTH.authorizeUrl}?${params.toString()}`);
});

app.get('/oauth/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect('/?error=oauth_denied');
  }

  if (!code || !state || state !== req.session.oauthState) {
    return res.redirect('/?error=oauth_state_invalid');
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(code),
      client_id: OAUTH.clientId,
      client_secret: OAUTH.clientSecret,
      redirect_uri: OAUTH.redirectUri
    });

    const tokenResp = await axios.post(OAUTH.tokenUrl, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000
    });

    const accessToken = tokenResp.data?.access_token;
    if (!accessToken) {
      return res.redirect('/?error=token_missing');
    }

    const userResp = await axios.get(OAUTH.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 15000
    });

    const payload = userResp.data || {};
    const nickname =
      payload.username ||
      payload.name ||
      payload.profile?.username ||
      '已登录用户';
    const avatar =
      payload.avatar_url ||
      payload.avatar ||
      payload.profile?.avatar_url ||
      '/default-avatar.svg';

    req.session.user = {
      id: payload.sub || payload.id || nickname,
      nickname,
      avatar
    };

    req.session.accessToken = accessToken;
    delete req.session.oauthState;

    return res.redirect('/');
  } catch (err) {
    return res.redirect('/?error=oauth_failed');
  }
});

app.post('/auth/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ authenticated: false });
  }

  return res.json({
    authenticated: true,
    user: req.session.user
  });
});

function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).send('请先登录');
  }
  return next();
}

app.use(
  '/workflow',
  requireAuth,
  createProxyMiddleware({
    target: 'http://127.0.0.1:8080',
    changeOrigin: true,
    ws: true,
    onProxyReq(proxyReq, req) {
      proxyReq.setHeader('host', '127.0.0.1:8080');

      const origin = req.headers.origin;
      if (origin) {
        proxyReq.setHeader('origin', 'http://127.0.0.1:8080');
      }

      const referer = req.headers.referer;
      if (referer) {
        proxyReq.setHeader('referer', 'http://127.0.0.1:8080/');
      }
    },
    onProxyReqWs(proxyReq) {
      proxyReq.setHeader('host', '127.0.0.1:8080');
      proxyReq.setHeader('origin', 'http://127.0.0.1:8080');
    },
    pathRewrite: {
      '^/workflow': '/'
    }
  })
);

app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`vBuild UI gateway running on ${PORT}`);
  console.log(`BASE_URL=${BASE_URL}`);
});

server.on('upgrade', (req, socket, head) => {
  if (req.url && req.url.startsWith('/workflow')) {
    return;
  }
  socket.destroy();
});
