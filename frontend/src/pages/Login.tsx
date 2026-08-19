import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ErrorMessage } from '../components/ErrorMessage';
import {
  GraduationCap,
  ShieldCheck,
  CreditCard,
  Mail,
  ArrowRight,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '../utils';

export function Login() {
  const { login, loginWithMicrosoft, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Tipo de rol seleccionado: Estudiante o Docente
  const [roleType, setRoleType] = useState<'student' | 'teacher'>('student');

  // Formulario Estudiante (Cédula o DIMEX)
  const [studentCedula, setStudentCedula] = useState('');
  const [studentPin, setStudentPin] = useState('');

  // Formulario Docente (Correo MEP / Gmail)
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role');
    if (roleParam === 'teacher') {
      setRoleType('teacher');
    } else if (roleParam === 'student') {
      setRoleType('student');
    }

    const oauthError = params.get('error');
    const provider = params.get('provider');
    if (oauthError) {
      if (
        oauthError.toLowerCase().includes('no autorizado') ||
        oauthError.toLowerCase().includes('no tiene permisos')
      ) {
        setError(`⚠️ ${oauthError}`);
        setRoleType('student');
      } else {
        setError(
          `No se pudo completar el inicio de sesión con ${provider ?? 'el proveedor'} (${oauthError}).`
        );
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.search]);

  // Login de Estudiante
  const onSubmitStudent = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(studentCedula, studentPin);
      if (user.role === 'student') {
        navigate('/student-portal', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err?.message ?? 'Número de Cédula o DIMEX no encontrado en el sistema');
    } finally {
      setSubmitting(false);
    }
  };

  // Login de Docente con contraseña
  const onSubmitTeacher = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(teacherEmail, teacherPassword);
      if (user.role === 'student') {
        navigate('/student-portal', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err?.message ?? 'Credenciales institucionales incorrectas');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md my-6 sm:my-8 px-4">
      {/* Botón Volver a la Portada */}
      <div className="mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al inicio</span>
        </Link>
      </div>

      <div
        className={cn(
          'rounded-3xl border bg-white p-6 sm:p-8 shadow-xl transition-all',
          roleType === 'student'
            ? 'border-emerald-200/80 shadow-emerald-950/5'
            : 'border-blue-200/80 shadow-blue-950/5'
        )}
      >
        {/* Selector de Rol: Estudiante vs Docente */}
        <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-2xl mb-6 text-xs font-bold border border-slate-200/80 shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setRoleType('student');
              setError(null);
            }}
            className={cn(
              'py-2 px-1 rounded-xl transition text-center flex items-center justify-center gap-1.5',
              roleType === 'student'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span>Portal Estudiantil</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRoleType('teacher');
              setError(null);
            }}
            className={cn(
              'py-2 px-1 rounded-xl transition text-center flex items-center justify-center gap-1.5',
              roleType === 'teacher'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Acceso Docente</span>
          </button>
        </div>

        {/* Encabezado del Rol Específico */}
        <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-slate-100">
          <div
            className={cn(
              'h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0',
              roleType === 'student'
                ? 'bg-gradient-to-br from-emerald-600 to-teal-800'
                : 'bg-gradient-to-br from-blue-700 to-indigo-900'
            )}
          >
            {roleType === 'student' ? (
              <GraduationCap className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>
          <div>
            <span
              className={cn(
                'text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border',
                roleType === 'student'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              )}
            >
              {roleType === 'student' ? 'Acceso con Cédula' : 'Docente Titular MEP'}
            </span>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
              {roleType === 'student' ? 'Portal Estudiantil' : 'Acceso Docente'}
            </h1>
            <p className="text-xs text-slate-500">
              {roleType === 'student'
                ? 'Consulta de notas, tareas y tutor de inglés'
                : 'Gestión académica oficial MEP & Google Drive'}
            </p>
          </div>
        </div>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {/* ========================================================= */}
        {/* 1. FORMULARIO ESTUDIANTE                                  */}
        {/* ========================================================= */}
        {roleType === 'student' && (
          <div className="space-y-5">
            <form className="space-y-4" onSubmit={onSubmitStudent}>
              <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3 flex items-start gap-2.5">
                <CreditCard className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-950 leading-relaxed">
                  Ingresa con tu <strong>número de Cédula</strong> o <strong>DIMEX</strong> registrado en la matrícula oficial del CINDEA.
                </p>
              </div>

              <Input
                label="Número de Cédula o DIMEX (Solo Números)"
                placeholder="Ej. 501230456 o 155823491024"
                value={studentCedula}
                onChange={(e) => setStudentCedula(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                pattern="[0-9]*"
                required
                autoFocus
              />

              <Input
                label="Contraseña o PIN de Estudiante"
                type="password"
                placeholder="••••••••"
                value={studentPin}
                onChange={(e) => setStudentPin(e.target.value)}
                required
              />

              {/* Aviso informativo de clave inicial */}
              <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3 text-xs text-amber-950 space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>¿Es tu primera vez ingresando?</span>
                </div>
                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  Tu clave inicial es <strong className="font-mono font-bold bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 text-amber-950">student123</strong>.
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full font-bold bg-emerald-700 hover:bg-emerald-800 text-xs py-3 rounded-xl shadow-sm mt-2"
              >
                {submitting ? 'Verificando en la Nube...' : 'Ingresar a mi Portal CINDEA'}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. FORMULARIO DOCENTE (GOOGLE WORKSPACE & MICROSOFT SSO)  */}
        {/* ========================================================= */}
        {roleType === 'teacher' && (
          <div className="space-y-4">
            <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3 flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-blue-700 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-950 space-y-0.5">
                <p className="font-bold">Acceso Docente Institucional MEP</p>
                <p className="text-[11px] text-blue-900/80 leading-relaxed">
                  Ingresa con tu cuenta de <strong>Google Workspace / Gmail</strong> o <strong>Microsoft 365</strong> para sincronizar Google Drive y Calendario automáticamente.
                </p>
              </div>
            </div>

            {/* BOTONES PRINCIPALES DE ACCESO CLOUD */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => loginWithGoogle()}
                className="w-full py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-3 shadow-xs hover:shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continuar con Google (Recomendado)</span>
              </button>

              <button
                type="button"
                onClick={() => loginWithMicrosoft(teacherEmail)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-2.5 shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 21 21">
                  <path fill="#f25022" d="M1 1h9v9H1z" />
                  <path fill="#00a4ef" d="M1 11h9v9H1z" />
                  <path fill="#7fba00" d="M11 1h9v9h-9z" />
                  <path fill="#ffb900" d="M11 11h9v9h-9z" />
                </svg>
                <span>Continuar con Microsoft 365 MEP</span>
              </button>
            </div>

            <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              <span>o con contraseña del sistema local</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <form className="space-y-3" onSubmit={onSubmitTeacher}>
              <Input
                label="Correo Institucional o Gmail"
                type="email"
                placeholder="ej. diana@mep.go.cr o pruebaproyecto551@gmail.com"
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <div className="space-y-1">
                <Input
                  label="Contraseña del Sistema (No tu clave de Google)"
                  type="password"
                  placeholder="Clave institucional (ej. teacher123)"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <p className="text-[10px] text-slate-500">
                  Clave predeterminada inicial: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700 font-bold">teacher123</code>
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full font-bold bg-blue-700 hover:bg-blue-800 text-xs py-3 rounded-xl shadow-sm mt-1"
              >
                {submitting ? 'Autenticando en la Nube...' : 'Iniciar Sesión con Clave del Sistema'}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
