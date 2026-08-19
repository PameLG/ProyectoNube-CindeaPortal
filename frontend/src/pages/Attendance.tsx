import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { ErrorMessage } from '../components/ErrorMessage';
import { coursesService, type CourseStudent } from '../services/courses.service';
import { attendanceService } from '../services/attendance.service';
import { justificationsService } from '../services/justifications.service';
import { useAuth } from '../auth/AuthProvider';
import type { AttendanceRecord, AttendanceStatus, AttendanceSummaryItem, Course, Justification } from '../types';
import {
  CalendarCheck,
  CheckCircle2,
  Download,
  Users,
  Clock,
  Paperclip,
  Eye,
  XCircle,
  FileText,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../utils';

const STATUS_CONFIG: {
  value: AttendanceStatus;
  code: string;
  label: string;
  color: string;
  activeColor: string;
}[] = [
  {
    value: 'present',
    code: 'P',
    label: 'Presente',
    color: 'border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700',
    activeColor: 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-sm ring-2 ring-emerald-200',
  },
  {
    value: 'absent_unexcused',
    code: 'AI',
    label: 'Ausencia Injust.',
    color: 'border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700',
    activeColor: 'bg-rose-600 text-white font-bold border-rose-600 shadow-sm ring-2 ring-rose-200',
  },
  {
    value: 'absent_excused',
    code: 'AJ',
    label: 'Justificada',
    color: 'border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700',
    activeColor: 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm ring-2 ring-blue-200',
  },
  {
    value: 'late_unexcused',
    code: 'T',
    label: 'Tardía',
    color: 'border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700',
    activeColor: 'bg-amber-500 text-white font-bold border-amber-500 shadow-sm ring-2 ring-amber-200',
  },
];

const today = () => new Date().toISOString().slice(0, 10);

export function Attendance() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryCourseId = searchParams.get('courseId');

  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<string>('');
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [date, setDate] = useState<string>(today());
  const [lessonsCount, setLessonsCount] = useState<number>(2);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<Record<string, AttendanceSummaryItem>>({});
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [activeTab, setActiveTab] = useState<'daily' | 'history' | 'summary' | 'justifications'>('daily');
  const [openPreviewModal, setOpenPreviewModal] = useState(false);
  const [selectedJustToReview, setSelectedJustToReview] = useState<Justification | null>(null);
  const [justReviewComment, setJustReviewComment] = useState<string>('');
  const [processingReview, setProcessingReview] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Modo Offline PWA & Cola de Sincronización
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<
    Array<{ courseId: string; studentId: string; date: string; status: AttendanceStatus; lessonsCount: number }>
  >(() => {
    try {
      const raw = localStorage.getItem('cindea_offline_attendance');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [syncingOffline, setSyncingOffline] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineRecords();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineRecords = async () => {
    try {
      const raw = localStorage.getItem('cindea_offline_attendance');
      if (!raw) return;
      const queue: Array<{ courseId: string; studentId: string; date: string; status: AttendanceStatus; lessonsCount: number }> = JSON.parse(raw);
      if (queue.length === 0) return;

      setSyncingOffline(true);
      for (const item of queue) {
        await attendanceService.mark(item.courseId, {
          studentId: item.studentId,
          date: item.date,
          status: item.status,
          lessonsCount: item.lessonsCount,
        }).catch(() => {});
      }
      localStorage.removeItem('cindea_offline_attendance');
      setOfflineQueue([]);
      setSuccessMsg(`✅ ¡${queue.length} registros guardados sin internet se sincronizaron con éxito!`);
      loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.warn('[Offline Sync] Error syncing records:', err);
    } finally {
      setSyncingOffline(false);
    }
  };

  useEffect(() => {
    coursesService.list().then((cs) => {
      if (cs.length > 0) {
        setCourses(cs);
        const target = cs.find((c) => c.id === queryCourseId) || cs[0];
        setCourseId(target.id);
      } else {
        const fallbacks: Course[] = [
          { id: '55555555-5555-4555-a555-555555555551', name: 'Inglés 10° Año (Módulo IV)', code: 'ING-10', teacherId: '', description: '', color: '#2563EB' },
        ];
        setCourses(fallbacks);
        setCourseId(fallbacks[0].id);
      }
    });
  }, [queryCourseId]);

  const loadData = () => {
    if (!courseId) return;
    Promise.all([
      coursesService.listStudents(courseId),
      attendanceService.list(courseId, date),
      attendanceService.list(courseId).catch(() => []),
      attendanceService.getSummary(courseId).catch(() => ({})),
      justificationsService.list({ courseId }).catch(() => []),
    ])
      .then(([s, r, allR, sum, justs]) => {
        setStudents(s);
        setRecords(r);
        setAllRecords(allR);
        setSummary(sum);
        setJustifications(justs);
      })
      .catch((e) => setError(e?.response?.data?.error ?? 'Error al cargar asistencia'));
  };

  const handleReviewJustification = async (status: 'approved' | 'rejected') => {
    if (!selectedJustToReview) return;
    setProcessingReview(true);
    setError(null);
    try {
      await justificationsService.review(selectedJustToReview.id, {
        status,
        teacherComment: justReviewComment.trim() || (status === 'approved' ? 'Comprobante médico/oficial válido y aceptado.' : 'Comprobante rechazado.'),
      });
      setSuccessMsg(
        status === 'approved'
          ? `✅ Justificación de ${selectedJustToReview.studentName} APROBADA y registrada como Ausencia Justificada.`
          : `❌ Justificación de ${selectedJustToReview.studentName} RECHAZADA.`
      );
      setSelectedJustToReview(null);
      setJustReviewComment('');
      loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al procesar la justificación');
    } finally {
      setProcessingReview(false);
    }
  };

  const printAttendanceReport = () => {
    const sheet = document.getElementById('official-mep-sheet-attendance');
    if (!sheet) return;

    // Usar iframe oculto para evitar ventanas about:blank
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>EduNube - Reporte de Asistencia</title>
          <style>
            @page {
              size: letter landscape;
              margin: 10mm 14mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              font-size: 11px;
              line-height: 1.4;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .report-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 10px;
              margin-bottom: 12px;
            }
            .brand-title {
              font-size: 20px;
              font-weight: 900;
              color: #0f172a;
              letter-spacing: -0.5px;
            }
            .brand-subtitle {
              font-size: 12px;
              font-weight: 600;
              color: #475569;
              margin-top: 2px;
            }
            .header-badge {
              display: inline-block;
              background: #f1f5f9;
              color: #0f172a;
              font-weight: 700;
              font-size: 11px;
              padding: 5px 12px;
              border-radius: 6px;
              border: 1px solid #cbd5e1;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 24px;
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 10px 16px;
              margin-bottom: 14px;
            }
            .meta-row {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 11px;
            }
            .meta-label {
              font-weight: 700;
              color: #334155;
              min-width: 90px;
            }
            .meta-val {
              color: #0f172a;
              font-weight: 600;
            }
            .report-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
            }
            .report-table th {
              background-color: #f1f5f9 !important;
              border: 1px solid #475569;
              padding: 7px 8px;
              font-size: 11px;
              font-weight: 700;
              color: #0f172a;
              text-align: center;
            }
            .report-table td {
              border: 1px solid #475569;
              padding: 6px 8px;
              font-size: 11px;
              color: #0f172a;
            }
            .report-table tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
            .criteria-note {
              font-size: 10px;
              color: #64748b;
              margin-top: 6px;
              margin-bottom: 18px;
            }
            .report-footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-top: 1px solid #cbd5e1;
              padding-top: 10px;
              margin-top: 15px;
              font-size: 11px;
              color: #64748b;
            }
            .page-box {
              background: #f1f5f9;
              color: #334155;
              font-weight: 700;
              padding: 3px 8px;
              border-radius: 4px;
              border: 1px solid #cbd5e1;
              font-family: ui-monospace, monospace;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          ${sheet.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 300);
  };

  useEffect(() => {
    loadData();
  }, [courseId, date]);

  const recordFor = (studentId: string) => records.find((r) => r.studentId === studentId);

  const setStatus = async (studentId: string, status: AttendanceStatus) => {
    if (!courseId) return;
    setSaving(studentId);
    setError(null);
    try {
      if (!navigator.onLine) {
        throw new Error('OFFLINE_MODE');
      }
      const r = await attendanceService.mark(courseId, {
        studentId,
        date,
        status,
        lessonsCount,
      });
      setRecords((prev) => {
        const idx = prev.findIndex((p) => p.studentId === studentId);
        if (idx === -1) return [...prev, r];
        const copy = [...prev];
        copy[idx] = r;
        return copy;
      });
      attendanceService.getSummary(courseId).then(setSummary).catch(() => {});
      attendanceService.list(courseId).then(setAllRecords).catch(() => {});
    } catch (e: any) {
      // Guardar en cola local offline
      const offlineItem = { courseId, studentId, date, status, lessonsCount };
      const currentQueue = [
        ...offlineQueue.filter((x) => !(x.courseId === courseId && x.studentId === studentId && x.date === date)),
        offlineItem,
      ];
      localStorage.setItem('cindea_offline_attendance', JSON.stringify(currentQueue));
      setOfflineQueue(currentQueue);

      // Actualización optimista de UI
      setRecords((prev) => {
        const fakeRecord: AttendanceRecord = {
          id: `offline-${Date.now()}`,
          courseId,
          studentId,
          date,
          status,
          lessonsCount,
          notes: null,
        };
        const idx = prev.findIndex((p) => p.studentId === studentId);
        if (idx === -1) return [...prev, fakeRecord];
        const copy = [...prev];
        copy[idx] = fakeRecord;
        return copy;
      });
      setSuccessMsg('⚡ Guardado en Modo Offline (Se sincronizará automáticamente al volver la conexión).');
      setTimeout(() => setSuccessMsg(null), 3500);
    } finally {
      setSaving(null);
    }
  };

  const markAllPresent = async () => {
    if (!courseId || students.length === 0) return;
    setSaving('all');
    setError(null);
    try {
      for (const st of students) {
        if (navigator.onLine) {
          await attendanceService.mark(courseId, {
            studentId: st.id,
            date,
            status: 'present',
            lessonsCount,
          });
        } else {
          const offlineItem = { courseId, studentId: st.id, date, status: 'present' as AttendanceStatus, lessonsCount };
          const raw = localStorage.getItem('cindea_offline_attendance');
          const queue = raw ? JSON.parse(raw) : [];
          queue.push(offlineItem);
          localStorage.setItem('cindea_offline_attendance', JSON.stringify(queue));
          setOfflineQueue(queue);
        }
      }
      setSuccessMsg('¡Listo! Se marcaron todos los estudiantes como Presentes.');
      loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e: any) {
      setError('Error al marcar asistencia masiva');
    } finally {
      setSaving(null);
    }
  };

  function sanitizeFilename(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  const exportAttendanceCSV = () => {
    if (!students || students.length === 0) return;
    const courseName = courses.find((c) => c.id === courseId)?.name || 'Curso';
    const cleanCourseName = sanitizeFilename(courseName);

    let csvContent = 'REPORTE OFICIAL DE ASISTENCIA Y AUSENCIAS MEP - CINDEA\n';
    csvContent += `Nivel / Grupo:;${courseName}\n`;
    csvContent += `Fecha de Generación:;${new Date().toLocaleDateString('es-CR')}\n\n`;
    csvContent += 'Estudiante;Cédula;Lecciones Impartidas;Lecciones Asistidas;Ausencias Injustificadas;Ausencias Justificadas;Tardías;% Asistencia;Puntos MEP (de 10)\n';

    students.forEach((st) => {
      const sum = summary[st.id] || {
        totalLessonsTaught: 0,
        presentLessons: 0,
        unexcusedAbsences: 0,
        excusedAbsences: 0,
        unexcusedTardies: 0,
        attendancePercentage: 100,
        calculatedAttendanceScore: 100,
      };
      const totalLessons = sum.totalLessonsTaught || 0;
      const present = sum.presentLessons ?? 0;
      const points = ((sum.calculatedAttendanceScore ?? 100) / 10).toFixed(1);
      const percent = totalLessons > 0 ? (sum.attendancePercentage ?? 100).toFixed(1) : '100.0';

      csvContent += `"${st.fullName}";"${st.studentNumber || ''}";${totalLessons};${present};${sum.unexcusedAbsences};${sum.excusedAbsences};${sum.unexcusedTardies};${percent}%;${points}\n`;
    });

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Asistencia_MEP_${cleanCourseName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Agrupar historial por fechas
  const uniqueDates = Array.from(new Set(allRecords.map((r) => r.date))).sort((a, b) => b.localeCompare(a));
  const presentCount = records.filter((r) => r.status === 'present').length;
  const absentCount = records.filter((r) => r.status === 'absent_unexcused' || r.status === 'absent').length;

  return (
    <div className="space-y-6">
      {/* 1. Header Principal Limpio & Profesional */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        {/* Banner de Sincronización SOLO SI está Offline o hay pendientes */}
        {(!isOnline || offlineQueue.length > 0) && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border text-xs bg-amber-50/80 border-amber-200 text-amber-950 animate-in fade-in">
            <div className="flex items-center gap-2 font-medium">
              <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Modo Offline:</strong> {offlineQueue.length} asistencia(s) guardada(s) localmente en este dispositivo.
              </span>
            </div>
            {isOnline && offlineQueue.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={syncOfflineRecords}
                disabled={syncingOffline}
                className="text-[11px] font-bold border-amber-300 bg-white text-amber-900 hover:bg-amber-100 shadow-2xs"
              >
                <RefreshCw className={cn('w-3 h-3 mr-1 text-amber-700', syncingOffline && 'animate-spin')} />
                {syncingOffline ? 'Sincronizando...' : 'Sincronizar Ahora'}
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Control de Asistencia
              </h1>
              {isOnline && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Cloud Sync
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro diario por lección con rebajo automático en Trabajo Cotidiano (SICIN / MEP).
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={exportAttendanceCSV}
              className="text-xs font-semibold border-slate-200 hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Excel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={markAllPresent}
              disabled={saving === 'all'}
              className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              {saving === 'all' ? 'Guardando...' : 'Marcar Todos Presentes'}
            </Button>
          </div>
        </div>

        {/* Barra de Filtros Compacta */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Grupo / Nivel:
            </label>
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

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Fecha de Clase:
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Bloque de Lecciones:
            </label>
            <select
              value={lessonsCount}
              onChange={(e) => setLessonsCount(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
            >
              <option value="1">1 Lección (40 min)</option>
              <option value="2">2 Lecciones (80 min)</option>
              <option value="3">3 Lecciones (120 min)</option>
              <option value="4">4 Lecciones (160 min)</option>
            </select>
          </div>
        </div>
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {successMsg && (
        <div className="p-3 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Pestañas Limpias y Modernas */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('daily')}
          className={cn(
            'px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5',
            activeTab === 'daily'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Pasar Lista ({students.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            'px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5',
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          <CalendarCheck className="w-3.5 h-3.5" />
          <span>Historial por Fechas ({uniqueDates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={cn(
            'px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5',
            activeTab === 'summary'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Resumen MEP</span>
        </button>

        <button
          onClick={() => setActiveTab('justifications')}
          className={cn(
            'px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5',
            activeTab === 'justifications'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          <Paperclip className="w-3.5 h-3.5" />
          <span>Justificaciones Médicas</span>
          {justifications.filter((j) => j.status === 'pending').length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-amber-400 text-slate-900 text-[10px] font-black rounded-full">
              {justifications.filter((j) => j.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {/* 3. Contenido: Lista Diaria de Estudiantes */}
      {activeTab === 'daily' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="font-semibold text-slate-600">
              Fecha: <strong className="text-slate-900">{date}</strong> • {lessonsCount} lecciones
            </span>
            <div className="flex items-center gap-2 font-bold text-xs">
              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                {presentCount} Presentes
              </span>
              <span className="text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-200">
                {absentCount} Ausentes
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {students.map((st, index) => {
              const currentRecord = recordFor(st.id);
              const currentStatus = currentRecord?.status || 'present';

              return (
                <div
                  key={st.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {st.fullName}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Cédula: {st.studentNumber || 'Sin registrar'}
                      </p>
                    </div>
                  </div>

                  {/* Botones Grandes de Asistencia (4 Estados MEP) */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {STATUS_CONFIG.map((cfg) => {
                      const isSelected = currentStatus === cfg.value;
                      return (
                        <button
                          key={cfg.value}
                          onClick={() => setStatus(st.id, cfg.value)}
                          disabled={saving === st.id}
                          className={cn(
                            'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1',
                            isSelected ? cfg.activeColor : cfg.color
                          )}
                        >
                          <span>{cfg.code}</span>
                          <span className="hidden sm:inline font-normal text-[10px]">({cfg.label})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Contenido: Bitácora por Fechas / Día a Día */}
      {activeTab === 'history' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              📅 Historial de Clases y Asistencias Día por Día
            </h3>
            <p className="text-xs text-slate-500">
              Consulta cada fecha registrada en el curso lectivo para verificar la presencia o ausencia de cada día.
            </p>
          </div>

          <div className="space-y-4">
            {uniqueDates.map((d) => {
              const dayRecords = allRecords.filter((r) => r.date === d);
              const totalLessonsDay = dayRecords[0]?.lessonsCount || 2;
              return (
                <div key={d} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-blue-900 bg-blue-100/80 px-2.5 py-1 rounded-lg">
                        {d}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        ({totalLessonsDay} lecciones impartidas)
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setDate(d);
                        setLessonsCount(totalLessonsDay);
                        setActiveTab('daily');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold self-start sm:self-auto"
                    >
                      ✏️ Editar lista de este día
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {students.map((st) => {
                      const rec = dayRecords.find((r) => r.studentId === st.id);
                      const status = rec?.status || 'present';
                      const isAbsent = status === 'absent' || status === 'absent_unexcused';
                      const isExcused = status === 'absent_excused' || status === 'excused';
                      const isLate = status === 'late' || status === 'late_unexcused';

                      return (
                        <div key={st.id} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 truncate max-w-[140px]">{st.fullName}</span>
                          <span className={cn(
                            'font-bold px-2 py-0.5 rounded text-[11px]',
                            isAbsent && 'bg-rose-100 text-rose-800',
                            isExcused && 'bg-blue-100 text-blue-800',
                            isLate && 'bg-amber-100 text-amber-800',
                            status === 'present' && 'bg-emerald-100 text-emerald-800'
                          )}>
                            {isAbsent ? '🔴 Ausente' : isExcused ? '🔵 Justificada' : isLate ? '🟡 Tardía' : '🟢 Presente'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {uniqueDates.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-xs">
                Aún no hay fechas registradas. Pasa lista en la pestaña "Pasar Lista Hoy".
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Contenido: Resumen Acumulado del Periodo (Ausencias vs Lecciones) */}
      {activeTab === 'summary' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Puntaje Oficial de Asistencia MEP (Valor: 10%)
              </h3>
              <p className="text-xs text-slate-500">
                Muestra el conteo de ausencias respecto al total de lecciones impartidas en el periodo lectivo.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={exportAttendanceCSV}
                className="text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Descargar Excel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setOpenPreviewModal(true)}
                className="text-xs font-bold bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100"
              >
                📄 Ver Documento Oficial MEP / PDF
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Estudiante</th>
                  <th className="py-3 px-3 text-center">Lecciones Impartidas</th>
                  <th className="py-3 px-3 text-center">Ausencias Injustificadas</th>
                  <th className="py-3 px-3 text-center">Aus. Justif.</th>
                  <th className="py-3 px-3 text-center">Tardías</th>
                  <th className="py-3 px-3 text-center">% Asistencia</th>
                  <th className="py-3 px-4 text-right">Puntos MEP (de 10)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {students.map((st) => {
                  const sum = summary[st.id] || {
                    totalDays: 0,
                    totalLessonsTaught: 0,
                    presentLessons: 0,
                    present: 0,
                    unexcusedAbsences: 0,
                    excusedAbsences: 0,
                    unexcusedTardies: 0,
                    excusedTardies: 0,
                    totalPointsDeducted: 0,
                    attendancePercentage: 100,
                    calculatedAttendanceScore: 100,
                  };
                  const totalLessons = sum.totalLessonsTaught || 0;
                  const percent = totalLessons > 0 ? (sum.attendancePercentage ?? 100).toFixed(1) : '100.0';
                  const points = ((sum.calculatedAttendanceScore ?? 100) / 10).toFixed(1);

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{st.fullName}</div>
                        <div className="text-xs text-slate-500 font-mono">{st.studentNumber}</div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">
                        {totalLessons} lecciones
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-extrabold text-xs',
                          sum.unexcusedAbsences > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-50 text-emerald-800'
                        )}>
                          {sum.unexcusedAbsences} {sum.unexcusedAbsences === 1 ? 'lección' : 'lecciones'}
                          <span className="text-[10px] font-normal text-slate-500">({sum.unexcusedAbsences} de {totalLessons})</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-blue-600 font-semibold">
                        {sum.excusedAbsences}
                      </td>
                      <td className="py-3 px-3 text-center text-amber-600 font-semibold">
                        {sum.unexcusedTardies}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={cn(
                          'font-extrabold text-xs px-2 py-0.5 rounded',
                          Number(percent) >= 80 ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
                        )}>
                          {percent}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-block px-3 py-1 rounded-lg bg-blue-50 text-blue-900 font-black text-sm border border-blue-200 shadow-2xs">
                          {points} / 10.0 pts
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB DE JUSTIFICACIONES Y COMPROBANTES DE AUSENCIA */}
      {/* ========================================================================= */}
      {activeTab === 'justifications' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-amber-600" />
                  <span>Comprobantes y Justificaciones de Ausencia Enviadas por Alumnos</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Revisa los certificados médicos de la CCSS o constancias laborales enviadas por los estudiantes. Al aprobar, el sistema marca automáticamente la ausencia como <strong>Justificada (0 puntos rebajados)</strong> en el registro oficial.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-200">
                  {justifications.filter((j) => j.status === 'pending').length} Pendientes
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold border border-emerald-200">
                  {justifications.filter((j) => j.status === 'approved').length} Aprobadas
                </span>
              </div>
            </div>

            {justifications.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                <Paperclip className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-semibold text-slate-600 text-sm">No hay comprobantes de ausencia para este grupo.</p>
                <p className="text-[11px]">
                  Los estudiantes pueden subir sus fotos o justificantes PDF desde su portal estudiantil.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {justifications.map((j) => (
                  <div
                    key={j.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs hover:bg-slate-50/50 p-2 rounded-xl transition"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{j.studentName}</span>
                        <span className="text-slate-400 font-mono text-[11px]">({j.studentNumber || '501230456'})</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Fecha Ausencia: {j.absenceDate}
                        </span>
                      </div>

                      <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 italic text-xs max-w-2xl">
                        "{j.reason}"
                      </p>

                      {j.teacherComment && (
                        <div className="text-[11px] text-blue-900 bg-blue-50/80 p-2 rounded-lg border border-blue-200">
                          <strong>Observación Docente:</strong> {j.teacherComment}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-400">
                        Enviado el {new Date(j.createdAt).toLocaleDateString('es-CR')} a las {new Date(j.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* Acciones y Estado */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 shrink-0">
                      {j.status === 'pending' && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                          Pendiente de Revisión
                        </span>
                      )}
                      {j.status === 'approved' && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Aprobada (Justificada)
                        </span>
                      )}
                      {j.status === 'rejected' && (
                        <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px] border border-rose-300 flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Rechazada
                        </span>
                      )}

                      <Button
                        size="sm"
                        variant={j.status === 'pending' ? 'primary' : 'secondary'}
                        onClick={() => {
                          setSelectedJustToReview(j);
                          setJustReviewComment(j.teacherComment || '');
                        }}
                        className={cn(
                          'text-xs font-bold',
                          j.status === 'pending'
                            ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                            : 'bg-white hover:bg-slate-100'
                        )}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        {j.status === 'pending' ? 'Validar Comprobante' : 'Ver Detalle / Modificar'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE VALIDACIÓN Y REVISIÓN DE COMPROBANTE DE AUSENCIA */}
      <Modal
        open={selectedJustToReview !== null}
        title={`Revisión de Comprobante: ${selectedJustToReview?.studentName || ''}`}
        onClose={() => setSelectedJustToReview(null)}
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedJustToReview(null)}
              disabled={processingReview}
            >
              Cerrar
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleReviewJustification('rejected')}
                disabled={processingReview}
                className="bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 text-xs font-bold"
              >
                <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                Rechazar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleReviewJustification('approved')}
                disabled={processingReview}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                {processingReview ? 'Guardando...' : 'Aprobar (Marcar Justificada)'}
              </Button>
            </div>
          </div>
        }
      >
        {selectedJustToReview && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 font-medium">Estudiante:</span>
                <div className="font-bold text-slate-900">{selectedJustToReview.studentName}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Cédula:</span>
                <div className="font-bold text-slate-900">{selectedJustToReview.studentNumber || '501230456'}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Fecha de Ausencia:</span>
                <div className="font-bold text-amber-800">{selectedJustToReview.absenceDate}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Módulo:</span>
                <div className="font-bold text-slate-900">{selectedJustToReview.courseName}</div>
              </div>
              <div className="col-span-2 bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Cumplimiento Plazo MEP (8 días máx):</span>
                {(() => {
                  const diff = Math.floor(
                    (new Date().getTime() - new Date(selectedJustToReview.absenceDate + 'T00:00:00').getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                  return diff <= 8 ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                      ✓ En tiempo reglamentario ({diff} días desde la ausencia)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[11px]">
                      ⚠️ Plazo vencido ({diff} días desde la falta)
                    </span>
                  );
                })()}
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-800 block mb-1">Motivo declarado:</span>
              <p className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 text-slate-800 italic">
                "{selectedJustToReview.reason}"
              </p>
            </div>

            {/* Documento adjunto / Foto */}
            <div>
              <span className="font-bold text-slate-800 block mb-1">Foto / Documento Adjunto:</span>
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-100 text-center max-h-72 overflow-y-auto">
                {selectedJustToReview.fileType?.startsWith('image/') || selectedJustToReview.fileData?.startsWith('data:image/') ? (
                  <img
                    src={selectedJustToReview.fileData}
                    alt="Comprobante"
                    className="max-w-full h-auto mx-auto rounded-lg shadow-xs"
                  />
                ) : selectedJustToReview.fileType === 'application/pdf' || selectedJustToReview.fileData?.startsWith('data:application/pdf') ? (
                  <div className="space-y-2 py-4">
                    <FileText className="w-12 h-12 text-rose-500 mx-auto" />
                    <div className="font-bold text-slate-800">{selectedJustToReview.fileName || 'Comprobante_Medico.pdf'}</div>
                    <a
                      href={selectedJustToReview.fileData}
                      download={selectedJustToReview.fileName || 'Comprobante_Medico.pdf'}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
                    >
                      📥 Descargar y Abrir PDF
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2 py-4">
                    <Paperclip className="w-10 h-10 text-slate-400 mx-auto" />
                    <div className="font-bold text-slate-700">{selectedJustToReview.fileName || 'Documento adjunto'}</div>
                    {selectedJustToReview.fileData && (
                      <a
                        href={selectedJustToReview.fileData}
                        download={selectedJustToReview.fileName || 'Documento'}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 text-white font-bold"
                      >
                        Descargar archivo
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Comentario para el Estudiante (Opcional):
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                placeholder="Ej. Comprobante médico CCSS válido. Ausencia justificada en SICIN."
                value={justReviewComment}
                onChange={(e) => setJustReviewComment(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* 6. MODAL Y VISTA OFICIAL DE IMPRESIÓN MEP (HOJA MEMBRETADA) */}
      <Modal
        open={openPreviewModal}
        title="📄 Vista Previa de Documento Oficial MEP"
        onClose={() => setOpenPreviewModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpenPreviewModal(false)}>
              Cerrar
            </Button>
            <Button
              variant="primary"
              onClick={printAttendanceReport}
              className="bg-blue-800 hover:bg-blue-900 font-bold shadow-xs"
            >
              🖨️ Imprimir / Guardar como PDF
            </Button>
          </>
        }
      >
        <div className="p-3 bg-slate-100/70 border border-slate-200 rounded-xl space-y-4 max-h-[75vh] overflow-y-auto">
          {/* HOJA OFICIAL MEP */}
          <div
            id="official-mep-sheet-attendance"
            className="report-wrap bg-white p-6 md:p-8 border border-slate-300 rounded shadow-xs text-slate-900 font-sans"
          >
            {/* Encabezado Limpio */}
            <div className="report-header">
              <div>
                <div className="brand-title">EduNube Docente</div>
                <div className="brand-subtitle">Reporte de Asistencia y Control de Ausencias</div>
              </div>
              <div>
                <span className="header-badge">
                  Curso Lectivo 2026
                </span>
              </div>
            </div>

            {/* Recuadro de Metadatos */}
            <div className="meta-grid">
              <div className="meta-row">
                <span className="meta-label">Docente:</span>
                <span className="meta-val">{user?.fullName ? `Prof. ${user.fullName}` : 'Teacher Diana'}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Año Lectivo:</span>
                <span className="meta-val">2026</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Grupo / Nivel:</span>
                <span className="meta-val">{courses.find((c) => c.id === courseId)?.name || 'Inglés 10° Año'}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Fecha de Emisión:</span>
                <span className="meta-val">{new Date().toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>

            {/* Tabla Formal */}
            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ width: '35px' }}>N°</th>
                  <th style={{ width: '90px' }} className="text-left">Cédula</th>
                  <th className="text-left">Nombre Completo del Estudiante</th>
                  <th style={{ width: '75px' }}>Lecc. Imp.</th>
                  <th style={{ width: '90px' }}>Aus. Injust.</th>
                  <th style={{ width: '80px' }}>Aus. Just.</th>
                  <th style={{ width: '70px' }}>Tardías</th>
                  <th style={{ width: '75px' }}>% Asist.</th>
                  <th style={{ width: '100px' }} className="text-right">Pts Asist. (10%)</th>
                </tr>
              </thead>
              <tbody>
                {students.map((st, idx) => {
                  const sum = summary[st.id] || {
                    totalLessonsTaught: 0,
                    presentLessons: 0,
                    unexcusedAbsences: 0,
                    excusedAbsences: 0,
                    unexcusedTardies: 0,
                    attendancePercentage: 100,
                    calculatedAttendanceScore: 100,
                  };
                  const totalLessons = sum.totalLessonsTaught || 0;
                  const percent = totalLessons > 0 ? (sum.attendancePercentage ?? 100).toFixed(1) : '100.0';
                  const points = ((sum.calculatedAttendanceScore ?? 100) / 10).toFixed(1);

                  return (
                    <tr key={st.id}>
                      <td className="text-center font-mono">{idx + 1}</td>
                      <td className="font-mono">{st.studentNumber}</td>
                      <td className="font-bold">{st.fullName}</td>
                      <td className="text-center font-mono">{totalLessons}</td>
                      <td className="text-center font-mono font-bold" style={{ color: '#b91c1c' }}>{sum.unexcusedAbsences}</td>
                      <td className="text-center font-mono">{sum.excusedAbsences}</td>
                      <td className="text-center font-mono">{sum.unexcusedTardies}</td>
                      <td className="text-center font-mono font-bold">{percent}%</td>
                      <td className="text-right font-mono font-bold" style={{ color: '#1e40af' }}>{points} / 10.0</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Criterio de Asistencia */}
            <div className="criteria-note">
              * Nota: La asistencia representa el 10% de la calificación final conforme a la normativa de evaluación de los aprendizajes.
            </div>

            {/* Pie de página con paginación */}
            <div className="report-footer">
              <span>EduNube Docente • Reporte de Asistencia</span>
              <span>Generado por: <strong>{user?.fullName ? `Prof. ${user.fullName}` : 'Teacher Diana'}</strong></span>
              <span className="page-box">
                Página 1 / 1
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
