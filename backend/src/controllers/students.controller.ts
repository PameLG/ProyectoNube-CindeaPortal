import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { pool, withTransaction } from '../database/connection';
import { userQueries, toPublicUser } from '../database/queries/users';
import { studentQueries, toStudentDTO } from '../database/queries/students';
import { getTeacherId } from '../utils/scope';
import { param } from '../utils/http';
import type { AuthRequest } from '../middleware/auth.middleware';

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  studentNumber: z.string().nullable().optional(),
  gradeLevel: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  guardianName: z.string().nullable().optional(),
  guardianPhone: z.string().nullable().optional(),
});

const updateSchema = z.object({
  studentNumber: z.string().nullable().optional(),
  gradeLevel: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  guardianName: z.string().nullable().optional(),
  guardianPhone: z.string().nullable().optional(),
});

export const studentsController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const result = await studentQueries.listEnrolledInTeacherCourses(teacherId);
      res.json({ students: result.rows.map(toStudentDTO) });
    } catch (e) { next(e); }
  },

  async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const id = param(req, 'id');
      const student = await studentQueries.findById(id);
      const s = student.rows[0];
      if (!s) return res.status(404).json({ error: 'Student not found' });

      const check = await pool.query(
        `SELECT 1 FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         WHERE e.student_id = $1 AND c.teacher_id = $2 LIMIT 1`,
        [id, teacherId]
      );
      if (check.rowCount === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }
      res.json({ student: toStudentDTO(s) });
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const data = createSchema.parse(req.body);

      const exists = await userQueries.findByEmail(data.email);
      if (exists.rowCount && exists.rowCount > 0) {
        throw Object.assign(new Error('Email already registered'), { status: 409 });
      }

      const passwordHash = await bcrypt.hash(data.password, 12);

      const created = await withTransaction(async (client) => {
        const u = await client.query(
          `INSERT INTO users (email, password_hash, full_name, role)
           VALUES ($1, $2, $3, 'student')
           RETURNING *`,
          [data.email, passwordHash, data.fullName]
        );
        const s = await studentQueries.create(client, {
          userId: u.rows[0].id,
          studentNumber: data.studentNumber ?? null,
          gradeLevel: data.gradeLevel ?? null,
          birthDate: data.birthDate ?? null,
          guardianName: data.guardianName ?? null,
          guardianPhone: data.guardianPhone ?? null,
        });
        return { user: u.rows[0], student: s.rows[0] };
      });

      res.status(201).json({
        student: toStudentDTO(created.student),
        user: toPublicUser(created.user),
      });
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const id = param(req, 'id');
      const check = await pool.query(
        `SELECT 1 FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         WHERE e.student_id = $1 AND c.teacher_id = $2 LIMIT 1`,
        [id, teacherId]
      );
      if (check.rowCount === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }
      const data = updateSchema.parse(req.body);
      const result = await studentQueries.update(id, data);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Student not found' });
      res.json({ student: toStudentDTO(result.rows[0]) });
    } catch (e) { next(e); }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const id = param(req, 'id');
      const check = await pool.query(
        `SELECT 1 FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         WHERE e.student_id = $1 AND c.teacher_id = $2 LIMIT 1`,
        [id, teacherId]
      );
      if (check.rowCount === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }
      await studentQueries.delete(id);
      res.status(204).send();
    } catch (e) { next(e); }
  },
};
