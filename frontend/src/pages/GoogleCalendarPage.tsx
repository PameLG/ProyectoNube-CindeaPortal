import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { coursesService } from '../services/courses.service';
import { calendarService, type CalendarEvent } from '../services/calendar.service';
import type { Course } from '../types';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import {
  Calendar as CalendarIcon,
  Plus,
  ExternalLink,
  Clock,
  CheckCircle2,
  CalendarDays,
  RefreshCw,
  FileCheck2,
  Users,
  Flag,
  AlertCircle,
  Trash2,
  FolderSync,
} from 'lucide-react';

export function GoogleCalendarPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [syncingAll, setSyncingAll] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [eventTitle, setEventTitle] = useState<string>('');
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [eventTime, setEventTime] = useState<string>('18:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(90);
  const [eventType, setEventType] = useState<'exam' | 'civic' | 'meeting' | 'deadline'>('exam');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [locationName, setLocationName] = useState<string>('CINDEA Cañas · Gimnasio / Aulas');
  const [eventDesc, setEventDesc] = useState<string>('');

  const targetEmail = user?.email || 'pruebaproyecto551@gmail.com';

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const courseList = await coursesService.list();
      setCourses(courseList);

      // Obtener eventos reales directamente de Google Calendar API
      const realGoogleEvents = await calendarService.getEvents(targetEmail);
      setEvents(realGoogleEvents);
    } catch (err) {
      console.error('Error cargando calendario:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sincronizar eventos base institucionales en Google Calendar
  const handleSyncBaseEvents = async () => {
    setSyncingAll(true);
    const baseToSync = [
      {
        summary: '🇨🇷 Acto Cívico Oficial: Día de la Independencia de Costa Rica',
        description: 'Celebración patriótica en CINDEA Cañas con entonación de himnos, faroles y actos culturales.',
        location: 'Gimnasio Central CINDEA Cañas',
        startDateTime: '2026-09-15T18:30:00',
        endDateTime: '2026-09-15T20:30:00',
      },
      {
        summary: '🇨🇷 Acto Cívico: Conmemoración Batalla de Rivas y Juan Santamaría',
        description: 'Homenaje a los héroes nacionales. Asistencia oficial para personal docente y estudiantes.',
        location: 'Patio Central CINDEA Cañas',
        startDateTime: '2026-04-11T18:00:00',
        endDateTime: '2026-04-11T19:30:00',
      },
      {
        summary: '👨‍👩‍👧 I Asamblea y Reunión General de Padres de Familia',
        description: 'Socialización del reglamento de evaluación MEP, entrega de lineamientos y comités.',
        location: 'Comedor Estudiantil CINDEA',
        startDateTime: '2026-03-20T18:00:00',
        endDateTime: '2026-03-20T19:45:00',
      },
      {
        summary: '📝 I Prueba Parcial de Inglés - Nivel 10° (Colorado / Módulo IV)',
        description: 'Evaluación sumativa de contenidos de la unidad 1 y 2. Ponderación MEP: 15%.',
        location: 'Aula 4 · Sede Colorado',
        startDateTime: '2026-04-22T18:00:00',
        endDateTime: '2026-04-22T19:30:00',
      },
      {
        summary: '📊 Entrega Oficial de Boletines de Notas (I Periodo)',
        description: 'Atención personalizada a padres de familia y entrega de informes de notas ponderadas.',
        location: 'Aulas de Inglés CINDEA',
        startDateTime: '2026-06-26T18:00:00',
        endDateTime: '2026-06-26T21:00:00',
      },
    ];

    try {
      for (const item of baseToSync) {
        // Evitar duplicar si ya existe un evento con el mismo título
        const exists = events.some((e) => e.summary.toLowerCase().includes(item.summary.toLowerCase().slice(0, 20)));
        if (!exists) {
          await calendarService.createEvent({
            ...item,
            email: targetEmail,
          });
        }
      }
      setSuccessMsg('✅ Fechas institucionales y exámenes sincronizados en tu Google Calendar');
      await loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Error sincronizando calendario:', err);
    } finally {
      setSyncingAll(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    setSaving(true);
    try {
      const startDateTime = `${eventDate}T${eventTime}:00`;
      const startDate = new Date(startDateTime);
      const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
      const endDateTime = endDate.toISOString().split('.')[0];

      const selectedCourse = courses.find((c) => c.id === selectedCourseId);
      const courseNameStr = selectedCourse ? selectedCourse.name : 'Toda la Institución';
      const fullDesc = `${eventDesc}\n\nActividad: ${getEventTypeName(eventType)}\nGrupo / Módulo: ${courseNameStr}\nLugar: ${locationName}\nPlataforma: CINDEA MEP Cloud`;

      await calendarService.createEvent({
        summary: eventTitle,
        description: fullDesc,
        location: locationName,
        startDateTime,
        endDateTime,
        email: targetEmail,
      });

      setSuccessMsg('✅ Actividad agregada directamente a tu Google Calendar');
      await loadData();

      setTimeout(() => {
        setIsModalOpen(false);
        setEventTitle('');
        setEventDesc('');
        setSuccessMsg(null);
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Error al agendar en Google Calendar. Verifica la conexión con Google.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id?: string) => {
    if (!id) return;
    if (!confirm('¿Deseas eliminar este evento de tu Google Calendar?')) return;
    try {
      await calendarService.deleteEvent(id, targetEmail);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  };

  const getEventTypeName = (type?: string) => {
    switch (type) {
      case 'exam':
        return 'Prueba / Examen Parcial';
      case 'civic':
        return 'Acto Cívico Institucional';
      case 'meeting':
        return 'Reunión de Padres / Entrega de Notas';
      case 'deadline':
        return 'Cierre de Periodo / Fecha Límite';
      default:
        return 'Actividad Clave';
    }
  };

  const filteredEvents = events.filter((e) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'exams') return e.summary.toLowerCase().includes('examen') || e.summary.toLowerCase().includes('prueba') || e.summary.toLowerCase().includes('quiz');
    if (activeFilter === 'civic') return e.summary.toLowerCase().includes('acto') || e.summary.toLowerCase().includes('cívico') || e.summary.toLowerCase().includes('independencia') || e.summary.toLowerCase().includes('batalla');
    if (activeFilter === 'meetings') return e.summary.toLowerCase().includes('padres') || e.summary.toLowerCase().includes('asamblea') || e.summary.toLowerCase().includes('boletin') || e.summary.toLowerCase().includes('informe');
    if (activeFilter === 'deadlines') return e.summary.toLowerCase().includes('cierre') || e.summary.toLowerCase().includes('límite') || e.summary.toLowerCase().includes('sicin') || e.summary.toLowerCase().includes('entrega');
    return true;
  });

  const openGoogleCalendarDirect = () => {
    window.open('https://calendar.google.com', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Ejecutivo */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 text-white shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Google Calendar Conectado en Tiempo Real</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">
              Calendario de Actividades, Exámenes y Actos Cívicos
            </h1>
            <p className="text-xs md:text-sm text-slate-300">
              Cuenta vinculada: <strong className="text-blue-300 font-mono">{targetEmail}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={openGoogleCalendarDirect}
              className="bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700 text-xs font-bold flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span>Abrir calendar.google.com</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-blue-200" />
              <span>Agendar Actividad</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Banner de Sincronización Inicial si hay pocos eventos */}
      {events.length < 3 && (
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-blue-950">¿Deseas sincronizar las fechas oficiales del semestre?</h3>
              <p className="text-[11px] text-blue-800">
                Sube automáticamente a tu Google Calendar los actos cívicos patrios, fechas de exámenes parciales y asambleas de padres.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleSyncBaseEvents}
            disabled={syncingAll}
            className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shrink-0"
          >
            {syncingAll ? 'Sincronizando...' : 'Sincronizar Fechas Institucionales'}
          </Button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl font-bold flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Filtros de Categorías Clave */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeFilter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Todas en Google Calendar ({events.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('exams')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeFilter === 'exams'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-rose-50 hover:text-rose-700'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5 text-rose-500" />
          <span>Próximos Exámenes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('civic')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeFilter === 'civic'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-blue-50 hover:text-blue-700'
          }`}
        >
          <Flag className="w-3.5 h-3.5 text-blue-500" />
          <span>Actos Cívicos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('meetings')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeFilter === 'meetings'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50 hover:text-purple-700'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-purple-500" />
          <span>Reuniones de Padres</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('deadlines')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeFilter === 'deadlines'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-amber-50 hover:text-amber-700'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          <span>Cierres de Periodo</span>
        </button>
      </div>

      {/* 3. Lista de Actividades en Google Calendar */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Eventos Sincronizados en tu Google Calendar ({filteredEvents.length})
            </h2>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-xs font-bold text-slate-600 border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar desde Google</span>
          </Button>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-3">
            <CalendarIcon className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-medium">No hay actividades agendadas en esta categoría en Google Calendar.</p>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold mx-auto"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Crear Nueva Actividad
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEvents.map((evt, index) => {
              const startDate = evt.start ? new Date(evt.start) : null;
              const dateFormatted = startDate && !isNaN(startDate.getTime())
                ? startDate.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                : 'Fecha por definir';
              const timeFormatted = startDate && !isNaN(startDate.getTime())
                ? startDate.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
                : '18:00';

              const isExam = evt.summary.toLowerCase().includes('examen') || evt.summary.toLowerCase().includes('prueba');
              const isCivic = evt.summary.toLowerCase().includes('acto') || evt.summary.toLowerCase().includes('cívico') || evt.summary.toLowerCase().includes('independencia') || evt.summary.toLowerCase().includes('batalla');
              const isMeeting = evt.summary.toLowerCase().includes('padres') || evt.summary.toLowerCase().includes('asamblea') || evt.summary.toLowerCase().includes('boletin');
              const isDeadline = evt.summary.toLowerCase().includes('cierre') || evt.summary.toLowerCase().includes('sicin');

              return (
                <div
                  key={evt.id || index}
                  className={`rounded-2xl border p-5 transition flex flex-col justify-between gap-3 text-xs ${
                    isExam
                      ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                      : isCivic
                      ? 'bg-blue-50/40 border-blue-200 hover:border-blue-300'
                      : isMeeting
                      ? 'bg-purple-50/40 border-purple-200 hover:border-purple-300'
                      : isDeadline
                      ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                      : 'bg-slate-50/40 border-slate-200 hover:border-slate-300'
                  } hover:bg-white hover:shadow-xs`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md ${
                          isExam
                            ? 'bg-rose-100 text-rose-900 border border-rose-200'
                            : isCivic
                            ? 'bg-blue-100 text-blue-900 border border-blue-200'
                            : isMeeting
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : isDeadline
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}
                      >
                        {isExam
                          ? '📝 Prueba / Examen'
                          : isCivic
                          ? '🇨🇷 Acto Cívico'
                          : isMeeting
                          ? '👨‍👩‍👧 Reunión de Padres'
                          : isDeadline
                          ? '⏰ Cierre de Periodo'
                          : 'Google Calendar Event'}
                      </span>
                      <span className="font-mono font-bold text-slate-600 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {timeFormatted}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{evt.summary}</h3>
                    {evt.description && (
                      <p className="text-slate-600 text-[11px] leading-relaxed pt-1 bg-white/70 p-2.5 rounded-xl border border-slate-200/60 whitespace-pre-line">
                        {evt.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-slate-500 text-[11px]">
                    <span className="font-semibold text-slate-800 flex items-center gap-1 capitalize">
                      <CalendarDays className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      {dateFormatted}
                    </span>
                    <div className="flex items-center gap-2">
                      {evt.htmlLink && (
                        <a
                          href={evt.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold hover:underline"
                        >
                          <span>Abrir en Google</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {evt.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(evt.id)}
                          className="text-slate-400 hover:text-rose-600 transition p-1"
                          title="Eliminar de Google Calendar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Modal para Agendar Nueva Actividad Directamente en Google Calendar */}
      <Modal
        open={isModalOpen}
        title="Crear Evento en Google Calendar"
        onClose={() => setIsModalOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateEvent}
              disabled={saving || !eventTitle.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
            >
              {saving ? 'Guardando en Google...' : 'Agendar en Google Calendar'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
          {successMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-800 block mb-1">Nombre de la Actividad o Examen *</label>
            <input
              type="text"
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              placeholder="Ej. I Prueba Parcial de Inglés / Acto Cívico de la Independencia"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-800 block mb-1">Tipo de Actividad</label>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                value={eventType}
                onChange={(e: any) => setEventType(e.target.value)}
              >
                <option value="exam">📝 Prueba / Examen Parcial</option>
                <option value="civic">🇨🇷 Acto Cívico Institucional</option>
                <option value="meeting">👨‍👩‍👧 Reunión de Padres / Entrega de Notas</option>
                <option value="deadline">⏰ Cierre de Periodo / Límite SICIN</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">Grupo o Audiencia</label>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                <option value="all">Toda la Institución / Todos los Grupos</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-800 block mb-1">Fecha</label>
              <input
                type="date"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">Hora</label>
              <input
                type="time"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">Duración</label>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              >
                <option value={60}>1 hora</option>
                <option value={90}>1.5 horas</option>
                <option value={120}>2 horas</option>
                <option value={180}>3 horas</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-800 block mb-1">Lugar o Ubicación</label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              placeholder="Ej. Gimnasio CINDEA Cañas / Aula 3 / Comedor"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>

          <div>
            <label className="font-bold text-slate-800 block mb-1">Descripción u Observaciones (Opcional)</label>
            <textarea
              rows={2}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              placeholder="Indicaciones sobre contenidos a evaluar, uniforme requerido, materiales..."
              value={eventDesc}
              onChange={(e) => setEventDesc(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
