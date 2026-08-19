import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { ErrorMessage } from '../components/ErrorMessage';
import { studentsService } from '../services/students.service';
import { coursesService } from '../services/courses.service';
import type { Student, Course } from '../types';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Search,
} from 'lucide-react';

const DEFAULT_ENGLISH_COURSES: Course[] = [
  { id: '55555555-5555-4555-a555-555555555551', name: 'Inglés 10° Año (Módulo IV)', code: 'ING-10', teacherId: '', description: null, color: '#2563EB' },
  { id: '55555555-5555-4555-a555-555555555552', name: 'Inglés 11° Año (Módulo V / Bachillerato)', code: 'ING-11', teacherId: '', description: null, color: '#059669' },
  { id: '55555555-5555-4555-a555-555555555553', name: 'Inglés 9° Año (Módulo III)', code: 'ING-9', teacherId: '', description: null, color: '#7C3AED' },
  { id: '55555555-5555-4555-a555-555555555554', name: 'Inglés 7° y 8° Año (Módulos I y II)', code: 'ING-7-8', teacherId: '', description: null, color: '#EA580C' },
];

export function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>(DEFAULT_ENGLISH_COURSES);
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal 1: Registro Individual
  const [openSingleModal, setOpenSingleModal] = useState(false);
  const [singleForm, setSingleForm] = useState({
    fullName: '',
    studentNumber: '',
    gradeLevel: 'Inglés 10° Año (Módulo IV)',
    guardianPhone: '',
    courseId: '55555555-5555-4555-a555-555555555551',
  });

  // Modal 2: Pegar Lista de Excel Masiva
  const [openBatchModal, setOpenBatchModal] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [batchCourseId, setBatchCourseId] = useState('auto');
  const [submitting, setSubmitting] = useState(false);

  // Modal 3: Cambiar Grado / Nivel de un estudiante
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedNewCourseId, setSelectedNewCourseId] = useState('');

  const resolveCourseByText = (levelText: string, courseList: Course[]): Course | undefined => {
    if (!levelText) return undefined;
    const clean = levelText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (clean.includes('11') || clean.includes('bachillerato') || clean.includes('modulo v') || clean.includes('modulo 5')) {
      return courseList.find((c) => (c.name || '').includes('11') || (c.code || '').includes('11') || (c.name || '').toLowerCase().includes('bachillerato'));
    }
    if (clean.includes('10') || clean.includes('modulo iv') || clean.includes('modulo 4') || clean.includes('diversificada')) {
      return courseList.find((c) => (c.name || '').includes('10') || (c.code || '').includes('10'));
    }
    if (clean.includes('9') || clean.includes('modulo iii') || clean.includes('modulo 3') || clean.includes('tercer ciclo')) {
      return courseList.find((c) => (c.name || '').includes('9') || (c.code || '').includes('9'));
    }
    if (clean.includes('7') || clean.includes('8') || clean.includes('modulo i') || clean.includes('modulo ii') || clean.includes('basico')) {
      return courseList.find((c) => (c.name || '').includes('7') || (c.name || '').includes('8') || (c.code || '').includes('7'));
    }
    for (const c of courseList) {
      const cName = (c.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (cName.includes(clean) || clean.includes(cName)) return c;
    }
    return undefined;
  };

  const loadData = () => {
    setLoading(true);
    Promise.all([studentsService.list(), coursesService.list()])
      .then(([s, c]) => {
        setStudents(s);
        const list = c && c.length > 0 ? c : DEFAULT_ENGLISH_COURSES;
        setCourses(list);
        if (list[0]) {
          setSingleForm((prev) => ({
            ...prev,
            courseId: prev.courseId || list[0].id,
            gradeLevel: list[0].name,
          }));
        }
      })
      .catch((e) => setError(e?.response?.data?.error ?? 'Error al cargar estudiantes'))
      .finally(() => setLoading(false));
  };

  useEffect(loadData, []);

  // Crear 1 estudiante
  const onSingleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!singleForm.fullName || !singleForm.studentNumber) return;
    setSubmitting(true);
    setError(null);
    try {
      await studentsService.create({
        fullName: singleForm.fullName.trim(),
        studentNumber: singleForm.studentNumber.trim(),
        gradeLevel: singleForm.gradeLevel,
        guardianPhone: singleForm.guardianPhone || undefined,
        courseId: singleForm.courseId || undefined,
      });
      setOpenSingleModal(false);
      setSingleForm({
        fullName: '',
        studentNumber: '',
        gradeLevel: courses[0]?.name || 'Inglés 10° Año (Módulo IV)',
        guardianPhone: '',
        courseId: courses[0]?.id || '',
      });
      setSuccessMsg('¡Estudiante registrado y matriculado con éxito!');
      loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al registrar estudiante');
    } finally {
      setSubmitting(false);
    }
  };

  // Crear estudiantes en bloque (Pegar de Excel)
  const onBatchSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!batchText.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      // Separar por líneas
      const lines = batchText.trim().split('\n');
      const parsedStudents: { fullName: string; studentNumber: string; email?: string; gradeLevel: string; courseId?: string }[] = [];

      for (const line of lines) {
        if (!line.trim()) continue;
        // Dividir por tabulación (copiado directo de Excel) o comas o punto y coma
        let parts = line.split('\t');
        if (parts.length < 2) parts = line.split(';');
        if (parts.length < 2) parts = line.split(',');

        // Si es la fila de encabezados (ej. Cedula, Nombre Completo), ignorarla
        const lowerFirst = (parts[0] || '').toLowerCase();
        const lowerSecond = (parts[1] || '').toLowerCase();
        if (
          lowerFirst.includes('cedula') ||
          lowerFirst.includes('nombre') ||
          lowerFirst.includes('estudiante') ||
          lowerSecond.includes('nombre') ||
          lowerSecond.includes('cedula')
        ) {
          continue;
        }

        let studentNumber = '';
        let fullName = '';
        let email = '';
        let gradeLevel = '';

        if (parts.length >= 4) {
          // Formato: Cedula, Nombre Completo, Correo, Nivel
          studentNumber = parts[0].trim();
          fullName = parts[1].trim();
          email = parts[2].trim();
          gradeLevel = parts[3].trim();
        } else if (parts.length === 3) {
          // Formato: Cedula, Nombre, Nivel (o correo)
          studentNumber = parts[0].trim();
          fullName = parts[1].trim();
          if (parts[2].includes('@')) {
            email = parts[2].trim();
          } else {
            gradeLevel = parts[2].trim();
          }
        } else if (parts.length === 2) {
          const p1 = parts[0].trim();
          const p2 = parts[1].trim();
          if (/^[0-9]/.test(p1)) {
            studentNumber = p1;
            fullName = p2;
          } else {
            fullName = p1;
            studentNumber = p2;
          }
        } else {
          fullName = line.trim();
          studentNumber = `ID-${Math.floor(100000 + Math.random() * 900000)}`;
        }

        studentNumber = studentNumber.replace(/\D/g, '') || studentNumber;
        if (!fullName || !studentNumber) continue;

        // Auto-detectar curso si batchCourseId es 'auto'
        let matchedCourse: Course | undefined;
        if (gradeLevel) {
          matchedCourse = resolveCourseByText(gradeLevel, courses);
        }
        if (!matchedCourse && batchCourseId && batchCourseId !== 'auto') {
          matchedCourse = courses.find((c) => c.id === batchCourseId);
        }

        const finalCourseId = batchCourseId && batchCourseId !== 'auto'
          ? batchCourseId
          : matchedCourse?.id || courses[0]?.id;

        const finalGradeLevel = matchedCourse?.name || gradeLevel || courses.find((c) => c.id === finalCourseId)?.name || 'Inglés 10° Año';

        parsedStudents.push({
          fullName,
          studentNumber,
          email: email || undefined,
          gradeLevel: finalGradeLevel,
          courseId: finalCourseId,
        });
      }

      if (parsedStudents.length === 0) {
        throw new Error('No se detectaron estudiantes válidos en el texto pegado.');
      }

      const res = await studentsService.createBatch({
        students: parsedStudents,
        courseId: batchCourseId && batchCourseId !== 'auto' ? batchCourseId : undefined,
      });

      setOpenBatchModal(false);
      setBatchText('');
      setSuccessMsg(res.message || `¡Se matricularon ${parsedStudents.length} estudiantes correctamente!`);
      loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Error al procesar la lista masiva');
    } finally {
      setSubmitting(false);
    }
  };

  const onEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !selectedNewCourseId) return;
    setSubmitting(true);
    setError(null);
    try {
      const selectedCourse = courses.find((c) => c.id === selectedNewCourseId);
      await studentsService.update(editingStudent.id, {
        courseId: selectedNewCourseId,
        gradeLevel: selectedCourse?.name || editingStudent.gradeLevel,
      });
      setOpenEditModal(false);
      setEditingStudent(null);
      setSuccessMsg('¡Grado / Nivel del estudiante actualizado con éxito!');
      loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al actualizar grado');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar a este estudiante del sistema?')) return;
    try {
      await studentsService.remove(id);
      setSuccessMsg('Estudiante eliminado correctamente del sistema.');
      loadData();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al eliminar el estudiante');
    }
  };

  const filteredStudents = students.filter((s) => {
    const name = s.fullName || '';
    const num = s.studentNumber || '';
    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      num.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = selectedGrade === 'ALL' || s.gradeLevel === selectedGrade;
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header con Botones de Registro */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 text-xs font-bold mb-1">
              <Users className="w-3.5 h-3.5" />
              <span>Matrícula CINDEA MEP</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Registro y Lista de Estudiantes
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Administra a tus alumnos de inglés. Puedes registrarlos uno a uno o pegar la lista completa de Excel en 1 solo clic.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              onClick={() => setOpenBatchModal(true)}
              className="text-xs font-bold border-slate-200 hover:bg-slate-100"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />
              Pegar Lista de Excel
            </Button>
            <Button
              variant="primary"
              onClick={() => setOpenSingleModal(true)}
              className="text-xs font-bold bg-blue-600 hover:bg-blue-700 shadow-xs"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              + Nuevo Alumno
            </Button>
          </div>
        </div>

        {/* Tarjeta de Instrucción Clara para la Profesora */}
        <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 p-4 flex items-start gap-3 text-xs text-amber-900">
          <KeyRound className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">
              💡 ¿Cómo ingresan los estudiantes a su portal privado?
            </p>
            <p className="text-amber-800 leading-relaxed">
              Cada estudiante puede ingresar directamente con su <strong>Cédula de Identidad o DIMEX</strong> y la contraseña inicial <strong>student123</strong>. No necesitan memorizar correos complicados.
            </p>
          </div>
        </div>
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {successMsg && (
        <div className="p-4 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Barra de Búsqueda y Filtro */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por nombre o cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Filtrar Nivel:</span>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Todos los Niveles</option>
            {courses.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Lista de Estudiantes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((st) => (
          <div
            key={st.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-md transition space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-100">
                  {st.gradeLevel || 'Inglés CINDEA'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingStudent(st);
                      const currentCourse = courses.find((c) => c.id === st.courseId || c.name === st.gradeLevel);
                      setSelectedNewCourseId(currentCourse?.id || courses[0]?.id || '');
                      setOpenEditModal(true);
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-bold bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg border border-blue-200 transition"
                    title="Cambiar Grado / Nivel"
                  >
                    ✏️ Grado
                  </button>
                  <button
                    onClick={() => onDelete(st.id)}
                    className="text-slate-400 hover:text-rose-600 transition p-1"
                    title="Eliminar estudiante"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{st.fullName}</h3>
                <div className="mt-1 flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Cédula: <strong>{st.studentNumber || 'Sin cédula'}</strong></span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Clave: <strong className="font-mono text-slate-700">student123</strong></span>
              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">Activo</span>
            </div>
          </div>
        ))}
      </div>

      {filteredStudents.length === 0 && !loading && (
        <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center bg-slate-50/50 space-y-3">
          <Users className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No se encontraron estudiantes</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Puedes agregar a tus alumnos con el botón azul "+ Nuevo Alumno" o pegar la lista de Excel de la dirección.
          </p>
        </div>
      )}

      {/* Modal 1: Registro Individual */}
      <Modal
        open={openSingleModal}
        title="Registrar Nuevo Estudiante a Mano"
        onClose={() => setOpenSingleModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpenSingleModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="single-student-form" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar y Matricular'}
            </Button>
          </>
        }
      >
        <form id="single-student-form" onSubmit={onSingleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nombre Completo del Alumno: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej. Pedro Ramírez Soto"
              value={singleForm.fullName}
              onChange={(e) => setSingleForm({ ...singleForm, fullName: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Cédula de Identidad o DIMEX (Solo Números): <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej. 501230456 o 155823491024"
              value={singleForm.studentNumber}
              onChange={(e) => setSingleForm({ ...singleForm, studentNumber: e.target.value.replace(/\D/g, '') })}
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Solo dígitos numéricos (sin guiones). Esta cédula será su usuario para entrar al portal.
            </span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nivel / Grupo de Inglés:
            </label>
            <select
              value={singleForm.courseId}
              onChange={(e) => {
                const c = courses.find((x) => x.id === e.target.value);
                setSingleForm({ ...singleForm, courseId: e.target.value, gradeLevel: c?.name || singleForm.gradeLevel });
              }}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Teléfono / WhatsApp (Opcional):
            </label>
            <input
              type="tel"
              placeholder="Ej. 88889999"
              value={singleForm.guardianPhone}
              onChange={(e) => setSingleForm({ ...singleForm, guardianPhone: e.target.value.replace(/\D/g, '') })}
              inputMode="numeric"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>
        </form>
      </Modal>

      {/* Modal 2: Pegar Lista de Excel Masiva */}
      <Modal
        open={openBatchModal}
        title="📋 Cargar Lista Masiva desde Excel"
        onClose={() => setOpenBatchModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpenBatchModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="batch-student-form" disabled={submitting}>
              {submitting ? 'Cargando lista...' : 'Matricular a Todos'}
            </Button>
          </>
        }
      >
        <form id="batch-student-form" onSubmit={onBatchSubmit} className="space-y-4 text-xs">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-900 leading-relaxed space-y-1">
            <p className="font-bold text-xs">✨ Carga Inteligente Multi-Nivel:</p>
            <p className="text-[11px] text-blue-950/80">
              Puedes subir un archivo <strong>.CSV</strong> o copiar las columnas de Excel (Cédula, Nombre, Correo, Nivel). El sistema <strong>detectará automáticamente el grado de cada alumno</strong> (10°, 11°, 9°, 7°-8°) y lo matriculará en su grupo correspondiente.
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Asignación de Grupos / Niveles:
            </label>
            <select
              value={batchCourseId}
              onChange={(e) => setBatchCourseId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="auto">✨ Auto-asignar grupo según la columna 'Nivel' del Excel / CSV (Recomendado)</option>
              <option disabled>──────── O FORZAR UN SOLO GRUPO PARA TODOS: ────────</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code || 'ING'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-700">
                Pega aquí el contenido copiado de Excel:
              </label>
              <label className="cursor-pointer text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition">
                📂 Cargar archivo .CSV
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const content = event.target?.result as string;
                      if (content) setBatchText(content);
                    };
                    reader.readAsText(file);
                  }}
                />
              </label>
            </div>
            <textarea
              rows={6}
              placeholder="Ejemplo:&#10;501230456	Pedro Ramírez Soto&#10;118230442	Valeria Castro Morales&#10;155823491024	Esteban Solís Vargas"
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
        </form>
      </Modal>

      {/* Modal 3: Cambiar Grado / Nivel Asignado */}
      <Modal
        open={openEditModal}
        title="✏️ Cambiar Grado / Nivel del Estudiante"
        onClose={() => setOpenEditModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpenEditModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="edit-student-grade-form" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar Nuevo Grado'}
            </Button>
          </>
        }
      >
        <form id="edit-student-grade-form" onSubmit={onEditSubmit} className="space-y-4 text-xs">
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-slate-800 space-y-1.5">
            <p className="font-bold text-sm text-slate-900">{editingStudent?.fullName}</p>
            <p className="text-slate-600 font-mono text-xs">Cédula: <strong>{editingStudent?.studentNumber}</strong></p>
            <p className="text-blue-700 text-xs font-semibold">Nivel actual: <strong>{editingStudent?.gradeLevel || 'Sin asignar'}</strong></p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Seleccionar Nuevo Grado / Nivel de Inglés CINDEA: <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedNewCourseId}
              onChange={(e) => setSelectedNewCourseId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500 mt-1.5 block leading-relaxed">
              💡 Al guardar este cambio, el estudiante únicamente podrá ver las tareas, materiales, notas y comunicados de este grado específico.
            </span>
          </div>
        </form>
      </Modal>
    </div>
  );
}
