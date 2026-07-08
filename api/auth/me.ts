import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jwtVerify } from 'jose';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) return res.status(401).json({ user: null });

  const cookieHeader = req.headers.cookie ?? '';
  const match = cookieHeader.match(/vanguard_token=([^;]+)/);
  if (!match) return res.status(401).json({ user: null });

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(match[1], secret);
    return res.status(200).json({
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      },
    });
  } catch {
    return res.status(401).json({ user: null });
  }
}
