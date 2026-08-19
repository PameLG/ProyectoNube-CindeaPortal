import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ErrorMessage } from '../components/ErrorMessage';
import {
  GraduationCap,
  CreditCard,
  ArrowRight,
  KeyRound,
  BookOpen,
} from 'lucide-react';

export function LoginEstudiante() {
  const { login, user, status } = useAuth();
  const navigate = useNavigate();

  const [studentCedula, setStudentCedula] = useState('');
  const [studentPin, setStudentPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Si ya está autenticado como estudiante, redirigir directo
  useEffect(() => {
    if (status === 'authenticated') {
      if (user?.role === 'student') {
        navigate('/student-portal', { replace: true });
      } else {
        // Docente intentando entrar por la URL de estudiantes → redirigir al dashboard
        navigate('/dashboard', { replace: true });
      }
    }
  }, [status, user, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedUser = await login(studentCedula, studentPin);
      if (loggedUser.role === 'student') {
        navigate('/student-portal', { replace: true });
      } else {
        setError('Esta entrada es exclusiva para estudiantes. El acceso docente se realiza en /login.');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Número de Cédula o DIMEX no encontrado en el sistema. Verificá que sea correcto.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100 flex flex-col items-center justify-center px-4 py-8">
      {/* Encabezado institucional */}
      <div className="mb-6 text-center space-y-1">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-800 shadow-lg mb-3">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Portal Estudiantil</h1>
        <p className="text-xs text-slate-500 font-medium">CINDEA — Sistema Educativo MEP</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl border border-emerald-200/80 shadow-xl shadow-emerald-950/5 p-6 sm:p-8 space-y-5">

        {/* Encabezado del formulario */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-sm shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border bg-emerald-50 text-emerald-800 border-emerald-200">
              Acceso con Cédula
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Consulta tus notas, tareas y tutor de inglés</p>
          </div>
        </div>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {/* Aviso de cédula */}
        <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3 flex items-start gap-2.5">
          <CreditCard className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
          <p className="text-xs text-emerald-950 leading-relaxed">
            Ingresa con tu <strong>número de Cédula</strong> o <strong>DIMEX</strong> registrado en la matrícula oficial del CINDEA.
          </p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
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

          {/* Aviso clave inicial */}
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3 text-xs text-amber-950 space-y-1 shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
              <span>¿Es tu primera vez ingresando?</span>
            </div>
            <p className="text-[11px] text-amber-900/90 leading-relaxed">
              Tu clave inicial es{' '}
              <strong className="font-mono font-bold bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 text-amber-950">
                student123
              </strong>
              .
            </p>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full font-bold bg-emerald-700 hover:bg-emerald-800 text-xs py-3 rounded-xl shadow-sm"
          >
            {submitting ? 'Verificando en la Nube...' : 'Ingresar a mi Portal CINDEA'}
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </form>

        {/* Pie de página */}
        <p className="text-center text-[10px] text-slate-400 pt-2">
          ¿Sos docente?{' '}
          <Link to="/login" className="text-blue-600 font-bold hover:underline">
            Acceso docente aquí
          </Link>
        </p>
      </div>

      <p className="mt-6 text-[10px] text-slate-400 text-center">
        Sistema de Gestión Académica MEP · CINDEA
      </p>
    </div>
  );
}
