import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">
          {'Plataforma docente en la nube'}
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          {'Gestiona alumnos, cursos, calificaciones y asistencia desde un único panel. Autenticación JWT, base de datos PostgreSQL y futuras integraciones con Google y Microsoft.'}
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            to="/login"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {'Iniciar sesión'}
          </Link>
          <Link
            to="/register"
            className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-200"
          >
            {'Crear cuenta'}
          </Link>
        </div>
      </section>
    </div>
  );
}
