import { pool } from '../connection';

export const enrollmentQueries = {
  enroll(courseId: string, studentId: string) {
    return pool.query(
      `INSERT INTO enrollments (course_id, student_id)
       VALUES ($1, $2)
       ON CONFLICT (course_id, student_id) DO NOTHING`,
      [courseId, studentId]
    );
  },

  unenroll(courseId: string, studentId: string) {
    return pool.query(
      'DELETE FROM enrollments WHERE course_id = $1 AND student_id = $2',
      [courseId, studentId]
    );
  },

  listStudentsInCourse(courseId: string) {
    return pool.query(
      `SELECT s.id, s.user_id, s.student_number, s.grade_level, u.full_name, u.email
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       JOIN users u ON u.id = s.user_id
       WHERE e.course_id = $1
       ORDER BY u.full_name`,
      [courseId]
    );
  },
};
