// Shared helper: verify JWT from HttpOnly cookie
// Used by all protected API routes

import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

export interface JWTPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
}

export async function verifySession(req: Request): Promise<JWTPayload | null> {
  if (!JWT_SECRET) return null;

  // Extract token from cookie header
  const cookieHeader = (req as any).headers?.cookie || '';
  const match = cookieHeader.match(/vanguard_token=([^;]+)/);
  if (!match) return null;

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(match[1], secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
