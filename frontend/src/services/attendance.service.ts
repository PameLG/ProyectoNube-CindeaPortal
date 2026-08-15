import { api } from './api';
import type { AttendanceRecord, AttendanceStatus } from '../types';

export const attendanceService = {
  async list(
    courseId: string,
    date?: string
  ): Promise<AttendanceRecord[]> {
    const { data } = await api.get<{ attendance: AttendanceRecord[] }>(
      `/courses/${courseId}/attendance`,
      { params: date ? { date } : undefined }
    );
    return data.attendance;
  },
  async mark(
    courseId: string,
    payload: {
      studentId: string;
      date: string;
      status: AttendanceStatus;
      notes?: string;
    }
  ): Promise<AttendanceRecord> {
    const { data } = await api.post<{ attendance: AttendanceRecord }>(
      `/courses/${courseId}/attendance`,
      payload
    );
    return data.attendance;
  },
  async update(
    id: string,
    payload: { status?: AttendanceStatus; notes?: string | null }
  ): Promise<AttendanceRecord> {
    const { data } = await api.put<{ attendance: AttendanceRecord }>(
      `/attendance/${id}`,
      payload
    );
    return data.attendance;
  },
};
