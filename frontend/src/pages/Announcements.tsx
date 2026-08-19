import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { Modal } from '../components/Modal';
import { ErrorMessage } from '../components/ErrorMessage';
import { coursesService } from '../services/courses.service';
import { announcementsService } from '../services/announcements.service';
import type { Course, Announcement } from '../types';
import {
  MessageCircle,
  Plus,
  Trash2,
  Copy,
  Check,
  Mail,
  Smartphone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export function Announcements() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    courseId: '',
    title: '',
    content: '',
    channels: ['email', 'whatsapp'],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    coursesService.list().then(setCourses).catch(() => {});
    loadAnnouncements();
  }, []);

  const loadAnnouncements = () => {
    announcementsService
      .list()
      .then(setAnnouncements)
      .catch((e) => setError(e?.response?.data?.error ?? 'Error al cargar avisos'));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await announcementsService.create({
        courseId: form.courseId || null,
        title: form.title,
        content: form.content,
        channels: form.channels,
      });
      setOpen(false);
      setForm({
        courseId: '',
        title: '',
        content: '',
        channels: ['email', 'whatsapp'],
      });
      setSuccess('Comunicado publicado y notificaciones preparadas correctamente.');
      loadAnnouncements();
      setTimeout(() => setSuccess(null), 4000);

      if (res.whatsappShareUrl && confirm('¿Deseas abrir WhatsApp Web ahora para enviar el comunicado al grupo?')) {
        window.open(res.whatsappShareUrl, '_blank');
      }
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al enviar aviso');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('¿Eliminar este aviso?')) return;
    await announcementsService.delete(id);
    loadAnnouncements();
  };

  const copyToClipboard = (ann: Announcement) => {
    const text = `📢 *COMUNICADO MEP: ${ann.title}*\n\n${ann.content}\n\n- ${ann.sentBy}`;
    navigator.clipboard.writeText(text);
    setCopiedId(ann.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openWhatsApp = (ann: Announcement) => {
    const text = encodeURIComponent(`📢 *COMUNICADO MEP: ${ann.title}*\n\n${ann.content}\n\n- ${ann.sentBy}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Avisos & Notificaciones WhatsApp</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-emerald-200">
              Automatización Instantánea
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Envío de circulares, recordatorios de tareas y fechas de exámenes a padres de familia y estudiantes.
          </p>
        </div>

        <Button onClick={() => setOpen(true)} className="self-start md:self-end text-xs">
          <Plus className="w-4 h-4 mr-1.5" />
          Redactar Nuevo Aviso
        </Button>
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center gap-2 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-950">Canal WhatsApp Directo</div>
            <div className="text-[11px] text-emerald-800">
              Genera enlaces con texto formateado listo para enviar a grupos de WhatsApp de aula o padres.
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-950">Canal Correo Electrónico (Resend)</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-extrabold border border-amber-300">
                🚧 En Desarrollo (Fase 2)
              </span>
            </div>
            <div className="text-[11px] text-amber-800/90 mt-0.5">
              Próxima integración para envío automatizado de circulares a cuentas @est.mep.go.cr.
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900">Historial de Comunicados Emitidos</h2>

        {announcements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center bg-white text-slate-500 text-sm">
            No se han emitido comunicados aún.
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => {
              const targetCourse = courses.find((c) => c.id === ann.courseId);
              return (
                <div
                  key={ann.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {targetCourse ? targetCourse.name : 'Todos los Cursos'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(ann.createdAt).toLocaleString('es-CR')}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{ann.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {ann.content}
                    </p>
                    <div className="text-[11px] text-slate-400 font-medium pt-1">
                      Emitido por: <strong>{ann.sentBy}</strong> • Canales: {ann.channels.join(' & ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => openWhatsApp(ann)}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700"
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1" />
                      Enviar WhatsApp
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyToClipboard(ann)}
                      className="text-xs"
                    >
                      {copiedId === ann.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          Copiar
                        </>
                      )}
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onDelete(ann.id)}
                      className="text-xs px-2.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={open}
        title="Redactar y Emitir Comunicado Oficial"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="announcement-form" disabled={submitting}>
              {submitting ? 'Enviando...' : 'Publicar y Notificar'}
            </Button>
          </>
        }
      >
        <form id="announcement-form" onSubmit={onSubmit} className="space-y-4">
          <Select
            label="Destinatarios (Curso / Grupo)"
            name="courseId"
            value={form.courseId}
            onChange={(e) => setForm({ ...form, courseId: e.target.value })}
            options={[
              { value: '', label: '📢 Todos los Cursos y Estudiantes' },
              ...courses.map((c) => ({ value: c.id, label: `Curso: ${c.name}` })),
            ]}
          />

          <Input
            label="Título del Comunicado"
            placeholder="Ej. Reminder: English Reading Quiz and Vocabulary Guide"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Mensaje a Familias y Alumnos</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-blue-500 focus:outline-none"
              rows={4}
              placeholder="Ej. Dear students, please remember to bring your English dictionary and study units 3 and 4 for tomorrow's class..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
            />
          </div>

          <div className="p-3 bg-emerald-50 rounded-lg text-xs text-emerald-900 border border-emerald-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Notificación Multicanal Activa
            </div>
            <div>
              Al presionar <strong>Publicar</strong>, el sistema generará el enlace para difusión en WhatsApp y registrará el aviso en el portal estudiantil.
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
