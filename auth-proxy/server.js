require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { createProxyMiddleware } = require('http-proxy-middleware');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const {
  getUserByUsername,
  createUser,
  updateUserPasswordById,
  createPasswordReset,
  findValidResetForUser,
  markResetUsed,
} = require('./db');

const app = express();
const path = require('path');

// ---- Config ----
const PORT = process.env.PORT || 4000;
const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';
const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET === 'change_this_please') {
  console.error('[FATAL] JWT_SECRET is not set or is default. Set a strong secret in auth-proxy/.env');
  process.exit(1);
}
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:4000';
const INTERNAL_TOKEN  = process.env.INTERNAL_TOKEN  || '';

// ---- Rate Limiters ----
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // max 20 attempts per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again after 15 minutes.' },
});

const forecastLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 10,                   // max 10 forecasts per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many forecast requests. Please slow down.' },
});

// ---- Middleware ----
app.use(cors({
  origin: [FRONTEND_ORIGIN, 'http://localhost:4000', 'http://127.0.0.1:4000'],
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.use(express.json({ limit: '1mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ---- Helpers (validation) ----
const isValidEmail = (v = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isStrongPassword = (pwd = '') =>
  pwd.length >= 8 && /[A-Z]/.test(pwd) && /\d/.test(pwd) && /[@$!%*?&._-]/.test(pwd);

// ========== AUTH ROUTES ==========

// SIGNUP
app.post('/signup', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const email = String(username).trim().toLowerCase();
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 chars, include uppercase, number and symbol.'
      });
    }

    const existing = await getUserByUsername(email);
    if (existing) return res.status(409).json({ error: 'Email is already registered.' });

    const user = await createUser(email, password);
    const token = jwt.sign({ sub: user.username, uid: user.id }, SECRET, { expiresIn: '1h' });
    return res.status(201).json({ token });
  } catch (e) {
    console.error('Signup failed:', e);
    return res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
});

// LOGIN
app.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const email = String(username).trim().toLowerCase();
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

    const user = await getUserByUsername(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign({ sub: user.username, uid: user.id }, SECRET, { expiresIn: '1h' });
    return res.json({ token });
  } catch (e) {
    console.error('Login failed:', e);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ---------- Password reset (safe in dev even without SMTP) ----------
let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
} else {
  console.warn('SMTP not configured. /request-reset will log codes instead of sending emails.');
}

// Request reset (send 6-digit code)
app.post('/request-reset', authLimiter, async (req, res) => {
  try {
    const { username } = req.body || {};
    const email = String(username || '').trim().toLowerCase();
    if (!isValidEmail(email)) return res.json({ ok: true, message: 'If account exists, code sent.' });

    const user = await getUserByUsername(email);
    if (!user) return res.json({ ok: true, message: 'If account exists, code sent.' });

    const code = '' + Math.floor(100000 + Math.random() * 900000);
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await createPasswordReset(user.id, codeHash, expiresAt);

    if (transporter) {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL || process.env.SMTP_USER,
        to: user.username,
        subject: 'Password Reset Code',
        text: `Your reset code is ${code}. It expires in 15 minutes.`,
      });
    } else {
      console.log(`[DEV] Reset code for ${email}: ${code}`);
    }

    return res.json({ ok: true, message: 'If account exists, code sent.' });
  } catch (e) {
    console.error('request-reset failed:', e);
    return res.json({ ok: true, message: 'If account exists, code sent.' });
  }
});

// Confirm reset (verify code & set new password)
app.post('/confirm-reset', authLimiter, async (req, res) => {
  try {
    const { username, code, new_password } = req.body || {};
    const email = String(username || '').trim().toLowerCase();
    const user = await getUserByUsername(email);
    if (!user) return res.status(400).json({ error: 'Invalid code or user' });

    const reset = await findValidResetForUser(user.id);
    if (!reset) return res.status(400).json({ error: 'Code expired or invalid' });

    const ok = await bcrypt.compare(String(code || ''), reset.code_hash);
    if (!ok) return res.status(400).json({ error: 'Invalid code' });

    if (!isStrongPassword(new_password || '')) {
      return res.status(400).json({ error: 'Weak password. Use uppercase, number and symbol.' });
    }

    await updateUserPasswordById(user.id, new_password);
    await markResetUsed(reset.id);

    return res.json({ ok: true, message: 'Password updated successfully' });
  } catch (e) {
    console.error('confirm-reset failed:', e);
    return res.status(500).json({ error: 'Reset failed. Try again.' });
  }
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../solar-forecast-backend')));

// Default route to serve solar_app.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../solar-forecast-backend/solar_app.html'));
});


// ========== AUTH GUARD FOR API ==========
function authMiddleware(req, res, next) {
  if (req.path === '/api/ping') return next();
  const authHeader = req.headers.authorization || '';
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    return res.status(401).json({ error: 'Missing or malformed token. Please login again.' });
  }
  const token = parts[1];
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please login again.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token. Please login again.', code: 'TOKEN_INVALID' });
  }
}

// ========== PROXY TO FASTAPI ==========
app.use(
  '/api',
  authMiddleware,
  forecastLimiter,
  createProxyMiddleware({
    target: BACKEND,
    changeOrigin: true,
    pathRewrite: { '^/api': '' },
    proxyTimeout: 300000,   // 5 min for training
    timeout: 300000,
    onProxyReq(proxyReq, req) {
      if (req.user) {
        proxyReq.setHeader('x-user-id', req.user.uid);
        proxyReq.setHeader('x-user-email', req.user.sub);
      }
      if (INTERNAL_TOKEN) {
        proxyReq.setHeader('x-internal-token', INTERNAL_TOKEN);
      }
    }
  })
);

// ========== START ==========
app.listen(PORT, () => {
  console.log(`Auth Proxy running at http://localhost:${PORT}`);
  console.log(`Proxying /api -> ${BACKEND}`);
  console.log(`CORS origin allowed: ${FRONTEND_ORIGIN}`);
});
