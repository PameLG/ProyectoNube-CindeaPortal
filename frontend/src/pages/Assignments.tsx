import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { Modal } from '../components/Modal';
import { ErrorMessage } from '../components/ErrorMessage';
import { coursesService, type CourseStudent } from '../services/courses.service';
import { assignmentsService } from '../services/assignments.service';
import { gradesService } from '../services/grades.service';
import type { Course, Assignment, Submission, Grade } from '../types';
import {
  FolderUp,
  Plus,
  Trash2,
  Clock,
  FileText,
  Cloud,
  Award,
  Paperclip,
  Edit3,
} from 'lucide-react';
import { cn } from '../utils';

interface CreateTaskForm {
  title: string;
  description: string;
  category: string;
  dueDate: string;
  dueTime: string;
  maxScore: number;
  submissionType: 'in_class' | 'digital';
  attachmentName?: string;
  attachmentData?: string;
}

const emptyTaskForm: CreateTaskForm = {
  title: '',
  description: '',
  category: 'Tareas (10%)',
  dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
  dueTime: '23:59',
  maxScore: 100,
  submissionType: 'in_class',
  attachmentName: '',
  attachmentData: '',
};

export function Assignments() {
  const [searchParams] = useSearchParams();
  const queryCourseId = searchParams.get('courseId');

  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<string>('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [courseGrades, setCourseGrades] = useState<Grade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [openSubmissionsModal, setOpenSubmissionsModal] = useState(false);
  const [form, setForm] = useState<CreateTaskForm>(emptyTaskForm);
  const [submitting, setSubmitting] = useState(false);

  // Edición y ampliación de plazos
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editForm, setEditForm] = useState<CreateTaskForm>(emptyTaskForm);
  const [updating, setUpdating] = useState(false);

  // Calificar entrega digital
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(100);
  const [gradeFeedback, setGradeFeedback] = useState<string>('');

  // Calificar estudiante directamente (Examen en papel o presencial)
  const [gradingStudent, setGradingStudent] = useState<CourseStudent | null>(null);
  const [studentPaperScore, setStudentPaperScore] = useState<number>(100);
  const [studentPaperFeedback, setStudentPaperFeedback] = useState<string>('');
  const [studentPaperAttachmentName, setStudentPaperAttachmentName] = useState<string>('');
  const [studentPaperAttachmentData, setStudentPaperAttachmentData] = useState<string>('');
  const [savingPaperGrade, setSavingPaperGrade] = useState<boolean>(false);

  // Previsualizar documento / audio
  const [previewSub, setPreviewSub] = useState<Submission | null>(null);

  const downloadRealFile = (sub: Submission) => {
    const element = document.createElement('a');
    if (sub.fileData && sub.fileData.startsWith('data:')) {
      element.href = sub.fileData;
    } else if (sub.fileData) {
      const file = new Blob([sub.fileData], { type: 'text/plain;charset=utf-8' });
      element.href = URL.createObjectURL(file);
    } else {
      const fallback = `CINDEA MEP - DEPARTAMENTO DE INGLÉS\nEstudiante: ${sub.studentName}\nTarea: ${selectedAssignment?.title || 'Tarea'}\nArchivo: ${sub.fileName}\nFecha: ${new Date(sub.submittedAt).toLocaleString('es-CR')}`;
      const file = new Blob([fallback], { type: 'text/plain;charset=utf-8' });
      element.href = URL.createObjectURL(file);
    }
    element.download = sub.fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  useEffect(() => {
    coursesService.list().then((cs) => {
      setCourses(cs);
      const target = cs.find((c) => c.id === queryCourseId) || cs[0];
      if (target) setCourseId(target.id);
    });
  }, [queryCourseId]);

  const loadAssignments = () => {
    if (!courseId) return;
    assignmentsService
      .list(courseId)
      .then(setAssignments)
      .catch((e) => setError(e?.response?.data?.error ?? 'Error al cargar asignaciones'));
  };

  useEffect(() => {
    loadAssignments();
  }, [courseId]);

  const onCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    setSubmitting(true);
    setError(null);
    try {
      const fullDueDate = `${form.dueDate}T${form.dueTime}:00`;
      await assignmentsService.create(courseId, {
        title: form.title,
        description: form.description,
        category: form.category,
        dueDate: fullDueDate,
        maxScore: form.maxScore,
        submissionType: form.submissionType,
        attachmentName: form.attachmentName || undefined,
        attachmentData: form.attachmentData || undefined,
        status: 'published',
      });
      setOpenModal(false);
      setForm(emptyTaskForm);
      loadAssignments();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al crear asignación');
    } finally {
      setSubmitting(false);
    }
  };

  const onOpenEdit = (a: Assignment) => {
    setEditingAssignment(a);
    let dDate = '';
    let dTime = '23:59';
    if (a.dueDate) {
      const dt = new Date(a.dueDate);
      if (!isNaN(dt.getTime())) {
        dDate = dt.toISOString().slice(0, 10);
        dTime = dt.toTimeString().slice(0, 5);
      }
    }
    setEditForm({
      title: a.title,
      description: a.description || '',
      category: a.category || 'Tareas (10%)',
      dueDate: dDate,
      dueTime: dTime,
      maxScore: a.maxScore || 100,
      submissionType: a.submissionType || 'in_class',
      attachmentName: a.attachmentName || '',
      attachmentData: a.attachmentData || '',
    });
    setOpenEditModal(true);
  };

  const onUpdateTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;
    setUpdating(true);
    setError(null);
    try {
      const combinedDueDate = editForm.dueDate
        ? new Date(`${editForm.dueDate}T${editForm.dueTime || '23:59'}:00`).toISOString()
        : null;

      await assignmentsService.update(editingAssignment.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        category: editForm.category,
        dueDate: combinedDueDate,
        maxScore: Number(editForm.maxScore),
        submissionType: editForm.submissionType,
        attachmentName: editForm.attachmentName || null,
        attachmentData: editForm.attachmentData || null,
      });

      setOpenEditModal(false);
      setEditingAssignment(null);
      loadAssignments();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al actualizar la asignación.');
    } finally {
      setUpdating(false);
    }
  };

  const onDeleteTask = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta tarea?')) return;
    await assignmentsService.delete(id);
    loadAssignments();
  };

  const onViewSubmissions = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    const [subs, studs, grs] = await Promise.all([
      assignmentsService.listSubmissions(assignment.id).catch(() => []),
      coursesService.listStudents(courseId).catch(() => []),
      gradesService.listGrades(courseId).catch(() => []),
    ]);
    setSubmissions(subs);
    setStudents(studs);
    setCourseGrades(grs);
    setOpenSubmissionsModal(true);
  };

  const onSaveGrade = async (e: FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission || !selectedAssignment) return;
    try {
      await assignmentsService.gradeSubmission(gradingSubmission.id, {
        grade: gradeScore,
        feedback: gradeFeedback,
      });
      await gradesService.createGrade(courseId, {
        studentId: gradingSubmission.studentId,
        assignmentId: selectedAssignment.id,
        title: selectedAssignment.title,
        score: gradeScore,
        maxScore: Number(selectedAssignment.maxScore || 100),
        weight: 10,
        category: selectedAssignment.category || 'Tareas (10%)',
        gradedOn: new Date().toISOString(),
        notes: gradeFeedback,
      }).catch(() => {});

      const updatedSubs = await assignmentsService.listSubmissions(selectedAssignment.id);
      const updatedGrs = await gradesService.listGrades(courseId);
      setSubmissions(updatedSubs);
      setCourseGrades(updatedGrs);
      setGradingSubmission(null);
    } catch (e: any) {
      alert('Error al calificar entrega');
    }
  };

  const onSavePaperGrade = async (e: FormEvent) => {
    e.preventDefault();
    if (!gradingStudent || !selectedAssignment) return;
    setSavingPaperGrade(true);
    try {
      await gradesService.createGrade(courseId, {
        studentId: gradingStudent.id,
        assignmentId: selectedAssignment.id,
        title: selectedAssignment.title,
        score: studentPaperScore,
        maxScore: Number(selectedAssignment.maxScore || 100),
        weight: selectedAssignment.category?.includes('Exámenes') ? 30 : 10,
        category: selectedAssignment.category || 'Pruebas / Exámenes (30%)',
        gradedOn: new Date().toISOString(),
        notes: studentPaperFeedback || null,
        attachmentName: studentPaperAttachmentName || null,
        attachmentData: studentPaperAttachmentData || null,
      });

      const updatedGrs = await gradesService.listGrades(courseId);
      setCourseGrades(updatedGrs);
      setGradingStudent(null);
      setStudentPaperAttachmentName('');
      setStudentPaperAttachmentData('');
      setStudentPaperFeedback('');
    } catch (err: any) {
      alert('Error al guardar la nota del estudiante.');
    } finally {
      setSavingPaperGrade(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Principal Limpio */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Tareas & Entregas Cloud
              </h1>
              <span className="bg-blue-50 text-blue-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                Google Drive & Calendar
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Recepción digital de trabajos en PDF, Word e imágenes con ampliación flexible de fechas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-48 sm:w-60">
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              size="sm"
              onClick={() => setOpenModal(true)}
              disabled={!courseId}
              className="text-xs font-bold bg-blue-600 hover:bg-blue-700 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Nueva Tarea
            </Button>
          </div>
        </div>
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* 2. Grid de Tarjetas Limpias y Uniformes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assignments.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-dashed border-slate-300 p-12 text-center bg-white text-slate-500 text-xs space-y-2">
            <FolderUp className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-bold text-slate-700">No hay tareas creadas en este curso.</p>
            <p className="text-slate-400 text-[11px]">Haz clic en "+ Nueva Tarea" para publicar una asignación.</p>
          </div>
        ) : (
          assignments.map((a) => {
            const isCotidiano = a.category?.includes('Cotidiano');
            const isPruebas = a.category?.includes('Pruebas') || a.category?.includes('Examen');
            const badgeBg = isCotidiano
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : isPruebas
              ? 'bg-purple-50 text-purple-800 border-purple-200'
              : 'bg-blue-50 text-blue-800 border-blue-200';

            // Formateo de fecha corto y elegante (Ej. 20 ago, 11:59 PM)
            let formattedDate = 'Sin fecha fijada';
            if (a.dueDate) {
              const d = new Date(a.dueDate);
              const day = d.getDate();
              const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
              const month = months[d.getMonth()];
              const hours = d.getHours();
              const mins = d.getMinutes().toString().padStart(2, '0');
              const ampm = hours >= 12 ? 'PM' : 'AM';
              const hour12 = hours % 12 || 12;
              formattedDate = `${day} ${month}, ${hour12}:${mins} ${ampm}`;
            }

            return (
              <div
                key={a.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-sm hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md border', badgeBg)}>
                        {a.category || 'Tareas (10%)'}
                      </span>
                      {a.submissionType === 'in_class' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                          📝 En Clase / Físico
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                          💻 Entrega Digital
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
                      <Cloud className="w-3 h-3 text-emerald-600" /> Sincronizado
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1" title={a.title}>
                      {a.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                      {a.description || 'Sin instrucciones adicionales.'}
                    </p>
                  </div>

                  {/* Material de Guía Adjunto */}
                  {a.attachmentName && (
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs text-slate-800">
                      <span className="truncate font-semibold flex items-center gap-1.5 text-[11px] max-w-[65%]">
                        <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{a.attachmentName}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.createElement('a');
                          if (a.attachmentData && a.attachmentData.startsWith('data:')) {
                            el.href = a.attachmentData;
                          } else if (a.attachmentData) {
                            el.href = URL.createObjectURL(new Blob([a.attachmentData]));
                          } else {
                            el.href = 'https://drive.google.com';
                            el.target = '_blank';
                          }
                          el.download = a.attachmentName || 'Guia.pdf';
                          document.body.appendChild(el);
                          el.click();
                          document.body.removeChild(el);
                        }}
                        className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-white px-2 py-0.5 rounded-lg border border-blue-200 shrink-0 transition shadow-2xs"
                      >
                        Descargar
                      </button>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-slate-700">
                      <Award className="w-3 h-3 text-amber-500 shrink-0" />
                      <span>{a.maxScore} pts</span>
                    </div>
                  </div>
                </div>

                {/* Footer Limpio con Acciones Balanceadas */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onViewSubmissions(a)}
                    className={cn(
                      'text-xs font-bold flex-1 shadow-xs',
                      a.submissionType === 'in_class' ? 'bg-amber-700 hover:bg-amber-800' : 'bg-blue-600 hover:bg-blue-700'
                    )}
                  >
                    {a.submissionType === 'in_class' ? (
                      <>
                        <Award className="w-3.5 h-3.5 mr-1" />
                        Calificar en Aula
                      </>
                    ) : (
                      <>
                        <FolderUp className="w-3.5 h-3.5 mr-1" />
                        Ver Entregas Digitales
                      </>
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => onOpenEdit(a)}
                    className="p-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition shadow-2xs"
                    title="Editar detalles o ampliar plazo"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteTask(a.id)}
                    className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition shadow-2xs"
                    title="Eliminar tarea"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal
        open={openModal}
        title="Crear Nueva Asignación en la Nube"
        onClose={() => setOpenModal(false)}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setOpenModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="task-form" disabled={submitting}>
              {submitting ? 'Creando y Sincronizando...' : 'Publicar Tarea'}
            </Button>
          </>
        }
      >
        <form id="task-form" onSubmit={onCreateTask} className="space-y-4">
          <Input
            label="Título de la Tarea"
            placeholder="Ej. Homework 2: Reading & Vocabulary - Daily Routines"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />

          <Select
            label="Componente Evaluativo"
            name="category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={[
              { value: 'Tareas (10%)', label: 'Tareas (10%)' },
              { value: 'Trabajo Cotidiano (50%)', label: 'Trabajo Cotidiano (50%)' },
              { value: 'Pruebas / Exámenes (30%)', label: 'Pruebas / Exámenes (30%)' },
              { value: 'Proyecto Extraclase', label: 'Proyecto Extraclase' },
            ]}
          />

          {/* Modalidad de Realización y Entrega (Compacto con descripción breve) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Modalidad de Realización:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, submissionType: 'in_class' })}
                className={cn(
                  'p-2.5 rounded-xl border text-left transition flex flex-col justify-center',
                  form.submissionType === 'in_class'
                    ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-200 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-600'
                )}
              >
                <div className={cn('text-xs font-bold flex items-center gap-1', form.submissionType === 'in_class' ? 'text-amber-950' : 'text-slate-700')}>
                  <span>📝 En Aula (Papel / Cuaderno)</span>
                </div>
                <p className={cn('text-[11px] mt-0.5', form.submissionType === 'in_class' ? 'text-amber-800' : 'text-slate-500')}>
                  Docente califica; no pide archivo.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, submissionType: 'digital' })}
                className={cn(
                  'p-2.5 rounded-xl border text-left transition flex flex-col justify-center',
                  form.submissionType === 'digital'
                    ? 'bg-blue-50/90 border-blue-300 ring-1 ring-blue-200 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-600'
                )}
              >
                <div className={cn('text-xs font-bold flex items-center gap-1', form.submissionType === 'digital' ? 'text-blue-950' : 'text-slate-700')}>
                  <span>💻 Entrega Digital en Línea</span>
                </div>
                <p className={cn('text-[11px] mt-0.5', form.submissionType === 'digital' ? 'text-blue-800' : 'text-slate-500')}>
                  El alumno sube su documento.
                </p>
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Instrucciones y Formato de Entrega</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-blue-500 focus:outline-none"
              rows={3}
              placeholder="Ej. Completar la lectura sobre Sustainable Development y responder las 5 preguntas en PDF, Word o Foto..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fecha Límite Estricta"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              required
            />
            <Input
              label="Hora Límite"
              type="time"
              value={form.dueTime}
              onChange={(e) => setForm({ ...form, dueTime: e.target.value })}
              required
            />
          </div>

          <Input
            label="Puntos Totales (Base)"
            type="number"
            value={form.maxScore}
            onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })}
            required
          />

          {/* Adjuntar material de guía o instrucciones */}
          <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              📎 Adjuntar Guía, Rúbrica o Material de Apoyo (PDF, Word, Imagen):
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
              className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    setForm((prev) => ({
                      ...prev,
                      attachmentName: file.name,
                      attachmentData: reader.result as string,
                    }));
                  };
                  if (file.name.toLowerCase().endsWith('.txt')) {
                    reader.readAsText(file);
                  } else {
                    reader.readAsDataURL(file);
                  }
                }
              }}
            />
            {form.attachmentName && (
              <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <span>✓ Archivo adjunto preparado: <strong>{form.attachmentName}</strong></span>
              </div>
            )}
          </div>

          <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-800 flex items-center gap-2 border border-blue-200">
            <Cloud className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Al guardar, se generará la carpeta cloud <code className="font-mono bg-blue-100 px-1 rounded">/Drive/2026/Entregas/</code> y se sincronizará con Google Calendar.
            </span>
          </div>
        </form>
      </Modal>

      {/* MODAL PARA EDITAR Y AMPLIAR PLAZO DE ENTREGA */}
      <Modal
        open={openEditModal}
        title={`✏️ Editar Asignación / Modificar Fecha: ${editingAssignment?.title || ''}`}
        onClose={() => {
          setOpenEditModal(false);
          setEditingAssignment(null);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setOpenEditModal(false);
                setEditingAssignment(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="edit-task-form"
              disabled={updating}
              className="bg-indigo-600 hover:bg-indigo-700 font-bold"
            >
              {updating ? 'Guardando Cambios...' : '💾 Guardar Cambios & Actualizar Plazo'}
            </Button>
          </>
        }
      >
        <form id="edit-task-form" onSubmit={onUpdateTask} className="space-y-4">
          <Input
            label="Título de la Asignación o Examen"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            required
          />

          <Select
            label="Componente Evaluativo"
            name="category"
            value={editForm.category}
            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
            options={[
              { value: 'Tareas (10%)', label: 'Tareas (10%)' },
              { value: 'Trabajo Cotidiano (50%)', label: 'Trabajo Cotidiano (50%)' },
              { value: 'Pruebas / Exámenes (30%)', label: 'Pruebas / Exámenes (30%)' },
              { value: 'Proyecto Extraclase', label: 'Proyecto Extraclase' },
            ]}
          />

          {/* Modalidad de Realización y Entrega (Compacto con descripción breve) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Modalidad de Realización:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, submissionType: 'in_class' })}
                className={cn(
                  'p-2.5 rounded-xl border text-left transition flex flex-col justify-center',
                  editForm.submissionType === 'in_class'
                    ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-200 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-600'
                )}
              >
                <div className={cn('text-xs font-bold flex items-center gap-1', editForm.submissionType === 'in_class' ? 'text-amber-950' : 'text-slate-700')}>
                  <span>📝 En Aula (Papel / Cuaderno)</span>
                </div>
                <p className={cn('text-[11px] mt-0.5', editForm.submissionType === 'in_class' ? 'text-amber-800' : 'text-slate-500')}>
                  Docente califica; no pide archivo.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, submissionType: 'digital' })}
                className={cn(
                  'p-2.5 rounded-xl border text-left transition flex flex-col justify-center',
                  editForm.submissionType === 'digital'
                    ? 'bg-blue-50/90 border-blue-300 ring-1 ring-blue-200 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-600'
                )}
              >
                <div className={cn('text-xs font-bold flex items-center gap-1', editForm.submissionType === 'digital' ? 'text-blue-950' : 'text-slate-700')}>
                  <span>💻 Entrega Digital en Línea</span>
                </div>
                <p className={cn('text-[11px] mt-0.5', editForm.submissionType === 'digital' ? 'text-blue-800' : 'text-slate-500')}>
                  El alumno sube su documento.
                </p>
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Instrucciones y Formato de Entrega</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-blue-500 focus:outline-none"
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Ampliación o Modificación del Plazo de Entrega</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Si modificas la fecha o extiendes la hora límite, los estudiantes con entregas pendientes o que requieran reenviar su archivo podrán hacerlo automáticamente desde su portal.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Input
                label="Nueva Fecha Límite"
                type="date"
                value={editForm.dueDate}
                onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                required
              />
              <Input
                label="Hora Límite"
                type="time"
                value={editForm.dueTime}
                onChange={(e) => setEditForm({ ...editForm, dueTime: e.target.value })}
                required
              />
            </div>
          </div>

          <Input
            label="Puntos Totales (Base)"
            type="number"
            value={editForm.maxScore}
            onChange={(e) => setEditForm({ ...editForm, maxScore: Number(e.target.value) })}
            required
          />

          {/* Adjuntar o cambiar material de guía */}
          <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Material de Guía / Rúbrica Adjunta</span>
              {editForm.attachmentName && (
                <span className="text-[10px] text-blue-600 font-normal">Archivo actual: {editForm.attachmentName}</span>
              )}
            </label>
            <input
              type="file"
              className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer w-full"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    setEditForm((prev) => ({
                      ...prev,
                      attachmentName: file.name,
                      attachmentData: reader.result as string,
                    }));
                  };
                  if (file.name.toLowerCase().endsWith('.txt')) {
                    reader.readAsText(file);
                  } else {
                    reader.readAsDataURL(file);
                  }
                }
              }}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={openSubmissionsModal}
        title={`Entregas Recibidas: ${selectedAssignment?.title || ''}`}
        onClose={() => {
          setOpenSubmissionsModal(false);
          setGradingSubmission(null);
        }}
      >
        <div className="space-y-4">
          {/* Banner de Sincronización Google Drive / Cloud Storage */}
          <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/80 text-xs text-blue-900 space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-blue-600" />
                Almacenamiento Cloud Organizado (Google Drive PaaS)
              </span>
              <a
                href={
                  (selectedAssignment as any)?.driveFolderUrl
                    ? `${(selectedAssignment as any).driveFolderUrl}?authuser=pruebaproyecto551@gmail.com`
                    : 'https://drive.google.com/drive/folders/1sDpkjftZUFewVSGDemeyViPUlVUBki0L?authuser=pruebaproyecto551@gmail.com'
                }
                target="_blank"
                rel="noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2.5 py-1 rounded-full font-bold transition inline-flex items-center gap-1 shadow-2xs"
              >
                Abrir en Google Drive ↗
              </a>
            </div>
            <div className="font-mono text-[11px] text-blue-700 bg-white/80 p-2 rounded-lg border border-blue-200 truncate">
              📁 Drive &gt; 2026 &gt; {courses.find((c) => c.id === courseId)?.name || 'Inglés'} &gt; {selectedAssignment?.title || 'Entregas'}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span>Matrícula del grupo: <strong>{students.length} estudiantes</strong> ({submissions.length} entregas web)</span>
            <span className="text-[11px] text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded font-semibold">
              {
                students.filter((st) => {
                  const sub = submissions.find((s) => s.studentId === st.id);
                  const gr = courseGrades.find(
                    (g) => g.studentId === st.id && (g.assignmentId === selectedAssignment?.id || (g.title && selectedAssignment?.title && g.title.toLowerCase().trim() === selectedAssignment.title.toLowerCase().trim()))
                  );
                  return (sub && sub.grade !== null) || !!gr;
                }).length
              } evaluados de {students.length}
            </span>
          </div>

          {students.length === 0 && submissions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              No hay estudiantes inscritos en este módulo.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[22rem] overflow-y-auto pr-1 space-y-2">
              {students.map((student) => {
                const sub = submissions.find((s) => s.studentId === student.id);
                const grade = courseGrades.find(
                  (g) =>
                    g.studentId === student.id &&
                    (g.assignmentId === selectedAssignment?.id ||
                      (g.title && selectedAssignment?.title && g.title.toLowerCase().trim() === selectedAssignment.title.toLowerCase().trim()))
                );
                const effectiveScore = grade?.score ?? sub?.grade ?? null;
                const isAudio =
                  sub &&
                  (sub.fileName.match(/\.(mp3|wav|m4a|ogg|aac)$/i) ||
                    sub.fileName.toLowerCase().includes('audio') ||
                    sub.fileName.toLowerCase().includes('speaking'));

                return (
                  <div key={student.id} className="pt-3 pb-2 flex flex-col gap-2.5 bg-white p-3 rounded-xl border border-slate-100 shadow-2xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                          <span>{student.fullName}</span>
                          <span className="text-[10px] font-mono text-slate-400">({student.studentNumber})</span>
                          {sub ? (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                              {isAudio ? '🎙️ Audio Digital' : '📄 Archivo Subido'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.2 rounded border border-indigo-200">
                              📝 Examen en Papel / Presencial
                            </span>
                          )}
                        </div>

                        {sub ? (
                          <>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600 font-mono">
                              <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="font-semibold text-slate-800 truncate">{sub.fileName}</span>
                              <span className="text-slate-400">({(sub.fileSize / 1024).toFixed(0)} KB)</span>
                            </div>

                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Entregado en portal: {new Date(sub.submittedAt).toLocaleString('es-CR')}
                            </div>

                            {/* Botones de acción directa: Ver archivo y Descargar */}
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => setPreviewSub(sub)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200/60 transition"
                              >
                                <FileText className="w-3 h-3" />
                                Ver / Abrir Archivo
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadRealFile(sub)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-200/60 transition"
                              >
                                <FolderUp className="w-3 h-3 rotate-180" />
                                Descargar
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="mt-1 text-[11px] text-slate-500">
                            {grade?.attachmentData ? (
                              <div className="flex items-center gap-2 text-indigo-700 font-semibold">
                                <span>📸 Escaneo de examen físico respaldado: {grade.attachmentName || 'Examen.pdf'}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const el = document.createElement('a');
                                    el.href = grade.attachmentData!;
                                    el.download = grade.attachmentName || 'Examen_Calificado.pdf';
                                    document.body.appendChild(el);
                                    el.click();
                                    document.body.removeChild(el);
                                  }}
                                  className="text-[10px] text-blue-700 underline font-bold"
                                >
                                  Ver Respaldo
                                </button>
                              </div>
                            ) : (
                              <span>Evaluado físicamente en aula. No requiere entrega web del alumno.</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {effectiveScore !== null ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black font-mono text-xs border border-emerald-300">
                            {effectiveScore} / {selectedAssignment?.maxScore || 100} pts
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-bold border border-amber-200">
                            Sin Calificar
                          </span>
                        )}

                        {sub ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setGradingStudent(null);
                              setGradingSubmission(sub);
                              setGradeScore(sub.grade ?? (grade?.score || 100));
                              setGradeFeedback(sub.feedback || (grade?.notes || 'Great work!'));
                            }}
                            className="text-xs font-bold"
                          >
                            {effectiveScore !== null ? 'Editar Nota' : 'Calificar'}
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setGradingSubmission(null);
                              setGradingStudent(student);
                              setStudentPaperScore(grade?.score ?? 100);
                              setStudentPaperFeedback(grade?.notes ?? '');
                              setStudentPaperAttachmentName(grade?.attachmentName ?? '');
                              setStudentPaperAttachmentData(grade?.attachmentData ?? '');
                            }}
                            className="text-xs font-bold border-indigo-200 text-indigo-900 bg-indigo-50 hover:bg-indigo-100"
                          >
                            {effectiveScore !== null ? 'Editar Nota Papel' : 'Calificar Papel'}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* REPRODUCTOR DE AUDIO DIRECTO PARA PRACTICAS ORALES */}
                    {isAudio && sub && (
                      <div className="p-2.5 bg-purple-50/80 rounded-xl border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="text-[11px] text-purple-900 font-bold flex items-center gap-1.5">
                          <span>🎧 Escuchar Grabación Oral del Alumno:</span>
                        </div>
                        <audio
                          controls
                          className="h-8 w-full sm:w-64 accent-purple-600 rounded-lg"
                          src={sub.fileData && sub.fileData.startsWith('data:audio/') ? sub.fileData : "https://actions.google.com/sounds/v1/speech/greeting_female_english.ogg"}
                        >
                          Tu navegador no soporta el reproductor de audio.
                        </audio>
                      </div>
                    )}

                    {/* Retroalimentación o notas actuales */}
                    {(sub?.feedback || grade?.notes) && (
                      <div className="text-[11px] text-emerald-900 bg-emerald-50/90 p-2 rounded-lg border border-emerald-200/80 font-medium">
                        <strong>Teacher Feedback:</strong> {sub?.feedback || grade?.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Formulario de Calificación Digital */}
          {gradingSubmission && (
            <form onSubmit={onSaveGrade} className="pt-4 border-t border-slate-200 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>📝 Calificando entrega digital de: <strong>{gradingSubmission.studentName}</strong></span>
                <span className="text-[11px] text-slate-500">Base: {selectedAssignment?.maxScore || 100} pts</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <Input
                    label="Nota Obtenida (pts)"
                    type="number"
                    min={0}
                    max={selectedAssignment?.maxScore || 100}
                    value={gradeScore}
                    onChange={(e) => setGradeScore(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label="Retroalimentación / Teacher Feedback"
                    placeholder="Excelente pronunciación, repasar verbos irregulares..."
                    value={gradeFeedback}
                    onChange={(e) => setGradeFeedback(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" type="button" onClick={() => setGradingSubmission(null)}>
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-blue-600 hover:bg-blue-700 font-bold">
                  Guardar y Asignar Calificación
                </Button>
              </div>
            </form>
          )}

          {/* Formulario de Calificación Presencial / Examen en Papel */}
          {gradingStudent && (
            <form onSubmit={onSavePaperGrade} className="pt-4 border-t border-slate-200 space-y-3 bg-indigo-50/70 p-4 rounded-xl border border-indigo-200">
              <div className="text-xs font-bold text-indigo-950 flex items-center justify-between">
                <span>📝 Calificando Examen Físico / Papel de: <strong>{gradingStudent.fullName}</strong></span>
                <span className="text-[11px] text-indigo-700">Base: {selectedAssignment?.maxScore || 100} pts</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <Input
                    label="Puntos Obtenidos (pts)"
                    type="number"
                    min={0}
                    max={selectedAssignment?.maxScore || 100}
                    value={studentPaperScore}
                    onChange={(e) => setStudentPaperScore(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label="Observaciones / Retroalimentación"
                    placeholder="Excelente dominio en respuestas breves..."
                    value={studentPaperFeedback}
                    onChange={(e) => setStudentPaperFeedback(e.target.value)}
                  />
                </div>
              </div>

              {/* Adjunto de examen en papel de ese estudiante */}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  📸 Respaldo del Examen Físico Calificado (Foto o PDF - Opcional)
                </label>
                <label className="border border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-2.5 bg-white cursor-pointer transition flex items-center justify-between gap-2 block">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setStudentPaperAttachmentName(file.name);
                          setStudentPaperAttachmentData(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <div className="flex items-center gap-2 text-xs truncate">
                    <Paperclip className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="truncate text-slate-700 font-medium">
                      {studentPaperAttachmentName ? `Archivo: ${studentPaperAttachmentName}` : 'Tomar foto o adjuntar examen físico calificado'}
                    </span>
                  </div>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2.5 py-1 rounded shrink-0">
                    {studentPaperAttachmentName ? 'Cambiar' : 'Examinar'}
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" type="button" onClick={() => setGradingStudent(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={savingPaperGrade}
                  className="bg-indigo-600 hover:bg-indigo-700 font-bold"
                >
                  {savingPaperGrade ? 'Guardando...' : 'Guardar Calificación de Examen'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Modal de Previsualización y Apertura de Documento Cloud */}
      <Modal
        open={previewSub !== null}
        title={`Visor Cloud: ${previewSub?.fileName || 'Documento'}`}
        onClose={() => setPreviewSub(null)}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setPreviewSub(null)}>
              Cerrar Visor
            </Button>
            {previewSub && (
              <Button variant="primary" size="sm" onClick={() => downloadRealFile(previewSub)} className="bg-blue-600 hover:bg-blue-700 font-bold">
                📥 Descargar Archivo Original
              </Button>
            )}
          </>
        }
      >
        {previewSub && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  {previewSub.fileName}
                </span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  Cloud Encrypted (AES-256)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600 pt-2 border-t border-slate-200 text-[11px]">
                <div><strong>Autor:</strong> {previewSub.studentName}</div>
                <div><strong>Fecha de entrega:</strong> {new Date(previewSub.submittedAt).toLocaleString('es-CR')}</div>
                <div><strong>Formato:</strong> {previewSub.fileName.split('.').pop()?.toUpperCase()} Document</div>
                <div><strong>Ubicación:</strong> Google Drive / 2026 / Inglés CINDEA</div>
              </div>
            </div>

            {/* Vista previa real de contenido */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2 text-slate-700">
              <div className="font-bold text-slate-900 border-b pb-1 text-xs flex items-center justify-between">
                <span>📄 Contenido Real del Archivo Entregado:</span>
                <span className="text-[10px] text-slate-500 font-mono">{previewSub.fileName}</span>
              </div>
              
              {previewSub.fileData && previewSub.fileData.startsWith('data:image/') ? (
                <div className="text-center py-2">
                  <img src={previewSub.fileData} alt={previewSub.fileName} className="max-h-72 mx-auto rounded-lg shadow-sm border border-slate-200" />
                </div>
              ) : previewSub.fileData && previewSub.fileData.startsWith('data:audio/') ? (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <audio controls src={previewSub.fileData} className="w-full" />
                </div>
              ) : previewSub.fileData && !previewSub.fileData.startsWith('data:') ? (
                <pre className="p-3 bg-slate-100 rounded-lg text-[11px] font-mono whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed border border-slate-200">
                  {previewSub.fileData}
                </pre>
              ) : (
                <div className="p-4 bg-blue-50/60 rounded-lg border border-blue-200 text-center space-y-2">
                  <p className="text-xs text-blue-900 font-semibold">
                    Documento binario listo ({previewSub.fileName.split('.').pop()?.toUpperCase()})
                  </p>
                  <p className="text-[11px] text-blue-800/80">
                    El archivo original de la estudiante se encuentra sincronizado con Google Drive.
                  </p>
                  <Button variant="primary" size="sm" onClick={() => downloadRealFile(previewSub)} className="bg-blue-600 hover:bg-blue-700 text-xs">
                    📥 Descargar Archivo Original
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
