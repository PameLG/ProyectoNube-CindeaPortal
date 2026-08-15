import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { coursesService } from '../services/courses.service';
import { studentsService } from '../services/students.service';
import type { Course, Student } from '../types';

export function Dashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([coursesService.list(), studentsService.list()])
      .then(([c, s]) => {
        if (!alive) return;
        setCourses(c);
        setStudents(s);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const card = (label: string, value: number | string, to: string) => (
    <Link
      to={to}
      className="rounded-xl bg-white p-6 shadow-sm transition hover:shadow-md"
    >
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
    </Link>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Bienvenida, {user?.fullName}
        </h1>
        <p className="mt-1 text-slate-600">Resumen general de tu actividad docente.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {card('Cursos', loading ? '—' : courses.length, '/courses')}
        {card('Alumnos', loading ? '—' : students.length, '/students')}
        {card('Asistencia', loading ? '—' : '—', '/attendance')}
      </div>
    </div>
  );
}
