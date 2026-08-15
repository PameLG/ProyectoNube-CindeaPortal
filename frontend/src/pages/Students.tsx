import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Table } from '../components/Table';
import { ErrorMessage } from '../components/ErrorMessage';
import { studentsService } from '../services/students.service';
import type { Student } from '../types';

interface FormState {
  fullName: string;
  email: string;
  password: string;
  studentNumber: string;
  gradeLevel: string;
  guardianName: string;
  guardianPhone: string;
}

const emptyForm: FormState = {
  fullName: '',
  email: '',
  password: '',
  studentNumber: '',
  gradeLevel: '',
  guardianName: '',
  guardianPhone: '',
};

export function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    studentsService
      .list()
      .then(setStudents)
      .catch((e) => setError(e?.response?.data?.error ?? 'Error al cargar'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await studentsService.create({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        studentNumber: form.studentNumber || undefined,
        gradeLevel: form.gradeLevel || undefined,
        guardianName: form.guardianName || undefined,
        guardianPhone: form.guardianPhone || undefined,
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
    if (!confirm('¿Eliminar este alumno?')) return;
    try {
      await studentsService.remove(id);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al eliminar');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Alumnos</h1>
        <Button onClick={() => setOpen(true)}>Nuevo alumno</Button>
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <Table
        rows={students}
        rowKey={(s) => s.id}
        emptyMessage={loading ? 'Cargando...' : 'Sin alumnos todavía'}
        columns={[
          { key: 'studentNumber', header: 'Nº', render: (s) => s.studentNumber ?? '—' },
          { key: 'fullName', header: 'Nombre', render: (s) => s.fullName ?? '—' },
          { key: 'email', header: 'Email', render: (s) => s.email ?? '—' },
          { key: 'gradeLevel', header: 'Curso', render: (s) => s.gradeLevel ?? '—' },
          {
            key: 'actions',
            header: '',
            render: (s) => (
              <Button variant="danger" onClick={() => onDelete(s.id)}>
                Eliminar
              </Button>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        title="Nuevo alumno"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="student-form" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Crear'}
            </Button>
          </>
        }
      >
        <form id="student-form" onSubmit={onCreate} className="space-y-3">
          <Input
            label="Nombre completo"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nº alumno"
              value={form.studentNumber}
              onChange={(e) => setForm({ ...form, studentNumber: e.target.value })}
            />
            <Input
              label="Curso / grupo"
              value={form.gradeLevel}
              onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tutor"
              value={form.guardianName}
              onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
            />
            <Input
              label="Teléfono tutor"
              value={form.guardianPhone}
              onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })}
            />
          </div>
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </form>
      </Modal>
    </div>
  );
}
