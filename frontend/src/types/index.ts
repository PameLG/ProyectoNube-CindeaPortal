export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Student {
  id: string;
  userId: string;
  studentNumber: string | null;
  gradeLevel: string | null;
  birthDate: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  fullName?: string;
  email?: string;
}

export interface Course {
  id: string;
  teacherId: string;
  name: string;
  code: string;
  description: string | null;
  color: string | null;
}

export interface Enrollment {
  courseId: string;
  studentId: string;
  enrolledAt: string;
}

export type AssignmentStatus = 'draft' | 'published' | 'closed';

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  category: string | null;
  dueDate: string | null;
  status: AssignmentStatus;
  maxScore: number;
}

export interface Grade {
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

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  courseId: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  notes: string | null;
}

export interface ApiError {
  error: string;
  details?: unknown;
}
