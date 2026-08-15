import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import { Input, Textarea } from '../components/Input';
import { Modal } from '../components/Modal';
import { Table } from '../components/Table';
import { ErrorMessage } from '../components/ErrorMessage';
import { coursesService, type CourseStudent } from '../services/courses.service';
import { studentsService } from '../services/students.service';
import type { Course, Student } from '../types';
import { Link } from 'react-router-dom';

interface FormState {
  name: string;
  code: string;
  description: string;
  color: string;
}

const emptyForm: FormState = { name: '', code: '', description: '', color: '#3b82f6' };

export function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [enrollCourse, setEnrollCourse] = useState<Course | null>(null);
  const [enrolled, setEnrolled] = useState<CourseStudent[]>([]);
  const [available, setAvailable] = useState<Student[]>([]);

  const load = () => {
    setLoading(true);
    coursesService
      .list()
      .then(setCourses)
      .catch((e) => setError(e?.response?.data?.error ?? 'Error al cargar'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await coursesService.create({
        name: form.name,
        code: form.code,
        description: form.description || undefined,
        color: form.color,
      });
      setOpen(false);
      setForm(emptyForm);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al crear');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('¿Eliminar este curso?')) return;
    try {
      await coursesService.remove(id);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al eliminar');
    }
  };

  const openEnroll = async (course: Course) => {
    setEnrollCourse(course);
    setError(null);
    try {
      const [enrolled, all] = await Promise.all([
        coursesService.listStudents(course.id),
        studentsService.list(),
      ]);
      setEnrolled(enrolled);
      setAvailable(all.filter((s) => !enrolled.find((e) => e.id === s.id)));
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al cargar alumnos');
    }
  };

  const enroll = async (studentId: string) => {
    if (!enrollCourse) return;
    await coursesService.enroll(enrollCourse.id, studentId);
    openEnroll(enrollCourse);
  };

  const unenroll = async (studentId: string) => {
    if (!enrollCourse) return;
    await coursesService.unenroll(enrollCourse.id, studentId);
    openEnroll(enrollCourse);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Cursos</h1>
        <Button onClick={() => setOpen(true)}>Nuevo curso</Button>
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <Table
        rows={courses}
        rowKey={(c) => c.id}
        emptyMessage={loading ? 'Cargando...' : 'Sin cursos todavía'}
        columns={[
          {
            key: 'code',
            header: 'Código',
            render: (c) => <span className="font-mono text-xs">{c.code}</span>,
          },
          { key: 'name', header: 'Nombre', render: (c) => c.name },
          {
            key: 'description',
            header: 'Descripción',
            render: (c) => c.description ?? '—',
          },
          {
            key: 'actions',
            header: '',
            render: (c) => (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => openEnroll(c)}>
                  Alumnos
                </Button>
                <Link
                  to={`/courses/${c.id}`}
                  className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-200"
                >
                  Abrir
                </Link>
                <Button variant="danger" onClick={() => onDelete(c.id)}>
                  Eliminar
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        title="Nuevo curso"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="course-form" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Crear'}
            </Button>
          </>
        }
      >
        <form id="course-form" onSubmit={onCreate} className="space-y-3">
          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Código"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
          />
          <Textarea
            label="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Color"
            type="color"
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
          />
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </form>
      </Modal>

      <Modal
        open={!!enrollCourse}
        title={`Alumnos · ${enrollCourse?.name ?? ''}`}
        onClose={() => setEnrollCourse(null)}
      >
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Matriculados</h3>
            {enrolled.length === 0 ? (
              <p className="text-sm text-slate-500">Sin alumnos matriculados.</p>
            ) : (
              <ul className="space-y-1">
                {enrolled.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span>
                      {s.fullName} <span className="text-slate-500">({s.email})</span>
                    </span>
                    <Button variant="ghost" onClick={() => unenroll(s.id)}>
                      Quitar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Disponibles</h3>
            {available.length === 0 ? (
              <p className="text-sm text-slate-500">No hay alumnos disponibles.</p>
            ) : (
              <ul className="space-y-1">
                {available.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span>{s.email}</span>
                    <Button variant="secondary" onClick={() => enroll(s.id)}>
                      Matricular
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
