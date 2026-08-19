import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { Modal } from '../components/Modal';
import { ErrorMessage } from '../components/ErrorMessage';
import { coursesService } from '../services/courses.service';
import { documentsService } from '../services/documents.service';
import type { Course, TeacherDocument } from '../types';
import {
  FolderArchive,
  FileText,
  UploadCloud,
  CheckCircle2,
  Trash2,
  ExternalLink,
  BookOpen,
  Calendar,
  Layers,
  Search,
  Cloud,
  Plus,
} from 'lucide-react';
import { cn } from '../utils';

const CATEGORIES = [
  { value: 'all', label: 'Todos los Documentos' },
  { value: 'planeamiento', label: '📘 Planeamientos Didácticos MEP' },
  { value: 'examen', label: '📝 Exámenes e Instrumentos de Respaldo' },
  { value: 'guia', label: '📋 Guías de Trabajo Autónomo & Prácticas' },
  { value: 'rubrica', label: '📊 Rúbricas y Escalas Evaluativas' },
  { value: 'otro', label: '📁 Recursos Didácticos y Apoyo' },
];

const PERIODS = [
  { value: 'I Período 2026', label: 'I Período 2026' },
  { value: 'II Período 2026', label: 'II Período 2026' },
  { value: 'Anual / General', label: 'Anual / General' },
];

export function Planning() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [documents, setDocuments] = useState<TeacherDocument[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Modal de Subida
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [docTitle, setDocTitle] = useState<string>('');
  const [docCourseId, setDocCourseId] = useState<string>('');
  const [docCategory, setDocCategory] = useState<'planeamiento' | 'examen' | 'guia' | 'rubrica' | 'otro'>('planeamiento');
  const [docPeriod, setDocPeriod] = useState<string>('I Período 2026');
  const [docFileName, setDocFileName] = useState<string>('');
  const [docFileData, setDocFileData] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const loadData = () => {
    setError(null);
    Promise.all([
      coursesService.list().catch(() => []),
      documentsService.list().catch(() => []),
    ])
      .then(([cs, docs]) => {
        setCourses(cs);
        setDocuments(docs);
      })
      .catch((err) => setError(err?.message || 'Error al cargar los documentos'));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUploadDocument = async (e: FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docFileName) return;

    setSubmitting(true);
    setError(null);
    try {
      const selectedCourse = courses.find((c) => c.id === docCourseId);
      await documentsService.create({
        title: docTitle.trim(),
        courseId: docCourseId || null,
        courseName: selectedCourse?.name || 'Documentos Generales',
        category: docCategory,
        period: docPeriod,
        fileName: docFileName,
        fileData: docFileData || undefined,
      });

      setUploadSuccess(`¡El archivo "${docFileName}" se guardó y respaldó en Google Drive con éxito!`);
      setTimeout(() => {
        setOpenModal(false);
        setDocTitle('');
        setDocCourseId('');
        setDocCategory('planeamiento');
        setDocPeriod('I Período 2026');
        setDocFileName('');
        setDocFileData('');
        setUploadSuccess(null);
        loadData();
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al subir el documento. Intente de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDocument = async (id: string, name: string) => {
    if (!confirm(`¿Seguro que deseas eliminar el respaldo de "${name}"?`)) return;
    try {
      await documentsService.delete(id);
      loadData();
    } catch (err: any) {
      setError('Error al eliminar el documento');
    }
  };

  // Filtrado de documentos
  const filteredDocs = documents.filter((doc) => {
    const matchesCourse = selectedCourseId === 'all' || doc.courseId === selectedCourseId || !doc.courseId;
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchesSearch =
      !searchTerm.trim() ||
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.courseName && doc.courseName.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCourse && matchesCategory && matchesSearch;
  });

  const planeamientoCount = documents.filter((d) => d.category === 'planeamiento').length;
  const examenesCount = documents.filter((d) => d.category === 'examen').length;
  const guiasCount = documents.filter((d) => d.category === 'guia').length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Encabezado y Acción Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Planeamiento Didáctico & Archivos Cloud
            </h1>
            <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Cloud className="w-3.5 h-3.5 text-blue-600" />
              Google Drive Sync
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Respaldo oficial de planeamientos MEP, exámenes calificados en físico, guías y rúbricas institucionales.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://drive.google.com/drive/folders/1sDpkjftZUFewVSGDemeyViPUlVUBki0L"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
            Abrir Google Drive
          </a>
          <Button
            variant="primary"
            onClick={() => setOpenModal(true)}
            className="bg-blue-600 hover:bg-blue-700 font-bold shadow-xs text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Subir Documento o Planeamiento
          </Button>
        </div>
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* Tarjetas de Resumen y Evidencias */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">Planeamientos MEP</div>
            <div className="text-xl font-bold text-slate-900">{planeamientoCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">Exámenes de Respaldo</div>
            <div className="text-xl font-bold text-slate-900">{examenesCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">Guías & Prácticas GTA</div>
            <div className="text-xl font-bold text-slate-900">{guiasCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
            <FolderArchive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">Total Archivos Nube</div>
            <div className="text-xl font-bold text-slate-900">{documents.length}</div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Todos los Módulos</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por título o archivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Lista de Documentos Respaldados */}
      {filteredDocs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500 text-xs">
          <FolderArchive className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-700">No hay documentos que coincidan con los filtros seleccionados.</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Haz clic en "Subir Documento o Planeamiento" para respaldar tus archivos en Google Drive.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const categoryBadge = {
              planeamiento: { label: 'Planeamiento MEP', color: 'bg-blue-100 text-blue-800 border-blue-300' },
              examen: { label: 'Examen / Respaldo', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
              guia: { label: 'Guía / GTA', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
              rubrica: { label: 'Rúbrica', color: 'bg-purple-100 text-purple-800 border-purple-300' },
              otro: { label: 'Recurso', color: 'bg-slate-100 text-slate-800 border-slate-300' },
            }[doc.category] || { label: 'Documento', color: 'bg-slate-100 text-slate-800 border-slate-300' };

            return (
              <div
                key={doc.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', categoryBadge.color)}>
                      {categoryBadge.label}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
                      {doc.period || 'I Período'}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-2.5 leading-snug">{doc.title}</h3>
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-slate-400" />
                    {doc.courseName || 'Documento General CINDEA'}
                  </p>

                  <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate text-slate-800 font-medium text-[11px]">{doc.fileName}</span>
                    </div>
                    <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded shrink-0">
                      ☁️ Drive
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-300" />
                    <span>Subido el {new Date(doc.createdAt).toLocaleDateString('es-CR')}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    {doc.fileData && (
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.createElement('a');
                          el.href = doc.fileData!;
                          el.download = doc.fileName;
                          document.body.appendChild(el);
                          el.click();
                          document.body.removeChild(el);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold hover:bg-blue-100 transition"
                      >
                        📥 Descargar
                      </button>
                    )}
                    {doc.driveLink && (
                      <a
                        href={doc.driveLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold hover:bg-slate-200 transition inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Drive
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteDocument(doc.id, doc.title)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                    title="Eliminar documento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE SUBIDA DE DOCUMENTO O PLANEAMIENTO */}
      <Modal
        open={openModal}
        title="Subir y Respaldar Documento en Google Drive"
        onClose={() => {
          setOpenModal(false);
          setUploadSuccess(null);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setOpenModal(false);
                setUploadSuccess(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="upload-doc-form"
              disabled={submitting || !docTitle || !docFileName}
              className="bg-blue-600 hover:bg-blue-700 font-bold"
            >
              {submitting ? 'Guardando en Google Drive...' : 'Subir y Respaldar'}
            </Button>
          </>
        }
      >
        <form id="upload-doc-form" onSubmit={handleUploadDocument} className="space-y-4 text-xs">
          <Input
            label="Título o Identificación del Documento"
            placeholder="Ej. Planeamiento Didáctico Mes de Marzo - Módulo 52"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Categoría del Archivo"
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value as any)}
              options={[
                { value: 'planeamiento', label: '📘 Planeamiento Didáctico MEP' },
                { value: 'examen', label: '📝 Examen / Instrumento de Respaldo' },
                { value: 'guia', label: '📋 Guía de Trabajo Autónomo & Práctica' },
                { value: 'rubrica', label: '📊 Rúbrica de Evaluación' },
                { value: 'otro', label: '📁 Otro Documento Institucional' },
              ]}
              required
            />

            <Select
              label="Período Lectivo"
              value={docPeriod}
              onChange={(e) => setDocPeriod(e.target.value)}
              options={PERIODS}
              required
            />
          </div>

          <Select
            label="Módulo / Curso Asignado"
            value={docCourseId}
            onChange={(e) => setDocCourseId(e.target.value)}
            options={[
              { value: '', label: 'General / Todos los Cursos' },
              ...courses.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          {/* Selector de Archivo */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">
              Seleccionar Archivo (Word, PDF, Excel, Imagen)
            </label>
            <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-5 text-center bg-slate-50 hover:bg-blue-50/40 cursor-pointer transition block space-y-2">
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setDocFileName(file.name);
                    if (!docTitle) {
                      setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      setDocFileData(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <UploadCloud className="w-8 h-8 text-blue-500 mx-auto" />
              <div className="text-xs font-bold text-slate-800">
                {docFileName ? `Archivo seleccionado: ${docFileName}` : 'Haz clic para seleccionar tu archivo de tu computadora'}
              </div>
              <div className="text-[11px] text-slate-400">
                Formatos compatibles: DOCX, PDF, XLSX, PPTX, JPG, PNG (Almacenamiento Seguro Cloud CINDEA)
              </div>
            </label>
          </div>

          {uploadSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
