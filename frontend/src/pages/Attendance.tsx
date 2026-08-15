import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { Table } from '../components/Table';
import { ErrorMessage } from '../components/ErrorMessage';
import { coursesService, type CourseStudent } from '../services/courses.service';
import { attendanceService } from '../services/attendance.service';
import type { AttendanceRecord, AttendanceStatus, Course } from '../types';

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'present', label: 'Presente' },
  { value: 'absent', label: 'Ausente' },
  { value: 'late', label: 'Tarde' },
  { value: 'excused', label: 'Justificado' },
];

const today = () => new Date().toISOString().slice(0, 10);

export function Attendance() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<string>('');
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [date, setDate] = useState<string>(today());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    coursesService.list().then((cs) => {
      setCourses(cs);
      if (cs[0]) setCourseId(cs[0].id);
    });
  }, []);

  useEffect(() => {
    if (!courseId) return;
    Promise.all([
      coursesService.listStudents(courseId),
      attendanceService.list(courseId, date),
    ])
      .then(([s, r]) => {
        setStudents(s);
        setRecords(r);
      })
      .catch((e) => setError(e?.response?.data?.error ?? 'Error al cargar'));
  }, [courseId, date]);

  const recordFor = (studentId: string) =>
    records.find((r) => r.studentId === studentId);

  const setStatus = async (studentId: string, status: AttendanceStatus) => {
    if (!courseId) return;
    setSaving(studentId);
    try {
      const r = await attendanceService.mark(courseId, {
        studentId,
        date,
        status,
      });
      setRecords((prev) => {
        const idx = prev.findIndex((p) => p.id === r.id);
        if (idx === -1) return [...prev, r];
        const copy = [...prev];
        copy[idx] = r;
        return copy;
      });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al guardar');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Asistencia</h1>
        <div className="flex items-end gap-3">
          <Select
            label="Curso"
            name="courseId"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            options={courses.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Input
            label="Fecha"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <Table
        rows={students}
        rowKey={(s) => s.id}
        emptyMessage="Sin alumnos matriculados"
        columns={[
          { key: 'name', header: 'Alumno', render: (s) => s.fullName },
          {
            key: 'current',
            header: 'Estado actual',
            render: (s) => {
              const r = recordFor(s.id);
              if (!r) return <span className="text-slate-400">Sin registrar</span>;
              const label = STATUS_OPTIONS.find((o) => o.value === r.status)?.label;
              return <span className="font-medium">{label}</span>;
            },
          },
          {
            key: 'actions',
            header: 'Marcar',
            render: (s) => (
              <div className="flex flex-wrap gap-1">
                {STATUS_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={recordFor(s.id)?.status === opt.value ? 'primary' : 'secondary'}
                    disabled={saving === s.id}
                    onClick={() => setStatus(s.id, opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
