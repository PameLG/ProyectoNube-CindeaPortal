import type { PoolClient } from 'pg';
import { pool } from '../connection';

export interface CourseRow {
  id: string;
  teacher_id: string;
  name: string;
  code: string;
  description: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseDTO {
  id: string;
  teacherId: string;
  name: string;
  code: string;
  description: string | null;
  color: string | null;
}

export function toCourseDTO(row: CourseRow): CourseDTO {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    name: row.name,
    code: row.code,
    description: row.description,
    color: row.color,
  };
}

export const courseQueries = {
  listByTeacher(teacherId: string) {
    return pool.query<CourseRow>(
      'SELECT * FROM courses WHERE teacher_id = $1 ORDER BY created_at DESC',
      [teacherId]
    );
  },

  findById(id: string) {
    return pool.query<CourseRow>('SELECT * FROM courses WHERE id = $1', [id]);
  },

  findByCode(code: string) {
    return pool.query<CourseRow>('SELECT * FROM courses WHERE code = $1', [code]);
  },

  async create(teacherId: string, data: { name: string; code: string; description?: string | null; color?: string | null }) {
    try {
      return await pool.query<CourseRow>(
        `INSERT INTO courses (teacher_id, name, code, description, color)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [teacherId, data.name, data.code, data.description ?? null, data.color ?? null]
      );
    } catch (e: any) {
      if (e?.code === '23505') {
        throw Object.assign(new Error('Course code already exists'), { status: 409 });
      }
      throw e;
    }
  },

  async update(
    id: string,
    data: Partial<{ name: string; code: string; description: string | null; color: string | null }>
  ) {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue;
      fields.push(`${k} = $${i++}`);
      values.push(v);
    }
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    try {
      return await pool.query<CourseRow>(
        `UPDATE courses SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $${i}
         RETURNING *`,
        values
      );
    } catch (e: any) {
      if (e?.code === '23505') {
        throw Object.assign(new Error('Course code already exists'), { status: 409 });
      }
      throw e;
    }
  },

  delete(id: string) {
    return pool.query('DELETE FROM courses WHERE id = $1', [id]);
  },

  ownsCourse(teacherId: string, courseId: string) {
    return pool.query<{ id: string }>(
      'SELECT id FROM courses WHERE id = $1 AND teacher_id = $2',
      [courseId, teacherId]
    );
  },
};
