import type { PoolClient } from 'pg';
import { pool } from '../connection';

export interface StudentRow {
  id: string;
  user_id: string;
  student_number: string | null;
  grade_level: string | null;
  birth_date: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentDTO {
  id: string;
  userId: string;
  studentNumber: string | null;
  gradeLevel: string | null;
  birthDate: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
}

export function toStudentDTO(row: StudentRow): StudentDTO {
  return {
    id: row.id,
    userId: row.user_id,
    studentNumber: row.student_number,
    gradeLevel: row.grade_level,
    birthDate: row.birth_date,
    guardianName: row.guardian_name,
    guardianPhone: row.guardian_phone,
  };
}

export const studentQueries = {
  listAll() {
    return pool.query<StudentRow>(
      'SELECT * FROM students ORDER BY created_at DESC'
    );
  },

  listEnrolledInTeacherCourses(teacherId: string) {
    return pool.query<StudentRow>(
      `SELECT DISTINCT s.*
       FROM students s
       JOIN enrollments e ON e.student_id = s.id
       JOIN courses c ON c.id = e.course_id
       WHERE c.teacher_id = $1
       ORDER BY s.created_at DESC`,
      [teacherId]
    );
  },

  findById(id: string) {
    return pool.query<StudentRow>('SELECT * FROM students WHERE id = $1', [id]);
  },

  findByUserId(userId: string) {
    return pool.query<StudentRow>('SELECT * FROM students WHERE user_id = $1', [userId]);
  },

  async create(
    client: PoolClient | typeof pool,
    data: {
      userId: string;
      studentNumber?: string | null;
      gradeLevel?: string | null;
      birthDate?: string | null;
      guardianName?: string | null;
      guardianPhone?: string | null;
    }
  ) {
    try {
      return await client.query<StudentRow>(
        `INSERT INTO students (user_id, student_number, grade_level, birth_date, guardian_name, guardian_phone)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          data.userId,
          data.studentNumber ?? null,
          data.gradeLevel ?? null,
          data.birthDate ?? null,
          data.guardianName ?? null,
          data.guardianPhone ?? null,
        ]
      );
    } catch (e: any) {
      if (e?.code === '23505') {
        throw Object.assign(new Error('Student number already exists'), { status: 409 });
      }
      throw e;
    }
  },

  async update(
    id: string,
    data: Partial<{
      studentNumber: string | null;
      gradeLevel: string | null;
      birthDate: string | null;
      guardianName: string | null;
      guardianPhone: string | null;
    }>
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
      return await pool.query<StudentRow>(
        `UPDATE students SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $${i}
         RETURNING *`,
        values
      );
    } catch (e: any) {
      if (e?.code === '23505') {
        throw Object.assign(new Error('Student number already exists'), { status: 409 });
      }
      throw e;
    }
  },

  delete(id: string) {
    return pool.query('DELETE FROM students WHERE id = $1', [id]);
  },
};
