import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { assignmentQueries, toAssignmentDTO } from '../database/queries/assignments';
import { gradeQueries, toGradeDTO } from '../database/queries/grades';
import { courseQueries } from '../database/queries/courses';
import { getTeacherId } from '../utils/scope';
import { param, query } from '../utils/http';
import type { AuthRequest } from '../middleware/auth.middleware';

const assignmentCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  status: z.enum(['draft', 'published', 'closed']).optional(),
  maxScore: z.number().positive().default(100),
});

const assignmentUpdateSchema = assignmentCreateSchema.partial();

const gradeCreateSchema = z
  .object({
    studentId: z.string().uuid(),
    assignmentId: z.string().uuid().nullable().optional(),
    title: z.string().min(1),
    category: z.string().nullable().optional(),
    score: z.number().min(0),
    maxScore: z.number().positive().default(100),
    weight: z.number().min(0).default(1),
    gradedOn: z.string(),
    notes: z.string().nullable().optional(),
  })
  .refine((d) => d.score <= d.maxScore, {
    message: 'score must be <= maxScore',
    path: ['score'],
  });

const gradeUpdateSchema = z
  .object({
    title: z.string().min(1).optional(),
    category: z.string().nullable().optional(),
    score: z.number().min(0).optional(),
    maxScore: z.number().positive().optional(),
    weight: z.number().min(0).optional(),
    gradedOn: z.string().optional(),
    notes: z.string().nullable().optional(),
  })
  .refine(
    (d) => d.score === undefined || d.maxScore === undefined || d.score <= d.maxScore,
    { message: 'score must be <= maxScore', path: ['score'] }
  );

async function assertCourseOwned(teacherId: string, courseId: string) {
  const result = await courseQueries.ownsCourse(teacherId, courseId);
  if (result.rowCount === 0) {
    throw Object.assign(new Error('Course not found'), { status: 404 });
  }
}

export const assignmentsController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const courseId = param(req, 'courseId');
      await assertCourseOwned(teacherId, courseId);
      const result = await assignmentQueries.listByCourse(courseId);
      res.json({ assignments: result.rows.map(toAssignmentDTO) });
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const courseId = param(req, 'courseId');
      await assertCourseOwned(teacherId, courseId);
      const data = assignmentCreateSchema.parse(req.body);
      const result = await assignmentQueries.create(courseId, data);
      res.status(201).json({ assignment: toAssignmentDTO(result.rows[0]) });
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const id = param(req, 'id');
      const found = await assignmentQueries.findById(id);
      const a = found.rows[0];
      if (!a) return res.status(404).json({ error: 'Assignment not found' });
      await assertCourseOwned(teacherId, a.course_id);
      const data = assignmentUpdateSchema.parse(req.body);
      const result = await assignmentQueries.update(id, data);
      res.json({ assignment: toAssignmentDTO(result.rows[0]) });
    } catch (e) { next(e); }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const id = param(req, 'id');
      const found = await assignmentQueries.findById(id);
      const a = found.rows[0];
      if (!a) return res.status(404).json({ error: 'Assignment not found' });
      await assertCourseOwned(teacherId, a.course_id);
      await assignmentQueries.delete(id);
      res.status(204).send();
    } catch (e) { next(e); }
  },
};

export const gradesController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const courseId = param(req, 'courseId');
      await assertCourseOwned(teacherId, courseId);
      const studentId = query(req, 'studentId');
      const result = studentId
        ? await gradeQueries.listByCourseAndStudent(courseId, studentId)
        : await gradeQueries.listByCourse(courseId);
      res.json({ grades: result.rows.map(toGradeDTO) });
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const courseId = param(req, 'courseId');
      await assertCourseOwned(teacherId, courseId);
      const data = gradeCreateSchema.parse(req.body);
      const result = await gradeQueries.create(courseId, data);
      res.status(201).json({ grade: toGradeDTO(result.rows[0]) });
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const id = param(req, 'id');
      const found = await gradeQueries.findById(id);
      const g = found.rows[0];
      if (!g) return res.status(404).json({ error: 'Grade not found' });
      await assertCourseOwned(teacherId, g.course_id);
      const data = gradeUpdateSchema.parse(req.body);
      const result = await gradeQueries.update(id, data);
      res.json({ grade: toGradeDTO(result.rows[0]) });
    } catch (e) { next(e); }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const id = param(req, 'id');
      const found = await gradeQueries.findById(id);
      const g = found.rows[0];
      if (!g) return res.status(404).json({ error: 'Grade not found' });
      await assertCourseOwned(teacherId, g.course_id);
      await gradeQueries.delete(id);
      res.status(204).send();
    } catch (e) { next(e); }
  },
};
