import { pool } from '../connection';

export interface AttendanceRow {
  id: string;
  course_id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceDTO {
  id: string;
  courseId: string;
  studentId: string;
  date: string;
  status: AttendanceRow['status'];
  notes: string | null;
}

export function toAttendanceDTO(row: AttendanceRow): AttendanceDTO {
  return {
    id: row.id,
    courseId: row.course_id,
    studentId: row.student_id,
    date: row.date,
    status: row.status,
    notes: row.notes,
  };
}

export const attendanceQueries = {
  listByCourse(courseId: string, date?: string) {
    if (date) {
      return pool.query<AttendanceRow>(
        'SELECT * FROM attendance WHERE course_id = $1 AND date = $2 ORDER BY student_id',
        [courseId, date]
      );
    }
    return pool.query<AttendanceRow>(
      'SELECT * FROM attendance WHERE course_id = $1 ORDER BY date DESC, student_id',
      [courseId]
    );
  },

  listByStudent(studentId: string) {
    return pool.query<AttendanceRow>(
      'SELECT * FROM attendance WHERE student_id = $1 ORDER BY date DESC',
      [studentId]
    );
  },

  findById(id: string) {
    return pool.query<AttendanceRow>('SELECT * FROM attendance WHERE id = $1', [id]);
  },

  async upsert(
    courseId: string,
    studentId: string,
    date: string,
    status: AttendanceRow['status'],
    notes?: string | null
  ) {
    return pool.query<AttendanceRow>(
      `INSERT INTO attendance (course_id, student_id, date, status, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (course_id, student_id, date)
       DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = NOW()
       RETURNING *`,
      [courseId, studentId, date, status, notes ?? null]
    );
  },

  async update(id: string, data: { status?: AttendanceRow['status']; notes?: string | null }) {
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
    return pool.query<AttendanceRow>(
      `UPDATE attendance SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${i} RETURNING *`,
      values
    );
  },

  delete(id: string) {
    return pool.query('DELETE FROM attendance WHERE id = $1', [id]);
  },
};
