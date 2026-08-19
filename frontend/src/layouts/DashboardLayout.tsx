import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { justificationsService } from '../services/justifications.service';
import { Button } from '../components/Button';
import { cn } from '../utils';
import {
  Home,
  CalendarCheck,
  GraduationCap,
  FolderCheck,
  Users,
  MessageCircle,
  Sparkles,
  LogOut,
  Languages,
  BookOpen,
  Layers,
  Calendar,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Inicio', icon: Home },
  { to: '/courses', label: 'Grupos y Sedes', icon: Layers },
  { to: '/attendance', label: 'Pasar Asistencia', icon: CalendarCheck },
  { to: '/grades', label: 'Calificaciones MEP', icon: GraduationCap },
  { to: '/assignments', label: 'Tareas y Entregas', icon: FolderCheck },
  { to: '/calendar', label: 'Google Calendar', icon: Calendar },
  { to: '/planning', label: 'Planeamiento & Cloud', icon: BookOpen },
  { to: '/students', label: 'Mis Estudiantes', icon: Users },
  { to: '/announcements', label: 'Avisos & WhatsApp', icon: MessageCircle },
  { to: '/ai-assistant', label: 'Asistente de Redacción', icon: Sparkles },
];

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingJustCount, setPendingJustCount] = useState<number>(0);

  useEffect(() => {
    justificationsService.getPendingCount().then(setPendingJustCount).catch(() => {});
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <div className="flex flex-1 min-h-screen">
        {/* Sidebar Desktop Limpia y Espaciosa */}
        <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
          {/* Header de la Profesora / CINDEA */}
          <div className="p-6 border-b border-slate-100 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600/80 text-white flex items-center justify-center shadow-inner font-bold">
                <Languages className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight">CINDEA MEP Cloud</div>
                <div className="text-[11px] text-blue-200">English Department</div>
              </div>
            </div>
          </div>

          {/* Navegación Simple y Amigable */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Menú Principal
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                location.pathname === item.to ||
                (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all group',
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 transition shrink-0',
                      active ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                    )}
                  />
                  <span>{item.label}</span>
                  {item.to === '/attendance' && pendingJustCount > 0 && (
                    <span className="ml-auto bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                      {pendingJustCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Perfil del Usuario en el Footer */}
          <div className="border-t border-slate-100 p-4 bg-slate-50/70">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {user?.fullName?.charAt(0) || 'D'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user?.fullName || 'Teacher Diana'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">Docente de Inglés</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Contenedor Principal */}
        <div className="flex flex-1 flex-col min-w-0">
          <header className="flex items-center justify-between border-b border-slate-200/80 bg-white px-6 py-4 sticky top-0 z-20 shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="md:hidden font-bold text-blue-900 text-base">CINDEA Cloud</span>
              <div className="hidden sm:block text-xs font-medium text-slate-500">
                Centro Integrado de Educación de Adultos (CINDEA) • Cañas, Guanacaste
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLogout}
                className="text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 border-slate-200"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Salir
              </Button>
            </div>
          </header>

          <main className="flex-1 p-5 md:p-8 max-w-6xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
