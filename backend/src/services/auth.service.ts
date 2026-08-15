import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { pool, withTransaction } from '../database/connection';
import {
  userQueries,
  teacherQueries,
  toPublicUser,
  type UserRow,
} from '../database/queries/users';
import { refreshTokenQueries } from '../database/queries/refresh-tokens';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRow['role'];
}

function parseExpiry(value: string): number {
  // "15m" -> 900000, "7d" -> 604800000, "1h" -> 3600000
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 60 * 60 * 1000;
  const n = Number(match[1]);
  const unit = match[2];
  const factor = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit as 's' | 'm' | 'h' | 'd'];
  return n * (factor ?? 60_000);
}

export function signAccessToken(user: AccessTokenPayload): string {
  const opts: SignOptions = { expiresIn: env.jwt.expiresIn as any };
  return jwt.sign(
    { sub: user.sub, email: user.email, role: user.role },
    env.jwt.secret,
    opts
  );
}

function generateRefreshTokenValue(): string {
  return crypto.randomBytes(48).toString('base64url');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export async function issueTokens(user: AccessTokenPayload): Promise<TokenPair> {
  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshTokenValue();
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + parseExpiry(env.jwt.refreshExpiresIn));

  await refreshTokenQueries.insert(pool, {
    userId: user.sub,
    tokenHash,
    expiresAt,
  });

  return { accessToken, refreshToken };
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
}

export async function registerTeacher(input: RegisterInput) {
  const exists = await userQueries.findByEmail(input.email);
  if (exists.rowCount && exists.rowCount > 0) {
    throw Object.assign(new Error('Email already registered'), { status: 409 });
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await withTransaction(async (client) => {
    const inserted = await userQueries.createTeacher(client, {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
    });
    await teacherQueries.create(client, inserted.rows[0].id);
    return inserted.rows[0];
  });

  const tokens = await issueTokens({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return { user: toPublicUser(user), ...tokens };
}

export async function loginWithPassword(email: string, password: string) {
  const result = await userQueries.findByEmail(email);
  const user = result.rows[0];
  if (!user || !user.is_active || !user.password_hash) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }
  const tokens = await issueTokens({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  return { user: toPublicUser(user), ...tokens };
}

export async function loginWithMicrosoft(input: {
  providerId: string;
  email: string;
  name: string;
}) {
  const existing = await userQueries.findByEmail(input.email);
  let user = existing.rows[0];

  if (!user) {
    const created = await userQueries.create(input.email, '', input.name, 'teacher');
    user = created.rows[0];
  }

  const tokens = await issueTokens({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  return { user: toPublicUser(user), ...tokens };
}

export async function loginWithGoogle(input: {
  providerId: string;
  email: string;
  name: string;
}) {
  const existing = await userQueries.findByEmail(input.email);
  let user = existing.rows[0];

  if (!user) {
    const created = await userQueries.create(input.email, '', input.name, 'teacher');
    user = created.rows[0];
  }

  const tokens = await issueTokens({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  return { user: toPublicUser(user), ...tokens };
}

export async function rotateRefreshToken(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const result = await refreshTokenQueries.findByHash(tokenHash);
  const row = result.rows[0];
  if (!row || row.revoked || new Date(row.expires_at).getTime() < Date.now()) {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
  }
  const userResult = await userQueries.findById(row.user_id);
  const user = userResult.rows[0];
  if (!user || !user.is_active) {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
  }
  // Rotate: revocar el actual y emitir uno nuevo
  await refreshTokenQueries.revoke(tokenHash);
  const tokens = await issueTokens({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  return { user: toPublicUser(user), ...tokens };
}

export async function logoutWithRefreshToken(refreshToken: string) {
  if (!refreshToken) return;
  await refreshTokenQueries.revoke(hashToken(refreshToken));
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.jwt.secret) as AccessTokenPayload;
  return { sub: decoded.sub, email: decoded.email, role: decoded.role };
}
