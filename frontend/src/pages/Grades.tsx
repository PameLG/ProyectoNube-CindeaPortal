import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { Modal } from '../components/Modal';
import { Table } from '../components/Table';
import { ErrorMessage } from '../components/ErrorMessage';
import { coursesService, type CourseStudent } from '../services/courses.service';
import { gradesService } from '../services/grades.service';
import type { Course, Grade } from '../types';

interface FormState {
  studentId: string;
  title: string;
  score: number;
  maxScore: number;
  gradedOn: string;
}

const emptyForm: FormState = {
  studentId: '',
  title: '',
  score: 0,
  maxScore: 100,
  gradedOn: new Date().toISOString().slice(0, 10),
};

export function Grades() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<string>('');
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

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
      gradesService.listGrades(courseId),
    ])
      .then(([s, g]) => {
        setStudents(s);
        setGrades(g);
      })
      .catch((e) => setError(e?.response?.data?.error ?? 'Error al cargar'));
  }, [courseId]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    setSubmitting(true);
    setError(null);
    try {
      await gradesService.createGrade(courseId, {
        studentId: form.studentId,
        title: form.title,
        score: Number(form.score),
        maxScore: Number(form.maxScore),
        weight: 1,
        gradedOn: form.gradedOn,
        assignmentId: null,
        category: null,
        notes: null,
      });
      setOpen(false);
      setForm(emptyForm);
      const g = await gradesService.listGrades(courseId);
      setGrades(g);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al crear');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (gradeId: string) => {
    if (!confirm('¿Eliminar nota?')) return;
    await gradesService.deleteGrade(gradeId);
    if (courseId) setGrades(await gradesService.listGrades(courseId));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Notas</h1>
        <div className="flex items-center gap-3">
          <Select
            label="Curso"
            name="courseId"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            options={courses.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Button onClick={() => setOpen(true)} disabled={!courseId}>
            Nueva nota
          </Button>
        </div>
      </div>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <Table
        rows={grades}
        rowKey={(g) => g.id}
        emptyMessage="Sin notas"
        columns={[
          { key: 'title', header: 'Título', render: (g) => g.title },
          {
            key: 'student',
            header: 'Alumno',
            render: (g) => students.find((s) => s.id === g.studentId)?.fullName ?? g.studentId,
          },
          {
            key: 'score',
            header: 'Nota',
            render: (g) => `${g.score} / ${g.maxScore}`,
          },
          { key: 'date', header: 'Fecha', render: (g) => g.gradedOn },
          {
            key: 'actions',
            header: '',
            render: (g) => (
              <Button variant="danger" onClick={() => onDelete(g.id)}>
                Eliminar
              </Button>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        title="Nueva nota"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="grade-form" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Crear'}
            </Button>
          </>
        }
      >
        <form id="grade-form" onSubmit={onCreate} className="space-y-3">
          <Select
            label="Alumno"
            name="studentId"
            value={form.studentId}
            onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            options={[
              { value: '', label: 'Selecciona...' },
              ...students.map((s) => ({ value: s.id, label: s.fullName })),
            ]}
            required
          />
          <Input
            label="Título"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nota"
              type="number"
              step="0.01"
              min={0}
              value={form.score}
              onChange={(e) => setForm({ ...form, score: Number(e.target.value) })}
              required
            />
            <Input
              label="Sobre"
              type="number"
              step="0.01"
              min={0.01}
              value={form.maxScore}
              onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })}
              required
            />
          </div>
          <Input
            label="Fecha"
            type="date"
            value={form.gradedOn}
            onChange={(e) => setForm({ ...form, gradedOn: e.target.value })}
            required
          />
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </form>
      </Modal>
    </div>
  );
}
