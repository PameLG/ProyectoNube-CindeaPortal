import { pool } from '../connection';

export interface AssignmentRow {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  category: string | null;
  due_date: string | null;
  status: 'draft' | 'published' | 'closed';
  max_score: string;
  created_at: string;
  updated_at: string;
}

export interface AssignmentDTO {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  category: string | null;
  dueDate: string | null;
  status: AssignmentRow['status'];
  maxScore: number;
}

export function toAssignmentDTO(row: AssignmentRow): AssignmentDTO {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description,
    category: row.category,
    dueDate: row.due_date,
    status: row.status,
    maxScore: Number(row.max_score),
  };
}

export const assignmentQueries = {
  listByCourse(courseId: string) {
    return pool.query<AssignmentRow>(
      'SELECT * FROM assignments WHERE course_id = $1 ORDER BY due_date DESC NULLS LAST, created_at DESC',
      [courseId]
    );
  },

  findById(id: string) {
    return pool.query<AssignmentRow>('SELECT * FROM assignments WHERE id = $1', [id]);
  },

  async create(
    courseId: string,
    data: { title: string; description?: string | null; category?: string | null; dueDate?: string | null; status?: 'draft' | 'published' | 'closed'; maxScore: number }
  ) {
    return pool.query<AssignmentRow>(
      `INSERT INTO assignments (course_id, title, description, category, due_date, status, max_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        courseId,
        data.title,
        data.description ?? null,
        data.category ?? null,
        data.dueDate ?? null,
        data.status ?? 'draft',
        data.maxScore,
      ]
    );
  },

  async update(
    id: string,
    data: Partial<{ title: string; description: string | null; category: string | null; dueDate: string | null; status: 'draft' | 'published' | 'closed'; maxScore: number }>
  ) {
    const map: Record<string, string> = {
      title: 'title',
      description: 'description',
      category: 'category',
      dueDate: 'due_date',
      status: 'status',
      maxScore: 'max_score',
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
    return pool.query<AssignmentRow>(
      `UPDATE assignments SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${i} RETURNING *`,
      values
    );
  },

  delete(id: string) {
    return pool.query('DELETE FROM assignments WHERE id = $1', [id]);
  },
};
