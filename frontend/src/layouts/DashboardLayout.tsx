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
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
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
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  useEffect(() => {
    justificationsService.getPendingCount().then(setPendingJustCount).catch(() => {});
  }, [location.pathname]);

  // Cerrar drawer en mobile al navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <div className="flex flex-1 min-h-screen">
        {/* ========================================================= */}
        {/* SIDEBAR DESKTOP PLEGABLE / COLAPSABLE                     */}
        {/* ========================================================= */}
        <aside
          className={cn(
            'hidden md:flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out select-none relative z-30',
            collapsed ? 'w-20' : 'w-64'
          )}
        >
          {/* Header del Sidebar */}
          <div className="p-4 border-b border-slate-100 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between min-h-[73px]">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 rounded-xl bg-blue-600/80 text-white flex items-center justify-center shadow-inner font-bold shrink-0">
                <Languages className="w-5 h-5 text-amber-300" />
              </div>
              {!collapsed && (
                <div className="min-w-0 transition-opacity duration-200">
                  <div className="text-sm font-bold tracking-tight truncate">CINDEA MEP Cloud</div>
                  <div className="text-[11px] text-blue-200 truncate">English Department</div>
                </div>
              )}
            </div>

            {/* Botón Plegar / Desplegar en el Header del Sidebar */}
            <button
              type="button"
              onClick={toggleCollapsed}
              title={collapsed ? 'Desplegar menú lateral' : 'Plegar menú lateral'}
              className="hidden md:flex p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition shrink-0 ml-auto"
            >
              {collapsed ? (
                <PanelLeftOpen className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Navegación del Menú */}
          <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto overflow-x-hidden">
            {!collapsed && (
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Menú Principal
              </div>
            )}

            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                location.pathname === item.to ||
                (item.to !== '/dashboard' && location.pathname.startsWith(item.to));

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center rounded-xl transition-all group relative',
                    collapsed
                      ? 'justify-center p-3 text-center'
                      : 'gap-3 px-3.5 py-2.5 text-sm font-semibold',
                    active
                      ? 'bg-blue-600 text-white shadow-sm font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 transition shrink-0',
                      active ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                    )}
                  />

                  {!collapsed && <span className="truncate">{item.label}</span>}

                  {item.to === '/attendance' && pendingJustCount > 0 && (
                    <span
                      className={cn(
                        'bg-amber-500 text-white text-[10px] font-black rounded-full shadow-xs',
                        collapsed
                          ? 'absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center text-[9px]'
                          : 'ml-auto px-2 py-0.5'
                      )}
                    >
                      {pendingJustCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Perfil del Usuario en el Footer del Sidebar */}
          <div className="border-t border-slate-100 p-3 bg-slate-50/80">
            <div
              className={cn(
                'flex items-center min-w-0',
                collapsed ? 'justify-center' : 'gap-3'
              )}
            >
              <div className="h-9 w-9 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {user?.fullName?.charAt(0) || 'D'}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {user?.fullName || 'Teacher Diana'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">Docente de Inglés</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* SIDEBAR MOBILE (DRAWER LATERAL DESLIZABLE)                */}
        {/* ========================================================= */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop oscuro */}
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileOpen(false)}
            />

            {/* Panel lateral móvil */}
            <div className="relative flex flex-col w-72 max-w-[85vw] bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-200">
              <div className="p-4 border-b border-slate-100 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-600/80 text-white flex items-center justify-center shadow-inner font-bold shrink-0">
                    <Languages className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <div className="text-sm font-bold tracking-tight">CINDEA MEP Cloud</div>
                    <div className="text-[11px] text-blue-200">English Department</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active =
                    location.pathname === item.to ||
                    (item.to !== '/dashboard' && location.pathname.startsWith(item.to));

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition',
                        active
                          ? 'bg-blue-600 text-white shadow-sm font-bold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-5 h-5 shrink-0',
                          active ? 'text-white' : 'text-slate-400'
                        )}
                      />
                      <span>{item.label}</span>
                      {item.to === '/attendance' && pendingJustCount > 0 && (
                        <span className="ml-auto bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                          {pendingJustCount}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>

              <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {user?.fullName?.charAt(0) || 'D'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {user?.fullName || 'Teacher Diana'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">Docente de Inglés</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* CONTENEDOR PRINCIPAL Y HEADER SUPERIOR                    */}
        {/* ========================================================= */}
        <div className="flex flex-1 flex-col min-w-0">
          <header className="flex items-center justify-between border-b border-slate-200/80 bg-white px-4 sm:px-6 py-3.5 sticky top-0 z-20 shadow-2xs">
            <div className="flex items-center gap-3">
              {/* Botón Plegar/Desplegar en Header Desktop */}
              <button
                type="button"
                onClick={toggleCollapsed}
                title={collapsed ? 'Desplegar menú lateral' : 'Plegar menú lateral'}
                className="hidden md:flex items-center justify-center p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-200 shadow-2xs"
              >
                {collapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-blue-600" />
                ) : (
                  <PanelLeftClose className="w-4 h-4 text-slate-600" />
                )}
              </button>

              {/* Botón Abrir Menú en Móvil */}
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200"
              >
                <Menu className="w-5 h-5" />
              </button>

              <span className="md:hidden font-bold text-blue-900 text-sm">CINDEA Cloud</span>
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

          <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
