import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader(
    'Set-Cookie',
    'vanguard_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict; Secure'
  );
  return res.status(200).json({ success: true });
}
