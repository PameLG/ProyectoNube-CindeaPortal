import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input, Textarea } from '../components/Input';
import { Modal } from '../components/Modal';
import { ErrorMessage } from '../components/ErrorMessage';
import { coursesService, type CourseStudent } from '../services/courses.service';
import { studentsService } from '../services/students.service';
import type { Course, Student } from '../types';
import {
  Plus,
  CalendarCheck,
  GraduationCap,
  Users,
  Trash2,
  Building2,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';

interface FormState {
  name: string;
  code: string;
  description: string;
  color: string;
}

const emptyForm: FormState = { name: '', code: '', description: '', color: '#2563eb' };

export function Courses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseStudentCounts, setCourseStudentCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [enrollCourse, setEnrollCourse] = useState<Course | null>(null);
  const [enrolled, setEnrolled] = useState<CourseStudent[]>([]);
  const [available, setAvailable] = useState<Student[]>([]);

  const load = async () => {
    try {
      const cs = await coursesService.list();
      setCourses(cs);

      // Cargar conteo de estudiantes por grupo
      const counts: Record<string, number> = {};
      await Promise.all(
        cs.map(async (c) => {
          try {
            const list = await coursesService.listStudents(c.id);
            counts[c.id] = list.length;
          } catch {
            counts[c.id] = 0;
          }
        })
      );
      setCourseStudentCounts(counts);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al cargar grupos');
    }
  };

  useEffect(() => {
    load();
  }, []);

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
      setSuccessMsg('¡Nuevo grupo / sede creado con éxito en la nube!');
      load();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al crear el grupo');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string, name: string) => {
    if (!confirm(`¿Seguro que deseas eliminar el grupo "${name}"? Se desvincularán sus listas asociadas.`)) return;
    try {
      await coursesService.remove(id);
      setSuccessMsg(`Grupo "${name}" eliminado correctamente.`);
      load();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al eliminar el grupo');
    }
  };

  const isSameLevel = (course: Course, studentGradeLevel?: string | null): boolean => {
    if (!studentGradeLevel) return false;
    const courseStr = `${course.name} ${course.code || ''} ${course.description || ''}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const studStr = studentGradeLevel.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 11° Año / Bachillerato
    const courseIs11 = courseStr.includes('11') || courseStr.includes('bachillerato') || courseStr.includes('modulo v') || courseStr.includes('modulo 5');
    const studIs11 = studStr.includes('11') || studStr.includes('bachillerato') || studStr.includes('modulo v') || studStr.includes('modulo 5');
    if (courseIs11 || studIs11) return courseIs11 && studIs11;

    // 10° Año / Diversificada / Modulo IV
    const courseIs10 = courseStr.includes('10') || courseStr.includes('modulo iv') || courseStr.includes('modulo 4') || courseStr.includes('diversificada');
    const studIs10 = studStr.includes('10') || studStr.includes('modulo iv') || studStr.includes('modulo 4') || studStr.includes('diversificada');
    if (courseIs10 || studIs10) return courseIs10 && studIs10;

    // 9° Año / Modulo III
    const courseIs9 = courseStr.includes('9') || courseStr.includes('modulo iii') || courseStr.includes('modulo 3') || courseStr.includes('tercer ciclo');
    const studIs9 = studStr.includes('9') || studStr.includes('modulo iii') || studStr.includes('modulo 3') || studStr.includes('tercer ciclo');
    if (courseIs9 || studIs9) return courseIs9 && studIs9;

    // 7° y 8° Año / Modulo I / Modulo II / Basico
    const courseIs78 = courseStr.includes('7') || courseStr.includes('8') || courseStr.includes('modulo i') || courseStr.includes('modulo ii') || courseStr.includes('basico');
    const studIs78 = studStr.includes('7') || studStr.includes('8') || studStr.includes('modulo i') || studStr.includes('modulo ii') || studStr.includes('basico');
    if (courseIs78 || studIs78) return courseIs78 && studIs78;

    return false;
  };

  const openEnroll = async (course: Course) => {
    setEnrollCourse(course);
    setError(null);
    try {
      const [enrolledList, allStudents] = await Promise.all([
        coursesService.listStudents(course.id),
        studentsService.list(),
      ]);
      setEnrolled(enrolledList);
      
      // Filtrar ÚNICAMENTE estudiantes del MISMO NIVEL académico que NO tengan grupo asignado actualmente
      const unassignedStudents = allStudents.filter((s) => !s.courseId);
      const sameLevelOnly = unassignedStudents.filter((s) => isSameLevel(course, s.gradeLevel));
      setAvailable(sameLevelOnly);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al cargar lista de alumnos');
    }
  };

  const enroll = async (studentId: string) => {
    if (!enrollCourse) return;
    await coursesService.enroll(enrollCourse.id, studentId);
    openEnroll(enrollCourse);
    load();
  };

  const unenroll = async (studentId: string) => {
    if (!enrollCourse) return;
    await coursesService.unenroll(enrollCourse.id, studentId);
    openEnroll(enrollCourse);
    load();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Principal */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 text-xs font-bold mb-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>Sedes y Asignaciones CINDEA MEP</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Grupos y Sedes de Inglés
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Administra tus grupos tanto en la <strong>Sede Central</strong> como en <strong>Sedes Satelitales</strong> (Bebedero, Porozó, etc.). Cada grupo mantiene sus actas y listas 100% independientes.
            </p>
          </div>

          <Button
            onClick={() => setOpen(true)}
            className="font-bold text-xs bg-blue-700 hover:bg-blue-800 text-white py-2.5 px-4 rounded-xl shadow-xs shrink-0 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nuevo Grupo / Sede</span>
          </Button>
        </div>

        {/* Notificaciones */}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </div>

      {/* 2. Grid de Grupos y Sedes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {courses.map((course) => {
          const studentCount = courseStudentCounts[course.id] ?? 0;
          return (
            <div
              key={course.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-blue-300 hover:shadow-md transition space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-mono">
                    {course.code || 'ING'}
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>{studentCount} estudiante{studentCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base md:text-lg font-black text-slate-900">
                    {course.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {course.description || 'Grupo oficial matriculado en CINDEA'}
                  </p>
                </div>
              </div>

              {/* Botones de acción directa por Sede/Grupo */}
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate(`/attendance?courseId=${course.id}`)}
                    className="w-full text-xs font-bold bg-blue-600 hover:bg-blue-700"
                  >
                    <CalendarCheck className="w-3.5 h-3.5 mr-1" />
                    Pasar Lista
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/grades?courseId=${course.id}`)}
                    className="w-full text-xs font-semibold"
                  >
                    <GraduationCap className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Ver Notas
                  </Button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => openEnroll(course)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Administrar Alumnos ({studentCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(course.id, course.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Eliminar grupo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Modal: Crear Nuevo Grupo / Sede */}
      <Modal
        open={open}
        title="Registrar Nuevo Grupo / Sede CINDEA"
        onClose={() => setOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="course-form"
              disabled={submitting}
              className="bg-blue-700 hover:bg-blue-800 text-white font-bold"
            >
              {submitting ? 'Guardando en la Nube...' : 'Guardar Grupo'}
            </Button>
          </div>
        }
      >
        <form id="course-form" onSubmit={onCreate} className="space-y-4 text-xs">
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-950 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-700" />
              <span>Ejemplo para múltiples sedes:</span>
            </p>
            <p className="text-[11px] text-blue-900/80">
              Si te asignan lecciones en otra sede, puedes llamarlo: <strong>Inglés 10° Año - Satélite Bebedero</strong> con código <strong>ING-10-BEBEDERO</strong>.
            </p>
          </div>

          <Input
            label="Nombre Completo del Grupo / Nivel"
            placeholder="Ej. Inglés 10° Año (Módulo IV) - Satélite Bebedero"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <Input
            label="Código Identificador Único"
            placeholder="Ej. ING-10-BEBEDERO o ING-11-CENTRAL"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '-') })}
            required
          />

          <Textarea
            label="Detalles de Horario y Sede (Opcional)"
            placeholder="Ej. Sede Satelital Bebedero • Horario: Jueves 6:00 PM a 9:00 PM"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
          />
        </form>
      </Modal>

      {/* 4. Modal: Administrar Alumnos del Grupo */}
      <Modal
        open={!!enrollCourse}
        title={`Matrícula de Alumnos · ${enrollCourse?.name ?? ''}`}
        onClose={() => setEnrollCourse(null)}
      >
        <div className="space-y-4 text-xs">
          <div>
            <h3 className="mb-2 font-bold text-slate-800 flex items-center justify-between">
              <span>Alumnos Matriculados en este Grupo</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                {enrolled.length} alumnos
              </span>
            </h3>
            {enrolled.length === 0 ? (
              <p className="text-slate-400 p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Aún no hay estudiantes asignados a esta sede/grupo.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {enrolled.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-200"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{s.fullName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{s.studentNumber || s.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => unenroll(s.id)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition"
                    >
                      Desvincular
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h3 className="mb-2 font-bold text-slate-800 flex items-center justify-between">
              <span>Estudiantes de este Nivel Sin Asignar</span>
              {available.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold">
                  {available.length} disponibles
                </span>
              )}
            </h3>
            {available.length === 0 ? (
              <p className="text-slate-400 p-3 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-[11px]">
                ✓ No hay estudiantes pendientes de asignar para este nivel académico.
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {available.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-slate-200 shadow-2xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{s.fullName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{s.studentNumber || s.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => enroll(s.id)}
                      className="text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                    >
                      Asignar a este Grupo
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
