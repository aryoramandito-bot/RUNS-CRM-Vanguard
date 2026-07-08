/**
 * /api/turso.ts
 * 
 * Authenticated Turso database proxy.
 * - Validates JWT from HttpOnly cookie before forwarding any query to Turso.
 * - Turso credentials NEVER leave the server environment.
 * - Client sends { sql, args } — proxy signs and forwards to Turso.
 * - Returns 401 if JWT is missing or invalid.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jwtVerify } from 'jose';

async function verifyJWT(cookieHeader: string): Promise<boolean> {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) return false;

  const match = cookieHeader.match(/vanguard_token=([^;]+)/);
  if (!match) return false;

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    await jwtVerify(match[1], secret);
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Auth Guard ──────────────────────────────────────────────────────────────
  const cookieHeader = req.headers.cookie ?? '';
  const isAuthed = await verifyJWT(cookieHeader);
  if (!isAuthed) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  // ── Forward to Turso ───────────────────────────────────────────────────────
  const TURSO_URL = process.env.TURSO_URL;
  const TURSO_TOKEN = process.env.TURSO_TOKEN;

  if (!TURSO_URL || !TURSO_TOKEN) {
    return res.status(500).json({ error: 'Database not configured on server.' });
  }

  // The body is the exact pipeline payload that @libsql/client would send
  // (array of { type: 'execute', stmt } or { type: 'close' })
  const body = req.body;

  if (!body || !Array.isArray(body.requests)) {
    return res.status(400).json({ error: 'Invalid request body. Expected { requests: [...] }.' });
  }

  try {
    const tursoEndpoint = `${TURSO_URL.replace('libsql://', 'https://')}/v3/pipeline`;

    const tursoRes = await fetch(tursoEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TURSO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await tursoRes.json();

    if (!tursoRes.ok) {
      return res.status(tursoRes.status).json({ error: 'Database error', details: data });
    }

    return res.status(200).json(data);
  } catch (err: any) {
    console.error('[turso-proxy] Error:', err.message);
    return res.status(500).json({ error: 'Failed to connect to database.' });
  }
}
