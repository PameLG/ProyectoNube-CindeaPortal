import { Router } from 'express';
import { getGoogleAuthUrl, getGoogleUser, googleConfigured } from './google.service';
import { loginWithGoogle } from '../../services/auth.service';

export const googleRouter = Router();

function frontendErrorUrl(error: string): string {
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  const params = new URLSearchParams({ error, provider: 'google' });
  return `${frontendUrl}/login?${params.toString()}`;
}

googleRouter.get('/login', async (_req, res, next) => {
  try {
    if (!googleConfigured) {
      return res.status(503).json({ error: 'Google login is not configured' });
    }
    const url = await getGoogleAuthUrl();
    res.redirect(url);
  } catch (error) {
    next(error);
  }
});

googleRouter.get('/callback', async (req, res, next) => {
  try {
    const code = req.query.code;
    if (typeof code !== 'string' || !code) {
      return res.redirect(frontendErrorUrl('missing_code'));
    }
    if (!googleConfigured) {
      return res.redirect(frontendErrorUrl('not_configured'));
    }
    const googleUser = await getGoogleUser(code);
    const result = await loginWithGoogle({
      providerId: googleUser.providerId,
      email: googleUser.email,
      name: googleUser.name,
    });
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    return res.redirect(`${frontendUrl}/auth/google/callback?${params.toString()}`);
  } catch (error: any) {
    const message = error?.message ?? 'oauth_failed';
    return res.redirect(frontendErrorUrl(message));
  }
});
