import { api } from './api';
import type { Student } from '../types';

export const studentsService = {
  async list(): Promise<Student[]> {
    const { data } = await api.get<{ students: Student[] }>('/students');
    return data.students;
  },
  async get(id: string): Promise<Student> {
    const { data } = await api.get<{ student: Student }>(`/students/${id}`);
    return data.student;
  },
  async create(payload: {
    email: string;
    password: string;
    fullName: string;
    studentNumber?: string;
    gradeLevel?: string;
    guardianName?: string;
    guardianPhone?: string;
  }): Promise<{ student: Student }> {
    const { data } = await api.post<{ student: Student }>('/students', payload);
    return data;
  },
  async update(id: string, payload: Partial<Student>): Promise<Student> {
    const { data } = await api.put<{ student: Student }>(`/students/${id}`, payload);
    return data.student;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/students/${id}`);
  },
};
