import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { ErrorMessage } from '../components/ErrorMessage';
import { coursesService } from '../services/courses.service';
import { aiService } from '../services/ai.service';
import { announcementsService } from '../services/announcements.service';
import { useAuth } from '../auth/AuthProvider';
import type { Course, AIDiagnosticReport, AIRubric } from '../types';
import {
  Sparkles,
  Send,
  FileCheck,
  Copy,
  Check,
  Share2,
  BrainCircuit,
  MessageCircle,
  Pencil,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../utils';

export function AIAssistant() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'notices' | 'risk' | 'rubrics'>('notices');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Tab 1: Generador de Comunicados
  const [noticeType, setNoticeType] = useState<
    'assignment_reminder' | 'exam_reminder' | 'low_grade_alert' | 'absence_alert' | 'meeting_call' | 'congratulation'
  >('assignment_reminder');
  const [studentName, setStudentName] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10));
  const [details, setDetails] = useState('');
  const [generatedNotice, setGeneratedNotice] = useState<{
    title: string;
    message: string;
    whatsappTemplate: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Campos editables por la docente
  const [editableTitle, setEditableTitle] = useState('');
  const [editableMessage, setEditableMessage] = useState('');
  const [editableWhatsapp, setEditableWhatsapp] = useState('');
  const [isEditing, setIsEditing] = useState(false); // true = panel visible

  // Tab 2: Diagnóstico de Riesgo
  const [riskReport, setRiskReport] = useState<AIDiagnosticReport | null>(null);

  // Tab 3: Rúbricas MEP de Inglés
  const [rubricTopic, setRubricTopic] = useState('Oral Presentation: Job Interview & Professional English');
  const [rubricGradeLevel, setRubricGradeLevel] = useState('CINDEA - Módulo 52 (Inglés)');
  const [rubricEvalType, setRubricEvalType] = useState<'cotidiano' | 'tarea' | 'proyecto' | 'examen'>('tarea');
  const [generatedRubric, setGeneratedRubric] = useState<AIRubric | null>(null);

  useEffect(() => {
    coursesService.list().then((cs) => {
      if (cs.length > 0) {
        setCourses(cs);
        setCourseId(cs[0].id);
      } else {
        const fallbacks: Course[] = [
          { id: '55555555-5555-4555-a555-555555555551', name: 'Inglés Módulo 52 (Intermedio)', code: 'ING-52', teacherId: '', description: null, color: '#2563EB' },
          { id: '55555555-5555-4555-a555-555555555552', name: 'Inglés Módulo 63 (Avanzado)', code: 'ING-63', teacherId: '', description: null, color: '#10B981' },
        ];
        setCourses(fallbacks);
        setCourseId(fallbacks[0].id);
      }
    }).catch(() => {
      const fallbacks: Course[] = [
        { id: '55555555-5555-4555-a555-555555555551', name: 'Inglés Módulo 52 (Intermedio)', code: 'ING-52', teacherId: '', description: null, color: '#2563EB' },
        { id: '55555555-5555-4555-a555-555555555552', name: 'Inglés Módulo 63 (Avanzado)', code: 'ING-63', teacherId: '', description: null, color: '#10B981' },
      ];
      setCourses(fallbacks);
      setCourseId(fallbacks[0].id);
    });
  }, []);

  const handleGenerateNotice = async () => {
    const course = courses.find((c) => c.id === courseId);
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.generateNotice({
        type: noticeType,
        courseName: course?.name || 'Inglés CINDEA - Módulo 52',
        studentName: studentName || undefined,
        guardianName: guardianName || undefined,
        dueDate,
        details: details || undefined,
        teacherName: user?.fullName ? `Teacher ${user.fullName}` : 'Teacher Diana',
      });
      setGeneratedNotice(res);
      // Cargar en el editor
      setEditableTitle(res.title);
      setEditableMessage(res.message);
      setEditableWhatsapp(res.whatsappTemplate);
      setIsEditing(true);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al generar comunicado con IA');
    } finally {
      setLoading(false);
    }
  };

  const handleWriteFromScratch = () => {
    const course = courses.find((c) => c.id === courseId);
    setGeneratedNotice(null);
    setEditableTitle(`Comunicado de Inglés - ${course?.name || 'CINDEA'}`);
    setEditableMessage('');
    setEditableWhatsapp('');
    setIsEditing(true);
  };

  const handlePublishAsAnnouncement = async () => {
    if (!editableTitle.trim() || !editableMessage.trim()) {
      alert('El título y el contenido del comunicado son obligatorios.');
      return;
    }
    try {
      await announcementsService.create({
        courseId: courseId || null,
        title: editableTitle,
        content: editableMessage,
      });
      setIsEditing(false);
      setGeneratedNotice(null);
      setEditableTitle('');
      setEditableMessage('');
      setEditableWhatsapp('');
      alert('¡Comunicado publicado con éxito en el Tablón de Avisos!');
    } catch (_) {
      alert('Error al publicar aviso');
    }
  };

  const handleLoadRisk = async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const rep = await aiService.analyzeRisk(courseId);
      setRiskReport(rep);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al analizar riesgo del curso');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'risk' && courseId) {
      handleLoadRisk();
    }
  }, [activeTab, courseId]);

  const handleGenerateRubric = async () => {
    const course = courses.find((c) => c.id === courseId);
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.generateRubric({
        subject: course?.name || 'Inglés CINDEA',
        gradeLevel: rubricGradeLevel,
        topic: rubricTopic,
        evaluationType: rubricEvalType,
      });
      setGeneratedRubric(res.rubric);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al generar rúbrica');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Asistente Inteligente Gemini</h1>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-indigo-200">
              IA Pedagógica MEP
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Herramientas de Inteligencia Artificial para la redacción de circulares, diagnóstico predictivo y rúbricas.
          </p>
        </div>

        <div className="w-64">
          <Select
            label="Grupo Activo"
            name="courseId"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            options={courses.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('notices')}
          className={cn(
            'pb-3 px-4 text-xs md:text-sm font-semibold border-b-2 transition flex items-center gap-2',
            activeTab === 'notices'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          )}
        >
          <MessageCircle className="w-4 h-4" />
          Redactor de Circulares a Familias
        </button>
        <button
          onClick={() => setActiveTab('risk')}
          className={cn(
            'pb-3 px-4 text-xs md:text-sm font-semibold border-b-2 transition flex items-center gap-2',
            activeTab === 'risk'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          )}
        >
          <BrainCircuit className="w-4 h-4" />
          Diagnóstico de Riesgo & Alertas
        </button>
        <button
          onClick={() => setActiveTab('rubrics')}
          className={cn(
            'pb-3 px-4 text-xs md:text-sm font-semibold border-b-2 transition flex items-center gap-2',
            activeTab === 'rubrics'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          )}
        >
          <FileCheck className="w-4 h-4" />
          Generador de Rúbricas MEP
        </button>
      </div>

      {activeTab === 'notices' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Configuración del Comunicado
            </h3>

            <Select
              label="Motivo del Comunicado"
              name="noticeType"
              value={noticeType}
              onChange={(e: any) => setNoticeType(e.target.value)}
              options={[
                { value: 'assignment_reminder', label: '📌 Recordatorio de Tarea / Asignación' },
                { value: 'exam_reminder', label: '📅 Convocatoria a Examen / Prueba' },
                { value: 'absence_alert', label: '⚠️ Alerta de Ausencias Injustificadas (SICIN)' },
                { value: 'low_grade_alert', label: '📊 Notificación de Nota Baja / Refuerzo' },
                { value: 'meeting_call', label: '👥 Convocatoria a Reunión de Padres' },
                { value: 'congratulation', label: '⭐ Felicitación por Buen Rendimiento' },
              ]}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nombre del Alumno (Opcional)"
                placeholder="Ej. Pedro Ramírez"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
              <Input
                label="Nombre del Encargado"
                placeholder="Ej. Sra. Elena Soto"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
              />
            </div>

            <Input
              label="Fecha Límite / Fecha Clave"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Detalles adicionales o temario</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                rows={3}
                placeholder="Ej. Entregar ejercicios del 1 al 10 en PDF..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                onClick={handleGenerateNotice}
                disabled={loading}
                className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 font-bold"
              >
                <Sparkles className="w-4 h-4 mr-1.5 text-amber-300" />
                {loading ? 'Generando con IA...' : 'Generar Comunicado con IA'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleWriteFromScratch}
                disabled={loading}
                className="w-full text-xs border-dashed"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                Redactar Comunicado Propio
              </Button>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {isEditing ? (
              <div className="rounded-xl border border-indigo-200 bg-white shadow-xs space-y-0 overflow-hidden">
                {/* Header del editor */}
                <div className="flex items-center justify-between px-5 py-3 bg-indigo-50 border-b border-indigo-100">
                  <div className="flex items-center gap-2">
                    <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                      {generatedNotice ? 'Editor · Generado por IA (Editable)' : 'Editor · Comunicado Propio'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {generatedNotice && (
                      <button
                        onClick={() => {
                          setEditableTitle(generatedNotice.title);
                          setEditableMessage(generatedNotice.message);
                          setEditableWhatsapp(generatedNotice.whatsappTemplate);
                        }}
                        className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        <RefreshCw className="w-3 h-3" /> Restaurar IA
                      </button>
                    )}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(editableMessage);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 font-medium"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Título editable */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Título del Comunicado</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      value={editableTitle}
                      onChange={(e) => setEditableTitle(e.target.value)}
                      placeholder="Título del comunicado..."
                    />
                  </div>

                  {/* Contenido editable */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Cuerpo del Comunicado</label>
                    <textarea
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs text-slate-800 leading-relaxed focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300 font-serif resize-y"
                      rows={12}
                      value={editableMessage}
                      onChange={(e) => setEditableMessage(e.target.value)}
                      placeholder="Escriba aquí el cuerpo del comunicado..."
                    />
                  </div>

                  {/* Plantilla WhatsApp editable */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Plantilla WhatsApp (corta)</label>
                    <textarea
                      className="w-full rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-900 font-mono leading-relaxed focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-300 resize-y"
                      rows={4}
                      value={editableWhatsapp}
                      onChange={(e) => setEditableWhatsapp(e.target.value)}
                      placeholder="Mensaje corto para enviar por WhatsApp..."
                    />
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handlePublishAsAnnouncement}
                      className="text-xs flex-1"
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      Publicar en Tablón de Avisos
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const encoded = encodeURIComponent(editableWhatsapp);
                        window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
                      }}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                    >
                      <Share2 className="w-3.5 h-3.5 mr-1" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => { setIsEditing(false); setGeneratedNotice(null); }}
                      className="text-xs"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center bg-white text-slate-500 text-xs flex flex-col items-center gap-3">
                <Sparkles className="w-8 h-8 text-indigo-400 opacity-60" />
                <p>Configura los parámetros a la izquierda y presiona <strong>"Generar Comunicado con IA"</strong> para que Gemini redacte el mensaje formal.</p>
                <p className="text-slate-400">O bien, escribe tu propio comunicado desde cero con <strong>"Redactar Comunicado Propio"</strong>.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'risk' && (
        <div className="space-y-6">
          {riskReport && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Promedio del Grupo</div>
                  <div className="mt-2 text-3xl font-black text-slate-900">{riskReport.summary.groupAverage} / 100</div>
                  <div className="mt-1 text-xs text-emerald-600 font-medium">Evaluado según ponderación MEP</div>
                </div>

                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-5 shadow-xs">
                  <div className="text-xs font-semibold text-rose-700 uppercase">Estudiantes en Alto Riesgo</div>
                  <div className="mt-2 text-3xl font-black text-rose-700">{riskReport.summary.highRiskCount}</div>
                  <div className="mt-1 text-xs text-rose-600 font-medium">Requieren intervención inmediata</div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
                  <div className="text-xs font-semibold text-amber-700 uppercase">Zona de Alerta Media</div>
                  <div className="mt-2 text-3xl font-black text-amber-700">{riskReport.summary.mediumRiskCount}</div>
                  <div className="mt-1 text-xs text-amber-600 font-medium">Monitoreo de tareas y asistencia</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-900">
                  Diagnóstico Individual y Plan de Apoyo Pedagógico Sugerido por IA
                </div>

                <div className="divide-y divide-slate-100">
                  {riskReport.diagnostics.map((st) => (
                    <div key={st.id} className="p-5 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{st.name}</span>
                          <span
                            className={cn(
                              'text-[10px] font-extrabold px-2 py-0.5 rounded border',
                              st.riskLevel === 'HIGH'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : st.riskLevel === 'MEDIUM'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            )}
                          >
                            RIESGO: {st.riskLevel}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 space-y-1">
                          <div className="font-semibold text-slate-700">Factores Detectados:</div>
                          <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                            {st.reasons.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="text-xs text-indigo-950 bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-100 mt-2">
                          <div className="font-bold flex items-center gap-1.5 text-indigo-900">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            Recomendación Pedagógica Sugerida:
                          </div>
                          <div className="mt-0.5 text-indigo-900">{st.recommendations.join(' ')}</div>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <div className="text-right">
                          <div className="text-xs text-slate-400">Promedio</div>
                          <div className="text-lg font-black font-mono text-slate-900">{st.avgGrade}</div>
                        </div>
                        {st.riskLevel !== 'LOW' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setStudentName(st.name);
                              setNoticeType(st.riskLevel === 'HIGH' ? 'low_grade_alert' : 'absence_alert');
                              setActiveTab('notices');
                            }}
                            className="text-xs"
                          >
                            Redactar Aviso al Padre
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'rubrics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-indigo-600" />
              Parámetros de la Rúbrica MEP
            </h3>

            <Input
              label="Tema o Aprendizaje Esperado"
              value={rubricTopic}
              onChange={(e) => setRubricTopic(e.target.value)}
              required
            />

            <Select
              label="Nivel / Año"
              name="gradeLevel"
              value={rubricGradeLevel}
              onChange={(e) => setRubricGradeLevel(e.target.value)}
              options={[
                { value: '7° Año', label: '7° Año' },
                { value: '8° Año', label: '8° Año' },
                { value: '9° Año', label: '9° Año' },
                { value: '10° Año', label: '10° Año' },
                { value: '11° Año', label: '11° Año' },
                { value: '12° Año (Técnico)', label: '12° Año (Técnico)' },
              ]}
            />

            <Select
              label="Tipo de Evaluación"
              name="evalType"
              value={rubricEvalType}
              onChange={(e: any) => setRubricEvalType(e.target.value)}
              options={[
                { value: 'tarea', label: 'Tarea / Asignación Cloud' },
                { value: 'cotidiano', label: 'Trabajo Cotidiano en Aula' },
                { value: 'proyecto', label: 'Proyecto / Investigación' },
              ]}
            />

            <Button
              variant="primary"
              onClick={handleGenerateRubric}
              disabled={loading}
              className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 font-bold"
            >
              <Sparkles className="w-4 h-4 mr-1.5 text-amber-300" />
              {loading ? 'Generando Rúbrica...' : 'Generar Rúbrica Oficial MEP'}
            </Button>
          </div>

          <div className="lg:col-span-7">
            {generatedRubric ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[11px] font-bold text-indigo-600 uppercase">Rúbrica de Aprendizaje</span>
                  <h3 className="text-base font-bold text-slate-900">{generatedRubric.title}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {generatedRubric.subject} • {generatedRubric.gradeLevel} • Total: {generatedRubric.totalPoints} pts
                  </div>
                </div>

                <div className="space-y-4">
                  {generatedRubric.criteria.map((c, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-xs text-slate-900">{c.name}</div>
                        <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {c.points} pts
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                        <div className="bg-emerald-50 p-2 rounded border border-emerald-200 text-emerald-950">
                          <strong>Avanzado:</strong> {c.levels.advanced}
                        </div>
                        <div className="bg-amber-50 p-2 rounded border border-amber-200 text-amber-950">
                          <strong>Intermedio:</strong> {c.levels.intermediate}
                        </div>
                        <div className="bg-slate-100 p-2 rounded border border-slate-200 text-slate-800">
                          <strong>Inicial:</strong> {c.levels.initial}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center bg-white text-slate-500 text-xs">
                <FileCheck className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-60" />
                Ingresa el tema y nivel educativo para generar los criterios oficiales MEP de evaluación (Inicial, Intermedio y Avanzado).
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
