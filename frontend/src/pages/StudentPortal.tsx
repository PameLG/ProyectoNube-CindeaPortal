import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { Modal } from '../components/Modal';
import { coursesService } from '../services/courses.service';
import { studentsService } from '../services/students.service';
import { assignmentsService } from '../services/assignments.service';
import { gradesService } from '../services/grades.service';
import { attendanceService } from '../services/attendance.service';
import { announcementsService } from '../services/announcements.service';
import { aiService } from '../services/ai.service';
import { justificationsService } from '../services/justifications.service';
import type { Course, Assignment, Grade, Announcement, AttendanceSummaryItem, Justification, Submission } from '../types';
import {
  Home,
  FileEdit,
  FolderCheck,
  GraduationCap,
  Sparkles,
  Bot,
  Clock,
  CheckCircle2,
  FolderUp,
  FileText,
  MessageCircle,
  LogOut,
  ChevronRight,
  Languages,
  Mic,
  Send,
  User,
  Paperclip,
  UploadCloud,
  Eye,
  Camera,
  AlertTriangle,
  Clock3,
  XCircle,
  Menu,
  Award,
  X,
} from 'lucide-react';
import { cn } from '../utils';

// Estudiante Demo por defecto en CINDEA
interface StudentProfile {
  id: string;
  name: string;
  carnet: string;
  age: number;
  isMinor: boolean;
  guardianName: string;
  moduleName: string;
}

const DEMO_STUDENTS: StudentProfile[] = [
  {
    id: 'f9ce132a-c22a-41b4-98a1-bdf45c14fd39',
    name: 'Pamela Leiva',
    carnet: '501230456',
    age: 21,
    isMinor: false,
    guardianName: 'Familia Leiva (Contacto Principal)',
    moduleName: 'Inglés CINDEA (10° y 11° Año)',
  },
];

const DAILY_ENGLISH_TIPS = [
  {
    idiom: 'Piece of cake 🍰',
    meaning: 'Algo muy fácil de hacer.',
    example: '"Don’t worry about the English exam, it’s a piece of cake if you practice!"',
  },
  {
    idiom: 'Hit the books 📚',
    meaning: 'Ponerse a estudiar con entusiasmo.',
    example: '"I have my CINDEA English test tomorrow, so I need to hit the books tonight."',
  },
  {
    idiom: 'Break a leg! 🎭',
    meaning: '¡Buena suerte! (Se usa antes de una presentación o prueba).',
    example: '"Break a leg on your English oral dialogue today!"',
  },
];

export function StudentPortal() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assignments' | 'grades' | 'tutor' | 'justifications'>('dashboard');
  
  // Perfil del estudiante activo
  const [currentStudent, setCurrentStudent] = useState<StudentProfile>(DEMO_STUDENTS[0]);

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [myGrades, setMyGrades] = useState<Grade[]>([]);
  const [myAttendanceSummary, setMyAttendanceSummary] = useState<AttendanceSummaryItem | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // Justificaciones de Ausencia
  const [myJustifications, setMyJustifications] = useState<Justification[]>([]);
  const [justAbsenceDate, setJustAbsenceDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [justReason, setJustReason] = useState<string>('');
  const [justFileName, setJustFileName] = useState<string>('');
  const [justFileData, setJustFileData] = useState<string>('');
  const [justFileType, setJustFileType] = useState<string>('');
  const [justSubmitting, setJustSubmitting] = useState<boolean>(false);
  const [justSuccess, setJustSuccess] = useState<string | null>(null);
  const [justError, setJustError] = useState<string | null>(null);
  const [selectedJustificationDoc, setSelectedJustificationDoc] = useState<Justification | null>(null);

  useEffect(() => {
    if (user) {
      // Buscar información del estudiante en la base de datos
      studentsService.list().then((allStudents) => {
        const found = allStudents.find(
          (s) =>
            s.userId === user.id ||
            s.id === user.id ||
            s.fullName?.toLowerCase() === user.fullName?.toLowerCase() ||
            (s.studentNumber && user.email && s.studentNumber === user.email)
        );

        if (found) {
          setCurrentStudent({
            id: found.id,
            name: found.fullName || user.fullName || 'Estudiante',
            carnet: found.studentNumber || user.email || 'Sin cédula',
            age: 20,
            isMinor: false,
            guardianName: found.guardianName || 'Contacto Principal',
            moduleName: found.gradeLevel || 'Inglés CINDEA',
          });
          if (found.courseId) {
            setSelectedCourseId(found.courseId);
          }
        } else {
          // Estudiante creado recientemente o logueado directamente
          setCurrentStudent({
            id: user.id,
            name: user.fullName || 'Estudiante CINDEA',
            carnet: (user.email && !user.email.includes('@') ? user.email : user.email?.split('@')[0]) || '501230456',
            age: 20,
            isMinor: false,
            guardianName: 'Contacto Principal',
            moduleName: 'Inglés CINDEA',
          });
        }
      }).catch(() => {
        setCurrentStudent({
          id: user.id,
          name: user.fullName || 'Estudiante CINDEA',
          carnet: (user.email && !user.email.includes('@') ? user.email : user.email?.split('@')[0]) || '501230456',
          age: 20,
          isMinor: false,
          guardianName: 'Contacto Principal',
          moduleName: 'Inglés CINDEA',
        });
      });
    }
  }, [user]);

  // Subida de tarea
  const [selectedTask, setSelectedTask] = useState<Assignment | null>(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileType, setUploadFileType] = useState<'pdf' | 'docx' | 'audio'>('pdf');
  const [uploadFileContent, setUploadFileContent] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Tutor IA
  const [tutorQuestion, setTutorQuestion] = useState('');
  const [tutorChat, setTutorChat] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: 'Hello! I am your CINDEA English AI Tutor. You can ask me questions about English grammar, vocabulary, pronunciation, or check your homework sentences in English or Spanish! 🇬🇧✨',
    },
  ]);
  const [tutorLoading, setTutorLoading] = useState(false);

  // Tip del día
  const dailyTip = DAILY_ENGLISH_TIPS[0];

  useEffect(() => {
    coursesService.list().then((cs) => {
      setCourses(cs);
      if (cs[0] && !selectedCourseId) setSelectedCourseId(cs[0].id);
    });
    announcementsService.list().then(setAnnouncements).catch(() => {});
  }, []);

  const loadStudentData = () => {
    if (!selectedCourseId) return;
    assignmentsService.list(selectedCourseId).then(setAssignments).catch(() => {});
    
    // Cargar entregas del estudiante para marcar tareas entregadas
    assignmentsService.listStudentSubmissions(currentStudent.id).then(setSubmissions).catch(() => {});

    // Cargar calificaciones y filtrar EXCLUSIVAMENTE las del estudiante activo
    gradesService.listGrades(selectedCourseId).then((allGrades) => {
      const studentOnly = allGrades.filter((g) => g.studentId === currentStudent.id);
      setMyGrades(studentOnly);
    }).catch(() => {});

    // Resumen de asistencia del estudiante
    attendanceService.getSummary(selectedCourseId).then((sum) => {
      if (sum[currentStudent.id]) {
        setMyAttendanceSummary(sum[currentStudent.id]);
      } else {
        setMyAttendanceSummary(null);
      }
    }).catch(() => {});

    // Cargar justificaciones del estudiante
    justificationsService.list({ studentId: currentStudent.id }).then(setMyJustifications).catch(() => {});
  };

  const getAbsenceDateBounds = () => {
    const now = new Date();
    const max = now.toISOString().slice(0, 10);
    const minDate = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    const min = minDate.toISOString().slice(0, 10);
    return { min, max };
  };

  const handleSendJustification = async (e: FormEvent) => {
    e.preventDefault();
    if (!justReason.trim()) {
      setJustError('Por favor escribe el motivo o explicación de la ausencia.');
      return;
    }

    const selectedDate = new Date(justAbsenceDate + 'T00:00:00');
    const now = new Date();
    const diffTime = now.getTime() - selectedDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 8) {
      setJustError(
        `⚠️ Plazo reglamentario MEP vencido: Han transcurrido ${diffDays} días desde la fecha de la falta (${justAbsenceDate}). La normativa del MEP estipula un plazo máximo de 8 días para presentar justificaciones.`
      );
      return;
    }

    if (diffDays < 0) {
      setJustError('⚠️ La fecha de ausencia no puede ser una fecha futura.');
      return;
    }

    setJustSubmitting(true);
    setJustError(null);
    setJustSuccess(null);

    const activeCourse = courses.find((c) => c.id === selectedCourseId);

    try {
      await justificationsService.create({
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        studentNumber: currentStudent.carnet,
        courseId: selectedCourseId || '55555555-5555-4555-a555-555555555551',
        courseName: activeCourse?.name || 'Inglés CINDEA',
        absenceDate: justAbsenceDate,
        reason: justReason.trim(),
        fileName: justFileName || undefined,
        fileType: justFileType || undefined,
        fileData: justFileData || undefined,
      });

      setJustSuccess('¡Comprobante enviado exitosamente! La profesora Diana recibirá la notificación en su panel para validarlo.');
      setJustReason('');
      setJustFileName('');
      setJustFileData('');
      setJustFileType('');
      
      // Recargar lista
      justificationsService.list({ studentId: currentStudent.id }).then(setMyJustifications).catch(() => {});
      setTimeout(() => setJustSuccess(null), 5000);
    } catch (err: any) {
      setJustError(err?.response?.data?.error || 'Error al enviar la justificación. Intente de nuevo.');
    } finally {
      setJustSubmitting(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [selectedCourseId, currentStudent]);

  // Cálculo privado de nota final ponderada MEP para el estudiante
  const calculateMyFinalGrade = () => {
    const hasAnyGrade = myGrades.length > 0;
    const cotidianoGrades = myGrades.filter((g) => g.category?.includes('Cotidiano'));
    const cotidianoAvg = cotidianoGrades.length > 0
      ? cotidianoGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / cotidianoGrades.length
      : 0;

    const pruebasGrades = myGrades.filter((g) => g.category?.includes('Pruebas') || g.category?.includes('Exámenes'));
    const pruebasAvg = pruebasGrades.length > 0
      ? pruebasGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / pruebasGrades.length
      : 0;

    const tareasGrades = myGrades.filter((g) => g.category?.includes('Tareas'));
    const tareasAvg = tareasGrades.length > 0
      ? tareasGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / tareasGrades.length
      : 0;

    const asistenciaScore = myAttendanceSummary?.calculatedAttendanceScore ?? 100;
    const totalScore = hasAnyGrade
      ? Math.round(cotidianoAvg * 0.5 + pruebasAvg * 0.3 + tareasAvg * 0.1 + (asistenciaScore * 0.1))
      : 0;

    const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];
    const courseName = activeCourse?.name || '';
    const isDiversificada =
      courseName.includes('10') ||
      courseName.includes('11') ||
      courseName.includes('12') ||
      courseName.includes('IV') ||
      courseName.includes('V') ||
      courseName.includes('VI') ||
      courseName.includes('Bachillerato');

    const minPassing = isDiversificada ? 70 : 65;
    const minConvocatoria = isDiversificada ? 60 : 55;

    const status = !hasAnyGrade
      ? 'EN CURSO'
      : totalScore >= minPassing
      ? 'APROBADO'
      : totalScore >= minConvocatoria
      ? 'CONVOCATORIA'
      : 'REPROBADO';

    return {
      cotidianoAvg: Math.round(cotidianoAvg),
      pruebasAvg: Math.round(pruebasAvg),
      tareasAvg: Math.round(tareasAvg),
      asistenciaScore: Math.round(asistenciaScore),
      totalScore,
      minPassing,
      status,
      hasAnyGrade,
    };
  };

  const myGradeSummary = calculateMyFinalGrade();

  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const handleUploadAssignment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !uploadFileName) return;
    setUploading(true);
    setUploadSuccess(null);
    try {
      await assignmentsService.submitAssignment({
        assignmentId: selectedTask.id,
        studentId: currentStudent.id,
        fileName: uploadFileName,
        fileSize: uploadFile?.size || 1024 * 50,
        fileData: uploadFileContent,
      });
      setUploadSuccess(`¡Tu trabajo "${uploadFileName}" se ha entregado y guardado en Google Drive con éxito!`);
      setTimeout(() => {
        setSelectedTask(null);
        setUploadFileName('');
        setUploadFileContent('');
        setUploadFile(null);
        setUploadSuccess(null);
        loadStudentData();
      }, 2500);
    } catch (_) {
      alert('Error al enviar la tarea');
    } finally {
      setUploading(false);
    }
  };

  const handleAskTutor = async (e: FormEvent) => {
    e.preventDefault();
    if (!tutorQuestion.trim() || tutorLoading) return;
    const q = tutorQuestion;
    setTutorQuestion('');
    setTutorChat((prev) => [...prev, { sender: 'user', text: q }]);
    setTutorLoading(true);

    try {
      const currentCourse = courses.find((c) => c.id === selectedCourseId);
      const res = await aiService.askTutor({
        subject: currentCourse?.name || 'Inglés CINDEA',
        question: q,
        studentGradeLevel: currentStudent?.moduleName || 'Módulo 52',
      });
      setTutorChat((prev) => [...prev, { sender: 'ai', text: res.answer }]);
    } catch (err: any) {
      console.error('Tutor error:', err);
      const msg = err?.response?.data?.error || 'Lo siento, no pude procesar tu pregunta en este momento. Por favor intenta de nuevo.';
      setTutorChat((prev) => [
        ...prev,
        { sender: 'ai', text: msg },
      ]);
    } finally {
      setTutorLoading(false);
    }
  };

  const currentCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <div className="flex flex-1 min-h-screen">
        {/* Sidebar Desktop Limpia y Espaciosa (Idéntica a la vista Docente) */}
        <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex shrink-0">
          {/* Header del CINDEA */}
          <div className="p-6 border-b border-slate-100 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600/80 text-white flex items-center justify-center shadow-inner font-bold">
                <Languages className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight">CINDEA MEP Cloud</div>
                <div className="text-[11px] text-blue-200">Portal Estudiantil</div>
              </div>
            </div>
          </div>

          {/* Navegación Simple y Amigable */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Menú Principal
            </div>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all group text-left',
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Home
                className={cn(
                  'w-4 h-4 transition shrink-0',
                  activeTab === 'dashboard' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                )}
              />
              <span>Inicio</span>
            </button>

            <button
              onClick={() => setActiveTab('assignments')}
              className={cn(
                'w-full flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition-all group text-left',
                activeTab === 'assignments'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <div className="flex items-center gap-3">
                <FolderCheck
                  className={cn(
                    'w-4 h-4 transition shrink-0',
                    activeTab === 'assignments' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                  )}
                />
                <span>Tareas y Entregas</span>
              </div>
              {assignments.length > 0 && (
                <span
                  className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full',
                    activeTab === 'assignments' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {assignments.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('grades')}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all group text-left',
                activeTab === 'grades'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <GraduationCap
                className={cn(
                  'w-4 h-4 transition shrink-0',
                  activeTab === 'grades' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                )}
              />
              <span>Calificaciones MEP</span>
            </button>

            <button
              onClick={() => setActiveTab('justifications')}
              className={cn(
                'w-full flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition-all group text-left',
                activeTab === 'justifications'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <div className="flex items-center gap-3">
                <Paperclip
                  className={cn(
                    'w-4 h-4 transition shrink-0',
                    activeTab === 'justifications' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                  )}
                />
                <span>Comprobantes de Ausencia</span>
              </div>
              {myJustifications.length > 0 && (
                <span
                  className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full',
                    activeTab === 'justifications' ? 'bg-blue-500 text-white' : 'bg-amber-100 text-amber-800'
                  )}
                >
                  {myJustifications.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('tutor')}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all group text-left',
                activeTab === 'tutor'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Sparkles
                className={cn(
                  'w-4 h-4 transition shrink-0',
                  activeTab === 'tutor' ? 'text-amber-300' : 'text-slate-400 group-hover:text-blue-600'
                )}
              />
              <span>English AI Tutor</span>
            </button>
          </nav>

          {/* Perfil del Estudiante en el Footer de la Sidebar */}
          <div className="border-t border-slate-100 p-4 bg-slate-50/70">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {currentStudent.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {currentStudent.name}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  Cédula: {currentStudent.carnet}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Contenedor Principal */}
        <div className="flex flex-1 flex-col min-w-0">
          <header className="flex items-center justify-between border-b border-slate-200/80 bg-white px-6 py-4 sticky top-0 z-20 shadow-2xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div>
                <span className="md:hidden font-bold text-blue-900 text-base">Portal Estudiantil</span>
                <div className="hidden sm:block text-xs font-medium text-slate-500">
                  Centro Integrado de Educación de Adultos (CINDEA) • Cañas, Guanacaste
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>{currentStudent.name}</span>
                <span className="text-slate-300">•</span>
                <span className="font-mono">{currentStudent.carnet}</span>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await logout();
                  window.location.href = '/login';
                }}
                className="text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 border-slate-200"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Salir
              </Button>
            </div>
          </header>

          {/* Menú Móvil Desplegable */}
          {mobileMenuOpen && (
            <div className="md:hidden border-b border-slate-200 bg-white p-4 space-y-1 shadow-md">
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition text-left',
                  activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                <Home className="w-4 h-4" />
                <span>Inicio</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('assignments');
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition text-left',
                  activeTab === 'assignments' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                <div className="flex items-center gap-3">
                  <FolderCheck className="w-4 h-4" />
                  <span>Tareas y Entregas</span>
                </div>
                {assignments.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {assignments.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab('grades');
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition text-left',
                  activeTab === 'grades' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Calificaciones MEP</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('justifications');
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition text-left',
                  activeTab === 'justifications' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                <div className="flex items-center gap-3">
                  <Paperclip className="w-4 h-4" />
                  <span>Comprobantes de Ausencia</span>
                </div>
                {myJustifications.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {myJustifications.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab('tutor');
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition text-left',
                  activeTab === 'tutor' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>English AI Tutor</span>
              </button>
            </div>
          )}

          {/* CONTENIDO PRINCIPAL */}
          <main className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* Grado / Materia Activa CINDEA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Mi Grado Matriculado en CINDEA</span>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mt-0.5">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              {currentCourse?.name || courses[0]?.name || 'Cargando grado...'}
            </h2>
          </div>
          {courses.length > 1 ? (
            <div className="w-72">
              <Select
                label=""
                name="courseSelect"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                options={courses.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Matrícula Oficial y Acceso Autorizado</span>
            </div>
          )}
        </div>

        {/* 1. SECCIÓN: DASHBOARD GENERAL */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Banner de Bienvenida CINDEA */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 p-6 md:p-8 text-white shadow-md">
              <div className="relative z-10 max-w-2xl space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-xs font-semibold text-blue-200 border border-blue-400/30">
                  <Languages className="w-3.5 h-3.5 text-amber-300" />
                  Teacher de Inglés • CINDEA 2026
                </div>
                <h1 className="text-2xl md:text-3xl font-black">
                  Welcome back, {currentStudent.name.split(' ')[0]}! 👋
                </h1>
                <p className="text-xs md:text-sm text-blue-100 leading-relaxed">
                  Aquí tienes tu espacio personal para revisar consignas de inglés, entregar tareas en cualquier formato
                  (Word, PDF o audios de voz) y consultar tus notas de forma 100% privada.
                </p>

                {/* Estado y Cédula del Estudiante */}
                <div className="pt-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-[11px] text-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>Estudiante activo CINDEA • Cédula: <strong>{currentStudent.carnet}</strong> • Acceso 100% privado</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjetas de Resumen KPI Privado */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                onClick={() => setActiveTab('assignments')}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                  <span>Tareas Activas</span>
                  <FileEdit className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-3xl font-black text-slate-900">{assignments.length}</div>
                <div className="text-xs text-blue-600 font-medium flex items-center gap-1">
                  Ver entregas y consignas <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div
                onClick={() => setActiveTab('grades')}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                  <span>Mi Promedio Actual MEP</span>
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-3xl font-black text-slate-900">{myGradeSummary.totalScore} / 100</div>
                <div className="text-xs text-emerald-700 font-extrabold flex items-center gap-1">
                  Estado: {myGradeSummary.status} <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div
                onClick={() => setActiveTab('tutor')}
                className="cursor-pointer rounded-xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-bold text-indigo-900 uppercase">
                  <span>English AI Tutor</span>
                  <Bot className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-xs text-indigo-950 font-semibold leading-relaxed">
                  ¿Dudas con pasado simple, verbos o pronunciación?
                </div>
                <div className="text-xs text-indigo-600 font-bold flex items-center gap-1">
                  Preguntar al tutor inteligente <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Daily English Expression Booster */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900 uppercase">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Daily English Expression (Frase del Día CINDEA)
              </div>
              <div className="text-base font-black text-slate-900">{dailyTip.idiom}</div>
              <p className="text-xs text-slate-700 font-medium"><strong>Significado:</strong> {dailyTip.meaning}</p>
              <div className="text-xs text-slate-600 bg-white/80 p-2.5 rounded-lg border border-amber-200/80 font-serif italic">
                {dailyTip.example}
              </div>
            </div>

            {/* Comunicados Recientes de Teacher Diana */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-blue-600" />
                Avisos y Comunicados de Teacher Diana
              </h3>
              {announcements.length === 0 ? (
                <div className="text-xs text-slate-500 py-3">No hay avisos recientes.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="py-3 space-y-1">
                      <div className="text-xs font-bold text-slate-900">{ann.title}</div>
                      <p className="text-xs text-slate-600 whitespace-pre-line">{ann.content}</p>
                      <div className="text-[10px] text-slate-400">
                        {new Date(ann.createdAt).toLocaleDateString('es-CR')} • {ann.sentBy}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. SECCIÓN: TAREAS & ENTREGAS (MY ASSIGNMENTS) */}
        {activeTab === 'assignments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tareas & Actividades de Inglés</h2>
                <p className="text-xs text-slate-500">
                  Consignas asignadas para {currentCourse?.name}. Sube tus documentos en Word, PDF, fotos o notas de audio.
                </p>
              </div>
            </div>

            {assignments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center bg-white text-slate-500 text-xs">
                No hay tareas asignadas en este módulo.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignments.map((a) => {
                  const mySub = submissions.find((s) => s.assignmentId === a.id);
                  const myGrade = myGrades.find(
                    (g) => g.assignmentId === a.id || (g.title && a.title && g.title.toLowerCase().trim() === a.title.toLowerCase().trim())
                  );
                  const isWithinDeadline = !a.dueDate || new Date().getTime() <= new Date(a.dueDate).getTime();

                  return (
                    <div
                      key={a.id}
                      className={cn(
                        'rounded-xl border p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition space-y-4',
                        myGrade
                          ? 'bg-white border-blue-300 ring-1 ring-blue-200'
                          : mySub
                          ? 'bg-white border-emerald-300 ring-1 ring-emerald-200'
                          : 'bg-white border-slate-200'
                      )}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                              {a.category || 'Tarea'}
                            </span>
                            {a.submissionType === 'in_class' ? (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                                📝 Realizado en Aula / Cuaderno
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                                💻 Entrega Digital
                              </span>
                            )}

                            {myGrade ? (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                                Calificado ({myGrade.score}/{myGrade.maxScore} pts)
                              </span>
                            ) : mySub ? (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Entregado
                              </span>
                            ) : a.submissionType === 'in_class' ? (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Pendiente de Nota
                              </span>
                            ) : isWithinDeadline ? (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Pendiente
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                No entregado
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                            {a.maxScore} pts
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 mt-2.5">{a.title}</h3>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{a.description}</p>

                        {/* Material de Guía / Instrucciones de la docente */}
                        {a.attachmentName && (
                          <div className="mt-3 p-2.5 bg-indigo-50/80 rounded-xl border border-indigo-200/80 flex items-center justify-between text-xs text-indigo-950">
                            <span className="truncate font-semibold flex items-center gap-1.5 text-[11px]">
                              <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              Guía: {a.attachmentName}
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
                                  el.href = 'https://drive.google.com/drive/folders/1sDpkjftZUFewVSGDemeyViPUlVUBki0L?authuser=pruebaproyecto551@gmail.com';
                                  el.target = '_blank';
                                }
                                el.download = a.attachmentName || 'Guia_Profesor.pdf';
                                document.body.appendChild(el);
                                el.click();
                                document.body.removeChild(el);
                              }}
                              className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs shrink-0 transition"
                            >
                              📥 Descargar Guía
                            </button>
                          </div>
                        )}

                        {/* Detalle si fue calificado directamente por la docente (presencial o papel) */}
                        {myGrade && (
                          <div className="mt-3 p-3 bg-blue-50/80 rounded-xl border border-blue-200 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-blue-950 flex items-center gap-1.5">
                                <Award className="w-4 h-4 text-blue-600" />
                                Evaluación Calificada por Docente
                              </span>
                              <span className="bg-blue-600 text-white font-mono font-black px-2 py-0.5 rounded text-xs">
                                {myGrade.score} / {myGrade.maxScore} pts
                              </span>
                            </div>
                            {myGrade.notes && (
                              <div className="text-[11px] text-blue-900 bg-white/90 p-2 rounded-lg border border-blue-100">
                                <strong>Retroalimentación:</strong> {myGrade.notes}
                              </div>
                            )}
                            {myGrade.attachmentData && (
                              <div className="flex items-center justify-between pt-1 text-[11px]">
                                <span className="text-slate-600">Evidencia de examen físico calificado:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const el = document.createElement('a');
                                    el.href = myGrade.attachmentData!;
                                    el.download = myGrade.attachmentName || 'Examen_Calificado.pdf';
                                    document.body.appendChild(el);
                                    el.click();
                                    document.body.removeChild(el);
                                  }}
                                  className="text-blue-700 font-bold underline hover:text-blue-900"
                                >
                                  📄 Ver Examen Calificado
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Detalle de entrega del estudiante si subió archivo digital */}
                        {mySub && !myGrade && (
                          <div className="mt-3 p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-bold text-emerald-950 truncate">
                                <FolderCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="truncate">{mySub.fileName}</span>
                              </div>
                              <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-bold px-1.5 py-0.5 rounded shrink-0">
                                ☁️ Google Drive
                              </span>
                            </div>
                            <div className="text-[11px] text-emerald-800 flex items-center justify-between">
                              <span>Entregado el {new Date(mySub.submittedAt).toLocaleString('es-CR')}</span>
                              {mySub.fileData && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const el = document.createElement('a');
                                    el.href = mySub.fileData!;
                                    el.download = mySub.fileName;
                                    document.body.appendChild(el);
                                    el.click();
                                    document.body.removeChild(el);
                                  }}
                                  className="text-blue-700 underline font-bold hover:text-blue-900"
                                >
                                  📥 Ver entrega
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-rose-500" />
                            <span>
                              Fecha / Límite:{' '}
                              <strong>{a.dueDate ? new Date(a.dueDate).toLocaleString('es-CR') : 'Próximamente'}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        {myGrade ? (
                          <div className="w-full py-2 px-3 rounded-xl bg-blue-50 border border-blue-200 text-center text-[11px] text-blue-800 font-bold flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                            Evaluación registrada en el acta oficial
                          </div>
                        ) : a.submissionType === 'in_class' ? (
                          <div className="w-full py-2.5 px-3 rounded-xl bg-amber-50/90 border border-amber-200 text-center text-[11px] text-amber-900 font-semibold flex items-center justify-center gap-1.5">
                            <span>📝 Actividad evaluada en aula / cuaderno. La docente calificará directamente.</span>
                          </div>
                        ) : mySub ? (
                          isWithinDeadline ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelectedTask(a);
                                setUploadFileName(mySub.fileName);
                              }}
                              className="w-full text-xs font-bold border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100"
                            >
                              <FileEdit className="w-3.5 h-3.5 mr-1.5 text-amber-700" />
                              ✏️ Modificar / Reemplazar Entrega
                            </Button>
                          ) : (
                            <div className="w-full py-2 px-3 rounded-xl bg-slate-100 border border-slate-200 text-center text-[11px] text-slate-500 font-bold flex items-center justify-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              Plazo cerrado • Entrega finalizada
                            </div>
                          )
                        ) : isWithinDeadline ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedTask(a);
                              setUploadFileName('');
                            }}
                            className="w-full text-xs font-bold bg-blue-600 hover:bg-blue-700"
                          >
                            <FolderUp className="w-3.5 h-3.5 mr-1.5" />
                            Realizar y Subir Entrega
                          </Button>
                        ) : (
                          <div className="w-full py-2 px-3 rounded-xl bg-rose-50 border border-rose-200 text-center text-[11px] text-rose-700 font-bold">
                            ⚠️ Plazo de entrega vencido
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. SECCIÓN: MIS CALIFICACIONES PRIVADAS (MY GRADES) */}
        {activeTab === 'grades' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Boletín Privado del Estudiante
                </span>
                <h2 className="text-lg font-bold text-slate-900">
                  Calificaciones de {currentStudent.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Carné: <strong>{currentStudent.carnet}</strong> • {currentStudent.moduleName}
                </p>
              </div>

              <div className="text-right bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500">Promedio Ponderado Final MEP</div>
                <div className="text-2xl font-black font-mono text-slate-900">{myGradeSummary.totalScore} / 100</div>
                <span
                  className={cn(
                    'inline-block px-2.5 py-0.5 rounded text-[11px] font-extrabold mt-1 border',
                    myGradeSummary.status === 'APROBADO'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : myGradeSummary.status === 'EN CURSO'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  )}
                >
                  {myGradeSummary.status}
                </span>
              </div>
            </div>

            {/* Desglose Oficial de Componentes MEP */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-xs">
                <div className="text-xs text-slate-500 font-bold uppercase">Cotidiano (50%)</div>
                <div className="text-2xl font-black font-mono text-slate-900 mt-1">{myGradeSummary.cotidianoAvg}</div>
                <div className="text-[11px] text-slate-400">Oral Practice & Classwork</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-xs">
                <div className="text-xs text-slate-500 font-bold uppercase">Pruebas (30%)</div>
                <div className="text-2xl font-black font-mono text-slate-900 mt-1">{myGradeSummary.pruebasAvg}</div>
                <div className="text-[11px] text-slate-400">Exámenes Parciales</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-xs">
                <div className="text-xs text-slate-500 font-bold uppercase">Tareas (10%)</div>
                <div className="text-2xl font-black font-mono text-slate-900 mt-1">{myGradeSummary.tareasAvg}</div>
                <div className="text-[11px] text-slate-400">Reading Essays & Audios</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-xs">
                <div className="text-xs text-slate-500 font-bold uppercase">Asistencia SICIN (10%)</div>
                <div className="text-2xl font-black font-mono text-blue-700 mt-1">{myGradeSummary.asistenciaScore}</div>
                <div className="text-[11px] text-slate-400">Rebajo por ausencias aplicado</div>
              </div>
            </div>

            {/* Detalle de Evaluaciones Registradas */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700">
                Detalle Individual de Evaluaciones Recibidas (Solo visibles para ti)
              </div>

              {myGrades.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Aún no tienes calificaciones registradas en este período.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {myGrades.map((g) => (
                    <div key={g.id} className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-sm text-slate-900">{g.title}</div>
                        <div className="text-xs text-blue-600 font-medium">{g.category}</div>
                        {g.notes && (
                          <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border mt-1.5 font-serif italic">
                            Teacher Feedback: "{g.notes}"
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1">Calificado el: {g.gradedOn}</div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-lg font-black font-mono px-3 py-1 bg-slate-100 rounded-lg border text-slate-900">
                          {g.score} / {g.maxScore}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. SECCIÓN: ASISTENTE DE DUDAS (ENGLISH AI TUTOR) */}
        {activeTab === 'tutor' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <div className="rounded-2xl border border-indigo-200 bg-white shadow-sm flex flex-col h-[520px]">
                {/* Chat Header */}
                <div className="p-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-t-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">English AI Tutor (Gemini)</h3>
                      <p className="text-[11px] text-indigo-200">Asistente de inglés para estudiantes de CINDEA</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded">
                    Online 24/7
                  </span>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
                  {tutorChat.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex flex-col max-w-[85%] rounded-xl p-3 text-xs leading-relaxed',
                        msg.sender === 'user'
                          ? 'ml-auto bg-blue-600 text-white rounded-br-none'
                          : 'mr-auto bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-xs'
                      )}
                    >
                      <span className="text-[10px] font-bold opacity-75 mb-0.5">
                        {msg.sender === 'user' ? 'Tú (Pedro)' : 'English AI Tutor'}
                      </span>
                      <p className="whitespace-pre-line">{msg.text}</p>
                    </div>
                  ))}
                  {tutorLoading && (
                    <div className="mr-auto bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-500 animate-pulse">
                      Escribiendo respuesta y explicación pedagógica...
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleAskTutor} className="p-3 bg-white border-t border-slate-200 rounded-b-2xl flex gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="Pregúntame sobre vocabulario en inglés, pronunciación o gramática..."
                    value={tutorQuestion}
                    onChange={(e) => setTutorQuestion(e.target.value)}
                    disabled={tutorLoading}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={tutorLoading || !tutorQuestion.trim()}
                    className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    Preguntar
                  </Button>
                </form>
              </div>
            </div>

            {/* Sugerencias Rápidas de Preguntas CINDEA */}
            <div className="lg:col-span-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Preguntas Frecuentes Sugeridas:
              </h3>

              <div className="space-y-2">
                {[
                  '¿Cuál es la diferencia entre Simple Past y Present Perfect?',
                  '¿Cómo se pronuncian las terminaciones -ed en los verbos regulares?',
                  'Corrige esta frase: "I have 20 years old and I am study English"',
                  '¿Qué expresiones puedo usar para ordenar comida en un restaurante?',
                  'Explícame cómo responder preguntas en una entrevista de trabajo en inglés',
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTutorQuestion(prompt);
                    }}
                    className="w-full text-left p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition text-xs text-slate-700 shadow-2xs flex items-center justify-between gap-2"
                  >
                    <span>{prompt}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: JUSTIFICACIONES Y COMPROBANTES DE AUSENCIA */}
        {/* ========================================================================= */}
        {activeTab === 'justifications' && (
          <div className="space-y-6">
            {/* Banner informativo */}
            <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold text-amber-100">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Comprobantes de Ausencia CINDEA / MEP</span>
                </div>
                <h2 className="text-xl font-bold">Envío de Justificaciones Médicas y Laborales</h2>
                <p className="text-xs text-amber-100 leading-relaxed">
                  Sube fotos o archivos PDF de comprobantes de la CCSS, constancias de trabajo u otros justificantes. La profesora Diana revisará tu documento y, al aprobarlo, tu ausencia quedará formalmente justificada en el sistema sin rebajo de puntos.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Formulario de subida de justificante */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <UploadCloud className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">Subir Nueva Justificación</h3>
                </div>

                <form onSubmit={handleSendJustification} className="space-y-4 text-xs">
                  {justError && (
                    <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{justError}</span>
                    </div>
                  )}

                  {justSuccess && (
                    <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{justSuccess}</span>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Módulo / Curso:</label>
                    <Select
                      options={courses.map((c) => ({ value: c.id, label: c.name }))}
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                    />
                  </div>

                  {/* Aviso Normativo MEP sobre 8 días */}
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
                    <Clock3 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Normativa de Evaluación MEP (Reglamento Oficial):</strong>
                      <p className="text-blue-800 text-[10px] mt-0.5">
                        El plazo máximo para presentar y justificar una ausencia es de <strong>8 días naturales</strong> contados a partir de la fecha en que se ausentó. Documentos posteriores a 8 días quedan invalidados por reglamento.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Fecha de la Ausencia (Últimos 8 días):
                    </label>
                    <input
                      type="date"
                      min={getAbsenceDateBounds().min}
                      max={getAbsenceDateBounds().max}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-amber-500 focus:outline-none"
                      value={justAbsenceDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setJustAbsenceDate(val);
                        if (val) {
                          const selected = new Date(val + 'T00:00:00');
                          const now = new Date();
                          const diff = Math.floor((now.getTime() - selected.getTime()) / (1000 * 60 * 60 * 24));
                          if (diff > 8) {
                            setJustError(`⚠️ Plazo vencido: Han pasado ${diff} días desde esta fecha. El límite reglamentario del MEP es de 8 días.`);
                          } else {
                            setJustError(null);
                          }
                        }
                      }}
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Rango permitido: Desde el {getAbsenceDateBounds().min} hasta hoy ({getAbsenceDateBounds().max}).
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Motivo o Explicación:</label>
                    <textarea
                      className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                      rows={3}
                      placeholder="Ej. Cita médica en la CCSS / Dictamen médico / Motivo laboral justificable..."
                      value={justReason}
                      onChange={(e) => setJustReason(e.target.value)}
                      required
                    />
                  </div>

                  {/* Selector y subida de archivo / foto */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Foto o Documento de Respaldo (PDF, JPG, PNG):
                    </label>
                    <label className="border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-xl p-4 text-center space-y-2 bg-amber-50/40 hover:bg-amber-50 cursor-pointer transition block">
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setJustFileName(file.name);
                            setJustFileType(file.type || 'application/octet-stream');
                            const reader = new FileReader();
                            reader.onload = () => {
                              setJustFileData(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      {justFileData ? (
                        <div className="space-y-1.5">
                          {justFileType.startsWith('image/') ? (
                            <img
                              src={justFileData}
                              alt="Preview"
                              className="w-24 h-24 object-cover mx-auto rounded-lg border border-amber-300 shadow-2xs"
                            />
                          ) : (
                            <FileText className="w-10 h-10 text-amber-600 mx-auto" />
                          )}
                          <div className="font-bold text-amber-900 truncate max-w-xs mx-auto">
                            {justFileName}
                          </div>
                          <div className="text-[11px] text-amber-700">
                            ✓ Archivo listo para enviar
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex justify-center gap-2 text-amber-600">
                            <Camera className="w-6 h-6" />
                            <UploadCloud className="w-6 h-6" />
                          </div>
                          <div className="font-bold text-slate-700">
                            Tomar foto o seleccionar archivo
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Comprobante médico CCSS, boleta o PDF
                          </div>
                        </div>
                      )}
                    </label>
                  </div>

                  <Button
                    variant="primary"
                    type="submit"
                    disabled={justSubmitting}
                    className="w-full bg-amber-600 hover:bg-amber-700 font-bold text-xs"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    {justSubmitting ? 'Enviando comprobante...' : 'Enviar Justificación a la Docente'}
                  </Button>
                </form>
              </div>

              {/* Lista e historial de justificaciones enviadas */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock3 className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">Historial de Justificaciones Enviadas</h3>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {myJustifications.length} comprobante(s)
                  </span>
                </div>

                {myJustifications.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs space-y-2">
                    <Paperclip className="w-8 h-8 mx-auto text-slate-300" />
                    <p>Aún no has enviado ninguna justificación de ausencia.</p>
                    <p className="text-[11px] text-slate-400">
                      Cuando faltes a clase por motivos justificados, sube el comprobante en el formulario de la izquierda.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myJustifications.map((j) => (
                      <div
                        key={j.id}
                        className={cn(
                          'p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs',
                          j.status === 'pending'
                            ? 'bg-amber-50/50 border-amber-200'
                            : j.status === 'approved'
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : 'bg-rose-50/50 border-rose-200'
                        )}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900">
                              Ausencia del: {j.absenceDate}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600 font-medium">{j.courseName}</span>
                          </div>

                          <p className="text-slate-700 italic bg-white/70 p-2 rounded-lg border border-slate-100">
                            "{j.reason}"
                          </p>

                          {/* Comentario de la docente */}
                          {j.teacherComment && (
                            <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[11px]">
                              <strong>Respuesta de Teacher Diana:</strong> {j.teacherComment}
                            </div>
                          )}

                          <div className="text-[11px] text-slate-400">
                            Enviado el: {new Date(j.createdAt).toLocaleDateString()} a las {new Date(j.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {/* Estado y archivo adjunto */}
                        <div className="flex flex-col sm:items-end gap-2 shrink-0">
                          {j.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-300">
                              <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                              En revisión docente
                            </span>
                          )}
                          {j.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Aprobada (Justificada)
                            </span>
                          )}
                          {j.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px] border border-rose-300">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              No Aprobada
                            </span>
                          )}

                          {j.fileData && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setSelectedJustificationDoc(j)}
                              className="text-[11px] bg-white hover:bg-slate-100"
                            >
                              <Eye className="w-3 h-3 mr-1 text-slate-600" />
                              Ver Comprobante
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE VISUALIZACIÓN DE COMPROBANTE DE AUSENCIA */}
      <Modal
        open={selectedJustificationDoc !== null}
        title={`Comprobante de Ausencia: ${selectedJustificationDoc?.studentName || ''}`}
        onClose={() => setSelectedJustificationDoc(null)}
        footer={
          <Button variant="secondary" onClick={() => setSelectedJustificationDoc(null)}>
            Cerrar
          </Button>
        }
      >
        {selectedJustificationDoc && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div><strong>Fecha de Ausencia:</strong> {selectedJustificationDoc.absenceDate}</div>
              <div><strong>Módulo:</strong> {selectedJustificationDoc.courseName}</div>
              <div><strong>Motivo:</strong> {selectedJustificationDoc.reason}</div>
            </div>

            <div className="border border-slate-200 rounded-xl p-2 bg-slate-100 text-center max-h-96 overflow-y-auto">
              {selectedJustificationDoc.fileType?.startsWith('image/') || selectedJustificationDoc.fileData?.startsWith('data:image/') ? (
                <img
                  src={selectedJustificationDoc.fileData}
                  alt="Comprobante de Ausencia"
                  className="max-w-full h-auto mx-auto rounded-lg shadow-sm"
                />
              ) : selectedJustificationDoc.fileType === 'application/pdf' || selectedJustificationDoc.fileData?.startsWith('data:application/pdf') ? (
                <div className="space-y-3 py-6">
                  <FileText className="w-16 h-16 text-rose-500 mx-auto" />
                  <div className="text-xs font-bold text-slate-800">{selectedJustificationDoc.fileName || 'Comprobante_Medico.pdf'}</div>
                  <a
                    href={selectedJustificationDoc.fileData}
                    download={selectedJustificationDoc.fileName || 'Comprobante_Medico.pdf'}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
                  >
                    📥 Descargar y Abrir PDF
                  </a>
                </div>
              ) : (
                <div className="space-y-3 py-6">
                  <Paperclip className="w-12 h-12 text-slate-400 mx-auto" />
                  <div className="text-xs font-bold">{selectedJustificationDoc.fileName || 'Documento adjunto'}</div>
                  {selectedJustificationDoc.fileData && (
                    <a
                      href={selectedJustificationDoc.fileData}
                      download={selectedJustificationDoc.fileName || 'Documento'}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold"
                    >
                      Descargar archivo
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL DE ENTREGA O MODIFICACIÓN DE TAREA */}
      <Modal
        open={selectedTask !== null}
        title={
          selectedTask
            ? submissions.some((s) => s.assignmentId === selectedTask.id)
              ? `✏️ Modificar / Reemplazar Entrega: ${selectedTask.title}`
              : `📤 Entregar Asignación: ${selectedTask.title}`
            : 'Entregar Asignación'
        }
        onClose={() => setSelectedTask(null)}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setSelectedTask(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="student-upload-form" disabled={uploading}>
              {uploading
                ? 'Guardando en la Nube / Drive...'
                : selectedTask && submissions.some((s) => s.assignmentId === selectedTask.id)
                ? 'Reemplazar Archivo en Drive'
                : 'Confirmar y Subir Entrega'}
            </Button>
          </>
        }
      >
        <form id="student-upload-form" onSubmit={handleUploadAssignment} className="space-y-4">
          <div className="text-xs text-slate-700 bg-blue-50 p-3 rounded-lg border border-blue-200 leading-relaxed">
            <strong>Instrucciones de Teacher Diana:</strong> {selectedTask?.description}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Tipo de Archivo a Entregar</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setUploadFileType('docx')}
                className={cn(
                  'p-2 rounded-lg border text-xs font-bold flex flex-col items-center gap-1',
                  uploadFileType === 'docx' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200'
                )}
              >
                <FileText className="w-4 h-4" />
                Word / DOCX
              </button>
              <button
                type="button"
                onClick={() => setUploadFileType('pdf')}
                className={cn(
                  'p-2 rounded-lg border text-xs font-bold flex flex-col items-center gap-1',
                  uploadFileType === 'pdf' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200'
                )}
              >
                <FileText className="w-4 h-4 text-rose-500" />
                PDF Document
              </button>
              <button
                type="button"
                onClick={() => setUploadFileType('audio')}
                className={cn(
                  'p-2 rounded-lg border text-xs font-bold flex flex-col items-center gap-1',
                  uploadFileType === 'audio' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-slate-200'
                )}
              >
                <Mic className="w-4 h-4 text-purple-600" />
                Grabación Audio
              </button>
            </div>
          </div>

          {/* Guía de la docente si existe */}
          {selectedTask?.attachmentName && (
            <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200/80 flex items-center justify-between text-xs text-indigo-950">
              <span className="truncate font-semibold flex items-center gap-1.5 text-[11px]">
                <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                Guía de Trabajo: <strong>{selectedTask.attachmentName}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  const el = document.createElement('a');
                  if (selectedTask.attachmentData && selectedTask.attachmentData.startsWith('data:')) {
                    el.href = selectedTask.attachmentData;
                  } else if (selectedTask.attachmentData) {
                    el.href = URL.createObjectURL(new Blob([selectedTask.attachmentData]));
                  } else {
                    el.href = 'https://drive.google.com/drive/folders/1sDpkjftZUFewVSGDemeyViPUlVUBki0L?authuser=pruebaproyecto551@gmail.com';
                    el.target = '_blank';
                  }
                  el.download = selectedTask.attachmentName || 'Guia.pdf';
                  document.body.appendChild(el);
                  el.click();
                  document.body.removeChild(el);
                }}
                className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs shrink-0 transition"
              >
                📥 Descargar Guía
              </button>
            </div>
          )}

          <Input
            label="Nombre del Archivo"
            placeholder={
              uploadFileType === 'audio'
                ? 'Ej. Speaking_Task1_PamelaLeiva.mp3'
                : 'Ej. Essay_Task1_PamelaLeiva.docx'
            }
            value={uploadFileName}
            onChange={(e) => setUploadFileName(e.target.value)}
            required
          />

          <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center space-y-2 bg-slate-50 hover:bg-blue-50/40 cursor-pointer transition block">
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.mp3,.wav,.m4a,.ogg,.jpg,.jpeg,.png,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setUploadFile(file);
                  setUploadFileName(file.name);
                  if (file.name.match(/\.(mp3|wav|m4a|ogg)$/i)) setUploadFileType('audio');
                  else if (file.name.match(/\.pdf$/i)) setUploadFileType('pdf');
                  else setUploadFileType('docx');

                  const reader = new FileReader();
                  reader.onload = () => {
                    setUploadFileContent(reader.result as string);
                  };
                  if (file.name.toLowerCase().endsWith('.txt')) {
                    reader.readAsText(file);
                  } else {
                    reader.readAsDataURL(file);
                  }
                }
              }}
            />
            <FolderUp className="w-8 h-8 text-blue-500 mx-auto" />
            <div className="text-xs font-semibold text-slate-700">
              {uploadFileName ? `Archivo seleccionado: ${uploadFileName}` : 'Haz clic para seleccionar tu archivo de tu computadora / celular'}
            </div>
            <div className="text-[11px] text-slate-400">
              Formatos aceptados: DOCX, PDF, JPG, PNG, MP3, M4A (Almacenamiento Cloud CINDEA)
            </div>
          </label>

          {uploadSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}
        </form>
      </Modal>
        </div>
      </div>
    </div>
  );
}
