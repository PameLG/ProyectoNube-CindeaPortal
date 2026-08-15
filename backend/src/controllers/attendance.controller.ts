import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { attendanceQueries, toAttendanceDTO } from '../database/queries/attendance';
import { courseQueries } from '../database/queries/courses';
import { getTeacherId } from '../utils/scope';
import { param, query } from '../utils/http';
import type { AuthRequest } from '../middleware/auth.middleware';

const statusEnum = z.enum(['present', 'absent', 'late', 'excused']);

const markSchema = z.object({
  studentId: z.string().uuid(),
  date: z.string(),
  status: statusEnum,
  notes: z.string().nullable().optional(),
});

const updateSchema = z.object({
  status: statusEnum.optional(),
  notes: z.string().nullable().optional(),
});

async function assertCourseOwned(teacherId: string, courseId: string) {
  const result = await courseQueries.ownsCourse(teacherId, courseId);
  if (result.rowCount === 0) {
    throw Object.assign(new Error('Course not found'), { status: 404 });
  }
}

export const attendanceController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const courseId = param(req, 'courseId');
      await assertCourseOwned(teacherId, courseId);
      const date = query(req, 'date');
      const result = await attendanceQueries.listByCourse(courseId, date);
      res.json({ attendance: result.rows.map(toAttendanceDTO) });
    } catch (e) { next(e); }
  },

  async mark(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const courseId = param(req, 'courseId');
      await assertCourseOwned(teacherId, courseId);
      const data = markSchema.parse(req.body);
      const result = await attendanceQueries.upsert(
        courseId,
        data.studentId,
        data.date,
        data.status,
        data.notes
      );
      res.status(201).json({ attendance: toAttendanceDTO(result.rows[0]) });
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const id = param(req, 'id');
      const found = await attendanceQueries.findById(id);
      const a = found.rows[0];
      if (!a) return res.status(404).json({ error: 'Attendance not found' });
      await assertCourseOwned(teacherId, a.course_id);
      const data = updateSchema.parse(req.body);
      const result = await attendanceQueries.update(id, data);
      res.json({ attendance: toAttendanceDTO(result.rows[0]) });
    } catch (e) { next(e); }
  },
};
