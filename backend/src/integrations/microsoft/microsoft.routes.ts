import { Router } from 'express';
import {
  getMicrosoftAuthUrl,
  getMicrosoftUser,
  microsoftConfigured,
} from './microsoft.service';
import { loginWithMicrosoft } from '../../services/auth.service';

export const microsoftRouter = Router();

function frontendErrorUrl(error: string): string {
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  const params = new URLSearchParams({ error, provider: 'microsoft' });
  return `${frontendUrl}/login?${params.toString()}`;
}

microsoftRouter.get('/login', async (_req, res, next) => {
  try {
    if (!microsoftConfigured) {
      return res.status(503).json({ error: 'Microsoft login is not configured' });
    }
    const url = await getMicrosoftAuthUrl();
    res.redirect(url);
  } catch (error) {
    next(error);
  }
});

microsoftRouter.get('/callback', async (req, res, next) => {
  try {
    const code = req.query.code;
    if (typeof code !== 'string' || !code) {
      return res.redirect(frontendErrorUrl('missing_code'));
    }
    if (!microsoftConfigured) {
      return res.redirect(frontendErrorUrl('not_configured'));
    }
    const microsoftUser = await getMicrosoftUser(code);
    const result = await loginWithMicrosoft({
      providerId: microsoftUser.providerId,
      email: microsoftUser.email,
      name: microsoftUser.name,
    });
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    return res.redirect(`${frontendUrl}/auth/microsoft/callback?${params.toString()}`);
  } catch (error: any) {
    const message = error?.message ?? 'oauth_failed';
    return res.redirect(frontendErrorUrl(message));
  }
});
