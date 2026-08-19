import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ErrorMessage } from '../components/ErrorMessage';
import {
  ShieldCheck,
  Mail,
  ArrowRight,
} from 'lucide-react';

export function Login() {
  const { login, loginWithMicrosoft, loginWithGoogle, user, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Si ya está autenticado, redirigir según rol
  useEffect(() => {
    if (status === 'authenticated') {
      if (user?.role === 'student') {
        navigate('/student-portal', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [status, user, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthError = params.get('error');
    const provider = params.get('provider');
    if (oauthError) {
      setError(
        `No se pudo completar el inicio de sesión con ${provider ?? 'el proveedor'} (${oauthError}).`
      );
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.search]);

  const onSubmitTeacher = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedUser = await login(teacherEmail, teacherPassword);
      if (loggedUser.role === 'student') {
        navigate('/student-portal', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err?.message ?? 'Credenciales institucionales incorrectas.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 flex flex-col items-center justify-center px-4 py-8">
      {/* Encabezado institucional */}
      <div className="mb-6 text-center space-y-1">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-900 shadow-lg mb-3">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Acceso Docente</h1>
        <p className="text-xs text-slate-500 font-medium">CINDEA — Sistema de Gestión Académica MEP</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl border border-blue-200/80 shadow-xl shadow-blue-950/5 p-6 sm:p-8 space-y-5">
        {/* Encabezado */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-900 flex items-center justify-center text-white shadow-sm shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border bg-blue-50 text-blue-800 border-blue-200">
              Docente Titular MEP
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Gestión académica oficial MEP &amp; Google Drive</p>
          </div>
        </div>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {/* Aviso */}
        <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3 flex items-start gap-2.5">
          <Mail className="w-4 h-4 text-blue-700 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-950 space-y-0.5">
            <p className="font-bold">Acceso Docente Institucional MEP</p>
            <p className="text-[11px] text-blue-900/80 leading-relaxed">
              Ingresa con tu cuenta de <strong>Google Workspace / Gmail</strong> o <strong>Microsoft 365</strong> para sincronizar Google Drive y Calendario automáticamente.
            </p>
          </div>
        </div>

        {/* Botones principales OAuth */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => loginWithGoogle()}
            className="w-full py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-3 shadow-xs hover:shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z" />
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
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

        <div className="flex items-center gap-3 text-xs text-slate-400">
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
              Clave predeterminada inicial:{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700 font-bold">teacher123</code>
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

        {/* Pie */}
        <p className="text-center text-[10px] text-slate-400 pt-2">
          ¿Sos estudiante?{' '}
          <Link to="/estudiante" className="text-emerald-600 font-bold hover:underline">
            Portal estudiantil aquí
          </Link>
        </p>
      </div>

      <p className="mt-6 text-[10px] text-slate-400 text-center">
        Sistema de Gestión Académica MEP · CINDEA
      </p>
    </div>
  );
}

