import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

// ─── In-memory rate limiter (resets on cold start, sufficient for brute-force protection) ─────
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const WINDOW_MS = 60_000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT) return true;

  entry.count++;
  return false;
}

// ─── Handler ────────────────────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting by IP
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many login attempts. Please wait 1 minute.' });
  }

  const { email, password } = req.body ?? {};

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const TURSO_URL = process.env.TURSO_URL;
  const TURSO_TOKEN = process.env.TURSO_TOKEN;
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!TURSO_URL || !TURSO_TOKEN || !JWT_SECRET) {
    console.error('[login] Missing required environment variables');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  try {
    // Query user from Turso
    const tursoRes = await fetch(`${TURSO_URL.replace('libsql://', 'https://')}/v3/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TURSO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            type: 'execute',
            stmt: {
              sql: 'SELECT id, email, name, password_hash, role FROM users WHERE email = ? LIMIT 1',
              args: [{ type: 'text', value: email.trim().toLowerCase() }],
            },
          },
          { type: 'close' },
        ],
      }),
    });

    if (!tursoRes.ok) {
      return res.status(500).json({ error: 'Database query failed.' });
    }

    const tursoData = await tursoRes.json();
    const rows = tursoData?.results?.[0]?.response?.result?.rows ?? [];

    if (rows.length === 0) {
      // Generic message — don't reveal if email exists
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const row = rows[0];
    const storedHash: string = row[3]?.value ?? '';
    const isValid = await bcrypt.compare(password, storedHash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Issue JWT
    const user = {
      sub: row[0]?.value ?? '',
      email: row[1]?.value ?? '',
      name: row[2]?.value ?? '',
      role: row[4]?.value ?? 'user',
    };

    const secret = new TextEncoder().encode(JWT_SECRET);
    const token = await new SignJWT(user)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(secret);

    // Set HttpOnly Secure cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.setHeader(
      'Set-Cookie',
      `vanguard_token=${token}; HttpOnly; Path=/; Max-Age=28800; SameSite=Strict${isProduction ? '; Secure' : ''}`
    );

    return res.status(200).json({
      user: { id: user.sub, email: user.email, name: user.name, role: user.role },
    });
  } catch (err: any) {
    console.error('[login] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
