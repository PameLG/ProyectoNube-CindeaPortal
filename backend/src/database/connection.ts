import { Pool, type PoolClient, type QueryResult } from 'pg';
import { env } from '../config/env';
import fs from 'fs';
import path from 'path';

// Estado de conexión
let isPgAvailable = false;
let pgTested = false;

// Pool estándar de PostgreSQL
export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  max: 10,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 500,
});

pool.on('error', (err) => {
  // Manejo silencioso para no tirar el proceso si cae la BD externa
  if (isPgAvailable) {
    console.warn('[DB] Error en cliente PostgreSQL en reposo:', err.message);
  }
});

// =========================================================================
// MOTOR DE ALMACENAMIENTO EMBEBIDO LOCAL (FALLBACK RESILIENTE PARA DEV/DEMO)
// =========================================================================
interface LocalDBState {
  users: any[];
  teachers: any[];
  students: any[];
  courses: any[];
  enrollments: any[];
  assignments: any[];
  submissions: any[];
  grades: any[];
  attendance: any[];
  announcements: any[];
  files: any[];
  refresh_tokens: any[];
  justifications?: any[];
  teacher_documents?: any[];
}

const LOCAL_DB_PATH = path.resolve(__dirname, '../../data_store.json');

function getInitialSeedData(): LocalDBState {
  const teacherUserId = '11111111-1111-4111-a111-111111111111';
  const teacherId = '22222222-2222-4222-a222-222222222222';
  const student1UserId = '33333333-3333-4333-a333-333333333331';
  const student1Id = '44444444-4444-4444-a444-444444444441';
  const student2UserId = '33333333-3333-4333-a333-333333333332';
  const student2Id = '44444444-4444-4444-a444-444444444442';
  const student3UserId = '33333333-3333-4333-a333-333333333333';
  const student3Id = '44444444-4444-4444-a444-444444444443';
  const course1Id = '55555555-5555-4555-a555-555555555551';
  const course2Id = '55555555-5555-4555-a555-555555555552';

  return {
    users: [
      {
        id: teacherUserId,
        email: 'diana@mep.go.cr',
        password_hash: '$2a$12$e68Y2kYV.7k6q3a9a1wB6OI6VvMkW3WJm9k6q3a9a1wB6OI6VvMkW',
        full_name: 'Prof. Diana Chavarría (Teacher)',
        role: 'teacher',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '88888888-8888-4888-a888-888888888888',
        email: 'pruebaproyecto551@gmail.com',
        password_hash: '$2a$12$e68Y2kYV.7k6q3a9a1wB6OI6VvMkW3WJm9k6q3a9a1wB6OI6VvMkW',
        full_name: 'Prof. Diana Chavarría (Google Cloud)',
        role: 'teacher',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '99999999-9999-4999-a999-999999999999',
        email: 'maria@profesora.app',
        password_hash: '$2a$12$e68Y2kYV.7k6q3a9a1wB6OI6VvMkW3WJm9k6q3a9a1wB6OI6VvMkW',
        full_name: 'María Docente CINDEA',
        role: 'teacher',
        avatar_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    teachers: [
      {
        id: teacherId,
        user_id: teacherUserId,
        employee_number: 'MEP-70231',
        department: 'Departamento de Lenguas Extranjeras (Inglés) - CINDEA',
        phone: '+506 8899-1122',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    students: [],
    courses: [
      {
        id: course1Id,
        teacher_id: teacherId,
        name: 'Módulo 56: Inglés - Nivel Intermedio (CINDEA 10-A)',
        code: 'ENG-CINDEA-56',
        description: 'Grammar, Oral Communication & Reading Comprehension - CINDEA MEP 2026',
        color: '#2563EB',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: course2Id,
        teacher_id: teacherId,
        name: 'Módulo 72: Inglés Técnico & Conversacional (CINDEA 11-B)',
        code: 'ENG-CINDEA-72',
        description: 'Technical English, Job Interviews & Listening Skills - CINDEA MEP 2026',
        color: '#059669',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    enrollments: [],
    assignments: [],
    submissions: [],
    grades: [],
    attendance: [],
    announcements: [
      {
        id: 'ann-1',
        course_id: course1Id,
        title: '📢 Inicio de Lecciones - Módulos de Inglés CINDEA 2026',
        content: 'Estimados estudiantes, les recordamos que el horario de clases nocturnas inicia puntualmente a las 6:00 PM. Por favor consultar su guía de trabajo y materiales en el portal estudiantil.',
        channels: ['email', 'whatsapp'],
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        sent_by: 'Docente de Inglés CINDEA',
      },
      {
        id: 'ann-2',
        course_id: course1Id,
        title: 'ℹ️ Protocolo de Justificación de Ausencias CCSS',
        content: 'Se recuerda que disponen de 3 días hábiles posteriores a la reincorporación para adjuntar su comprobante médico de la CCSS a través de la sección de Justificaciones del portal.',
        channels: ['email', 'whatsapp'],
        created_at: new Date(Date.now() - 86400000).toISOString(),
        sent_by: 'Docente de Inglés CINDEA',
      },
    ],
    files: [],
    refresh_tokens: [],
    justifications: [],
  };
}

let localDb: LocalDBState = (() => {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const data = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
      if (!data.justifications) data.justifications = [];
      return data;
    }
  } catch (e) {
    console.warn('[DB] Creando nuevo almacenamiento local...');
  }
  const seed = getInitialSeedData();
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(seed, null, 2));
  } catch (_) {}
  return seed;
})();

export function saveLocalDb() {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(localDb, null, 2));
  } catch (e) {
    console.error('[DB] Error guardando almacenamiento local:', e);
  }
}

export function getLocalDb() {
  if (!localDb.justifications) {
    localDb.justifications = [];
  }
  if (!localDb.teacher_documents) {
    localDb.teacher_documents = [];
  }
  return localDb;
}

// =========================================================================
// INTERFAZ DB HÍBRIDA (POSTGRESQL EN CLOUD O FALLBACK LOCAL TRANSPARENTE)
// =========================================================================
export async function testConnection(): Promise<boolean> {
  if (pgTested) return isPgAvailable;
  pgTested = true;
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    isPgAvailable = true;
    console.log('✅ [Cloud DB] Conexión exitosa a base de datos PostgreSQL.');
    return true;
  } catch (err: any) {
    isPgAvailable = false;
    console.log('⚡ [Hybrid DB] Modo Cloud Local Activo: Utilizando motor persistente de datos (Resiliente, sin necesidad de Docker local).');
    return false;
  }
}

// Wrapper unificado para transacciones
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pgReady = await testConnection();
  if (pgReady) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // En modo local simulamos la transacción
  const dummyClient: any = {
    query: async (text: string, params: any[]) => {
      // Mock de query para transacciones locales
      return { rows: [], rowCount: 1 };
    },
  };
  return fn(dummyClient);
}
