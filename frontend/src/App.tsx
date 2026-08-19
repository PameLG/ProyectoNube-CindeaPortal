import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { PublicLayout } from './layouts/PublicLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { Courses } from './pages/Courses';
import { CourseDetail } from './pages/CourseDetail';
import { Grades } from './pages/Grades';
import { Attendance } from './pages/Attendance';
import { Assignments } from './pages/Assignments';
import { Announcements } from './pages/Announcements';
import { AIAssistant } from './pages/AIAssistant';
import { Planning } from './pages/Planning';
import { GoogleCalendarPage } from './pages/GoogleCalendarPage';
import { StudentPortal } from './pages/StudentPortal';
import { LoginEstudiante } from './pages/LoginEstudiante';
import { Loading } from './components/Loading';
import { ForcePasswordChangeModal } from './components/ForcePasswordChangeModal';

function OAuthCallback() {
  const { user, status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    if (accessToken && refreshToken) {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
    }

    if (status === 'authenticated') {
      if (user?.role === 'student') {
        navigate('/student-portal', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } else if (status === 'unauthenticated' && !accessToken && !localStorage.getItem('access_token')) {
      navigate('/login', { replace: true });
    }
  }, [status, user, navigate]);

  return <Loading label="Iniciando sesión con Google..." />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ForcePasswordChangeModal />
        <Routes>
          {/* Página de inicio — con header/footer público */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Login Docente — sin header con botones */}
          <Route path="/login" element={<Login />} />

          {/* Login Estudiante — sin header con botones */}
          <Route path="/estudiante" element={<LoginEstudiante />} />

          {/* Portal del Estudiante (Protegido con Cédula/PIN) */}
          <Route
            path="/student-portal"
            element={
              <ProtectedRoute>
                <StudentPortal />
              </ProtectedRoute>
            }
          />

          {/* Panel Administrativo y Docente (Protegido con JWT) */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/grades" element={<Grades />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/calendar" element={<GoogleCalendarPage />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/students" element={<Students />} />
          </Route>

          {/* Callbacks OAuth Google / Microsoft */}
          <Route path="/auth/microsoft/callback" element={<OAuthCallback />} />
          <Route path="/auth/google/callback" element={<OAuthCallback />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
