import type { PoolClient } from 'pg';
import { pool } from '../connection';

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  revoked: boolean;
  expires_at: string;
  created_at: string;
}

export const refreshTokenQueries = {
  insert(
    client: PoolClient | typeof pool,
    data: { userId: string; tokenHash: string; expiresAt: Date }
  ) {
    return client.query<RefreshTokenRow>(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.userId, data.tokenHash, data.expiresAt]
    );
  },

  findByHash(tokenHash: string) {
    return pool.query<RefreshTokenRow>(
      `SELECT * FROM refresh_tokens WHERE token_hash = $1 LIMIT 1`,
      [tokenHash]
    );
  },

  revoke(tokenHash: string) {
    return pool.query(
      `UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1`,
      [tokenHash]
    );
  },

  revokeAllForUser(userId: string) {
    return pool.query(
      `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`,
      [userId]
    );
  },
};
