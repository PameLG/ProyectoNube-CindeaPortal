import { pool } from '../connection';

export interface GradeRow {
  id: string;
  course_id: string;
  student_id: string;
  assignment_id: string | null;
  title: string;
  category: string | null;
  score: string;
  max_score: string;
  weight: string;
  graded_on: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GradeDTO {
  id: string;
  courseId: string;
  studentId: string;
  assignmentId: string | null;
  title: string;
  category: string | null;
  score: number;
  maxScore: number;
  weight: number;
  gradedOn: string;
  notes: string | null;
}

export function toGradeDTO(row: GradeRow): GradeDTO {
  return {
    id: row.id,
    courseId: row.course_id,
    studentId: row.student_id,
    assignmentId: row.assignment_id,
    title: row.title,
    category: row.category,
    score: Number(row.score),
    maxScore: Number(row.max_score),
    weight: Number(row.weight),
    gradedOn: row.graded_on,
    notes: row.notes,
  };
}

export const gradeQueries = {
  listByCourse(courseId: string) {
    return pool.query<GradeRow>(
      'SELECT * FROM grades WHERE course_id = $1 ORDER BY graded_on DESC, created_at DESC',
      [courseId]
    );
  },

  listByCourseAndStudent(courseId: string, studentId: string) {
    return pool.query<GradeRow>(
      'SELECT * FROM grades WHERE course_id = $1 AND student_id = $2 ORDER BY graded_on DESC',
      [courseId, studentId]
    );
  },

  findById(id: string) {
    return pool.query<GradeRow>('SELECT * FROM grades WHERE id = $1', [id]);
  },

  async create(
    courseId: string,
    data: {
      studentId: string;
      assignmentId?: string | null;
      title: string;
      category?: string | null;
      score: number;
      maxScore: number;
      weight?: number;
      gradedOn: string;
      notes?: string | null;
    }
  ) {
    try {
      return await pool.query<GradeRow>(
        `INSERT INTO grades
           (course_id, student_id, assignment_id, title, category, score, max_score, weight, graded_on, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          courseId,
          data.studentId,
          data.assignmentId ?? null,
          data.title,
          data.category ?? null,
          data.score,
          data.maxScore,
          data.weight ?? 1,
          data.gradedOn,
          data.notes ?? null,
        ]
      );
    } catch (e: any) {
      if (e?.code === '23514') {
        throw Object.assign(new Error('Invalid grade values'), { status: 400 });
      }
      throw e;
    }
  },

  async update(
    id: string,
    data: Partial<{
      title: string;
      category: string | null;
      score: number;
      maxScore: number;
      weight: number;
      gradedOn: string;
      notes: string | null;
    }>
  ) {
    const map: Record<string, string> = {
      title: 'title',
      category: 'category',
      score: 'score',
      maxScore: 'max_score',
      weight: 'weight',
      gradedOn: 'graded_on',
      notes: 'notes',
    };
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue;
      const col = map[k];
      if (!col) continue;
      fields.push(`${col} = $${i++}`);
      values.push(v);
    }
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    try {
      return await pool.query<GradeRow>(
        `UPDATE grades SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $${i} RETURNING *`,
        values
      );
    } catch (e: any) {
      if (e?.code === '23514') {
        throw Object.assign(new Error('Invalid grade values'), { status: 400 });
      }
      throw e;
    }
  },

  delete(id: string) {
    return pool.query('DELETE FROM grades WHERE id = $1', [id]);
  },
};
