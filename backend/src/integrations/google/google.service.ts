import { google } from 'googleapis';
import { env } from '../../config/env';

const configured =
  Boolean(env.google.clientId) && Boolean(env.google.clientSecret) && Boolean(env.google.redirectUri);

export const googleConfigured = configured;

export const oauth2Client = configured
  ? new google.auth.OAuth2(
      env.google.clientId,
      env.google.clientSecret,
      env.google.redirectUri
    )
  : null;

const scopes = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.file',
];

export async function getGoogleAuthUrl(): Promise<string> {
  if (!oauth2Client) {
    throw Object.assign(new Error('Google OAuth is not configured'), { status: 503 });
  }
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
  });
}

export async function getGoogleUser(code: string) {
  if (!oauth2Client) {
    throw Object.assign(new Error('Google OAuth is not configured'), { status: 503 });
  }
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const profile = await oauth2.userinfo.get();
  const email = profile.data.email;
  if (!email) {
    throw new Error('Google account email not available');
  }
  return {
    providerId: profile.data.id ?? email,
    email,
    name: profile.data.name ?? email,
  };
}
