import type { PoolClient } from 'pg';
import { pool } from '../connection';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  full_name: string;
  role: 'admin' | 'teacher' | 'student';
  avatar_url: string | null;
  is_active: boolean;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRow['role'];
  avatarUrl: string | null;
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    avatarUrl: row.avatar_url,
  };
}

export const userQueries = {
  findByEmail(email: string) {
    return pool.query<UserRow>(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
  },

  findById(id: string) {
    return pool.query<UserRow>(
      'SELECT * FROM users WHERE id = $1 LIMIT 1',
      [id]
    );
  },

  createTeacher(
    client: PoolClient,
    data: { email: string; passwordHash: string; fullName: string }
  ) {
    return client.query<UserRow>(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'teacher')
       RETURNING *`,
      [data.email, data.passwordHash, data.fullName]
    );
  },

  create(
    email: string,
    passwordHash: string,
    fullName: string,
    role: 'admin' | 'teacher' | 'student'
  ) {
    return pool.query<UserRow>(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [email, passwordHash, fullName, role]
    );
  },
};

export const teacherQueries = {
  findByUserId(userId: string) {
    return pool.query<{ id: string; user_id: string }>(
      'SELECT id, user_id FROM teachers WHERE user_id = $1',
      [userId]
    );
  },

  create(client: PoolClient, userId: string) {
    return client.query<{ id: string; user_id: string }>(
      `INSERT INTO teachers (user_id) VALUES ($1) RETURNING id, user_id`,
      [userId]
    );
  },
};
