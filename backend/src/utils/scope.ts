import { teacherQueries } from '../database/queries/users';

export async function getTeacherId(userId: string): Promise<string> {
  const result = await teacherQueries.findByUserId(userId);
  const row = result.rows[0];
  if (!row) {
    throw Object.assign(new Error('Teacher profile not found'), { status: 403 });
  }
  return row.id;
}

export async function assertOwnsCourse(teacherId: string, courseId: string) {
  const { courseQueries } = await import('../database/queries/courses');
  const result = await courseQueries.ownsCourse(teacherId, courseId);
  if (result.rowCount === 0) {
    throw Object.assign(new Error('Course not found or not owned by teacher'), { status: 404 });
  }
}
