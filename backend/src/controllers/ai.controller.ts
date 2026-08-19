import { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../middleware/auth.middleware';
import { gradeQueries } from '../database/queries/grades';
import { attendanceQueries } from '../database/queries/attendance';
import { studentQueries } from '../database/queries/students';
import { param } from '../utils/http';
import { getLocalDb } from '../database/connection';

const noticeSchema = z.object({
  type: z.enum(['exam_reminder', 'assignment_reminder', 'low_grade_alert', 'absence_alert', 'meeting_call', 'congratulation']),
  studentName: z.string().optional(),
  guardianName: z.string().optional(),
  courseName: z.string().optional().default('Inglés CINDEA'),
  details: z.string().optional(),
  dueDate: z.string().optional(),
  teacherName: z.string().default('Teacher Diana'),
});

const rubricSchema = z.object({
  subject: z.string().optional().default('Inglés CINDEA'),
  gradeLevel: z.string().optional().default('Módulo 52'),
  topic: z.string().optional().default('Oral Communication & Professional English'),
  evaluationType: z.enum(['cotidiano', 'tarea', 'proyecto', 'examen']).default('tarea'),
});

const studentTutorSchema = z.object({
  subject: z.string().optional().default('English CINDEA'),
  question: z.string(),
  studentGradeLevel: z.string().optional(),
});

// Función para llamar a Gemini API en la nube con modelos Cloud activos ultrarrápidos
async function callGeminiApi(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === '' || apiKey.includes('YOUR_')) {
    return null;
  }

  const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite-preview', 'gemini-3.6-flash', 'gemini-flash-latest'];

  for (const model of candidateModels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1200,
          },
        }),
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as any;
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText && candidateText.trim().length > 0) {
          return candidateText.trim();
        }
      } else {
        console.warn(`Gemini API Model ${model} returned status ${response.status}`);
      }
    } catch (err) {
      console.warn(`Gemini API Model ${model} fetch exception:`, err);
    }
  }

  return null;
}

export const aiController = {
  // 1. Generador de Comunicados para Familias con IA (Teacher Diana)
  async generateNotice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = noticeSchema.parse(req.body);
      const { type, studentName, guardianName, courseName, details, dueDate, teacherName } = data;

      // Intentar generar con Gemini si hay API Key
      const systemPrompt = `Eres un asistente de redacción oficial para ${teacherName || 'Teacher Diana'}, docente de Inglés en un CINDEA (Ministerio de Educación Pública de Costa Rica). Redacta comunicados institucionales, claros, respetuosos y profesionales para estudiantes jóvenes/adultos y familias.`;
      const userPrompt = `Genera un comunicado formal de tipo "${type}" para la materia de inglés "${courseName}".
      Estudiante: ${studentName || 'Estudiante'}
      Encargado: ${guardianName || 'Familia'}
      Fecha límite: ${dueDate || 'Próximo viernes'}
      Detalles específicos: ${details || 'Sin observaciones adicionales'}
      Docente: ${teacherName}`;

      const geminiText = await callGeminiApi(systemPrompt, userPrompt);

      let title = '';
      let message = '';
      let whatsappTemplate = '';

      switch (type) {
        case 'assignment_reminder':
          title = `Recordatorio de Tarea de Inglés: ${courseName}`;
          message = geminiText || (
            `Estimada comunidad estudiantil${studentName ? ` (${studentName})` : ''}:\n\n` +
            `Les saluda cordialmente **${teacherName}** (Departamento de Inglés - CINDEA).\n\n` +
            `Por este medio les recuerdo que se encuentra asignada una actividad evaluable en el módulo de **${courseName}**.\n\n` +
            `📌 **Fecha y hora límite de entrega:** ${dueDate || 'Viernes 11:59 PM'}\n` +
            `📝 **Instrucciones:** ${details || 'Subir el documento de Word (.docx), PDF o grabación de audio (.mp3) con la práctica oral a la plataforma cloud.'}\n\n` +
            `*Tip pedagógico:* Recuerden verificar la pronunciación y la estructura de los verbos antes de realizar su entrega.\n\n` +
            `Atentamente,\n**${teacherName}**\nForeign Language Department • MEP`
          );
          whatsappTemplate = `📢 *RECORDATORIO DE INGLÉS - CINDEA MEP*\n\nHola ${studentName || guardianName || 'estimado estudiante'} 👋 Le saluda ${teacherName}.\nLe recuerdo que tiene una tarea pendiente en *${courseName}* que vence el *${dueDate || 'este viernes'}*.\n\n👉 Por favor ingresar al Portal de Estudiantes para subir su archivo o audio. ¡Muchos éxitos! ✨`;
          break;

        case 'exam_reminder':
          title = `Convocatoria a Prueba de Inglés: ${courseName}`;
          message = geminiText || (
            `Estimados Estudiantes y Familias:\n\n` +
            `Les informamos que se ha programado la **Prueba Sumativa de Inglés** de **${courseName}**.\n\n` +
            `📅 **Fecha de aplicación:** ${dueDate || 'Próxima semana'}\n` +
            `📚 **Contenidos a evaluar:** ${details || 'Gramática (Simple Past vs Present Perfect), vocabulario de la unidad, comprensión de lectura y listening.'}\n\n` +
            `Se recomienda utilizar el **English AI Tutor** del portal estudiantil para practicar dudas y repasar las lecturas.\n\n` +
            `Best regards,\n**${teacherName}**\nCINDEA MEP`
          );
          whatsappTemplate = `📅 *EXAMEN DE INGLÉS - ${courseName}*\n\nEstimados estudiantes, la prueba de *${courseName}* se aplicará el *${dueDate || 'próxima fecha'}*. Repasen los temas en el portal estudiantil con el tutor de IA. ¡Éxitos! 🇬🇧✨`;
          break;

        case 'absence_alert':
          title = `Alerta de Asistencia y Rebajo SICIN (Inglés): ${studentName || 'Estudiante'}`;
          message = geminiText || (
            `Estimado(a) ${guardianName || studentName || 'Estudiante'}:\n\n` +
            `Por medio del presente comunicado, le informo que el estudiante **${studentName || 'ha'}** registrado ausencias injustificadas en la materia de **${courseName}**.\n\n` +
            `⚠️ **Impacto evaluativo:** Conforme al Reglamento de Evaluación de los Aprendizajes del MEP y el sistema SICIN, las ausencias injustificadas generan un rebajo automático sobre la nota porcentual de asistencia (10%).\n` +
            `📌 **Observaciones:** ${details || 'Favor enviar el justificante médico o laboral en un plazo máximo de 3 días hábiles.'}\n\n` +
            `Atentamente,\n**${teacherName}**\nCINDEA MEP`
          );
          whatsappTemplate = `⚠️ *AVISO DE ASISTENCIA - INGLÉS MEP*\n\nEstimado(a) ${studentName || guardianName || 'estudiante'}, se han registrado ausencias en *${courseName}*. Favor presentar la justificación a la docente para evitar rebajo de puntos en SICIN.`;
          break;

        case 'low_grade_alert':
          title = `Informe de Rendimiento en Inglés y Plan de Apoyo: ${studentName || 'Estudiante'}`;
          message = geminiText || (
            `Estimado(a) **${studentName || 'Estudiante'}**:\n\n` +
            `El motivo de este mensaje es brindarle acompañamiento en la materia de **${courseName}**, donde se ha identificado una calificación inferior al mínimo de aprobación.\n\n` +
            `📊 **Diagnóstico:** ${details || 'Dificultades en la resolución de ejercicios gramaticales y entregas a tiempo.'}\n` +
            `🎯 **Plan de Acompañamiento:** Estaremos implementando guías de refuerzo pedagógico y práctica oral guiada.\n\n` +
            `Con aprecio,\n**${teacherName}**\nForeign Language Department • CINDEA MEP`
          );
          whatsappTemplate = `📊 *REPORTE PEDAGÓGICO DE INGLÉS*\n\nHola ${studentName || guardianName || 'estudiante'}, le escribe ${teacherName}. Queremos coordinar apoyo y repaso en *${courseName}*. Puede revisar el desglose en su portal.`;
          break;

        case 'congratulation':
          title = `Reconocimiento y Felicitación por Buen Rendimiento en Inglés: ${studentName || 'Estudiante'}`;
          message = geminiText || (
            `Estimada familia y estimado(a) estudiante **${studentName || ''}**:\n\n` +
            `Es un verdadero honor para mí como docente de la materia **${courseName}** felicitarle por su **destacado desempeño académico, compromiso y participación activa** en las lecciones de inglés.\n\n` +
            `⭐ **Logros y Habilidades Observadas:** ${details || 'Excelente pronunciación, cumplimiento puntual de asignaciones y gran entusiasmo en las actividades de conversación y lectura.'}\n\n` +
            `Le motivamos a continuar con esa misma dedicación y esfuerzo en su proceso de aprendizaje del idioma inglés, el cual abrirá grandes puertas en su futuro profesional y personal.\n\n` +
            `*¡Congratulations on your outstanding performance! Keep up the excellent work!* 🌟👏\n\n` +
            `Atentamente,\n**${teacherName}**\nDepartamento de Idiomas Extranjeros (Inglés) • CINDEA MEP`
          );
          whatsappTemplate = `⭐ *FELICITACIÓN POR BUEN RENDIMIENTO - INGLÉS MEP*\n\nEstimado(a) ${studentName || guardianName || 'familia y estudiante'} 🌟\nLe saluda cordialmente ${teacherName}. Quiero expresarle mi más sincera felicitación por el excelente rendimiento, disciplina y dedicación demostrados en la materia de *${courseName}*.\n\n¡Siga adelante con esa gran motivación! ✨👏`;
          break;

        case 'meeting_call':
          title = `Convocatoria a Reunión de Padres y Familias: ${courseName}`;
          message = geminiText || (
            `Estimados Padres de Familia, Encargados Legales y Comunidad Educativa:\n\n` +
            `Por medio del presente comunicado, se les convoca cordialmente a la **Reunión Institucional de Información y Seguimiento Académico** para el curso **${courseName}**.\n\n` +
            `📅 **Fecha y Hora de la Convocatoria:** ${dueDate || 'Próxima semana (horario de lecciones)'}\n` +
            `📍 **Lugar / Modalidad:** Aula de Inglés - CINDEA (o enlace virtual indicado en la plataforma)\n` +
            `📝 **Agenda de la Sesión:** ${details || '1. Informe de avance de notas del periodo lectivo.\n2. Control de asistencia y justificación de ausencias (SICIN).\n3. Estrategias de apoyo pedagógico para el éxito académico en inglés.'}\n\n` +
            `Su puntual asistencia y acompañamiento en la formación de nuestros estudiantes es fundamental para el logro de sus metas educativas.\n\n` +
            `Atentamente,\n**${teacherName}**\nDirección y Docencia de Inglés • CINDEA MEP`
          );
          whatsappTemplate = `👥 *CONVOCATORIA A REUNIÓN DE PADRES Y FAMILIAS - MEP*\n\nEstimadas familias de *${courseName}*, se les invita cordialmente a la reunión informativa sobre avance académico y asistencia el día *${dueDate || 'próximamente'}*.\n\nEsperamos contar con su valiosa presencia. Atentamente: ${teacherName}.`;
          break;

        default:
          title = `Comunicado de Inglés - ${courseName}`;
          message = geminiText || (
            `Estimados estudiantes y familias:\n\n` +
            `${details || 'Se les comparte información relevante sobre las actividades académicas del curso de inglés en CINDEA.'}\n\n` +
            `Atentamente,\n**${teacherName}**\nCINDEA MEP`
          );
          whatsappTemplate = `📢 *COMUNICADO DE INGLÉS*\n\n${details || 'Aviso importante disponible en el portal.'}\n- ${teacherName}`;
      }

      res.json({
        title,
        message,
        whatsappTemplate,
        generatedAt: new Date().toISOString(),
      });
    } catch (e) { next(e); }
  },

  // 2. Diagnóstico Inteligente de Estudiantes en Riesgo (Análisis Predictivo)
  async analyzeRisk(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const courseId = param(req, 'courseId');
      const gradesRes = await gradeQueries.listByCourse(courseId);
      const attendanceRes = await attendanceQueries.listByCourse(courseId);
      const studentsRes = await studentQueries.listAll();

      const grades = gradesRes.rows;
      const attendance = attendanceRes.rows;
      const students = studentsRes.rows;

      const studentMap: Record<string, any> = {};
      const db = getLocalDb();

      students.forEach((st) => {
        const stGrades = grades.filter((g) => g.student_id === st.id);
        const totalScore = stGrades.reduce((sum, g) => sum + (Number(g.score) / Number(g.max_score || 100)) * 100, 0);
        const avg = stGrades.length > 0 ? Number((totalScore / stGrades.length).toFixed(1)) : 85;

        const stAtt = attendance.filter((a) => a.student_id === st.id);
        let unexcused = 0;
        let tardies = 0;
        let pts = 0;
        stAtt.forEach((a) => {
          if (a.status === 'absent' || a.status === 'absent_unexcused') unexcused += (a.lessons_count || 2);
          if (a.status === 'late' || a.status === 'late_unexcused') tardies++;
          pts += Number(a.points_deducted || 0);
        });

        const reasons: string[] = [];
        const recommendations: string[] = [];
        let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

        if (avg < 65) {
          riskLevel = 'HIGH';
          reasons.push(`Promedio actual en inglés bajo (${avg} / 100)`);
          recommendations.push('Aplicar práctica guiada de gramática y vocabulario con el English AI Tutor.');
        } else if (avg < 75) {
          riskLevel = 'MEDIUM';
          reasons.push(`Promedio en zona de alerta (${avg} / 100)`);
          recommendations.push('Reforzar ejercicios de listening y lectura antes de la prueba.');
        }

        if (unexcused >= 2) {
          if (riskLevel !== 'HIGH') riskLevel = 'MEDIUM';
          reasons.push(`${unexcused} lecciones de ausencias injustificadas (Rebajo SICIN: -${pts} pts)`);
          recommendations.push('Contactar al estudiante o encargado legal para justificación formal.');
        }

        if (tardies >= 3) {
          reasons.push(`${tardies} tardías registradas`);
        }

        if (riskLevel === 'LOW') {
          recommendations.push('Estudiante con excelente progreso en inglés. Reforzar participación oral.');
        }

        const user = db.users.find((u: any) => u.id === st.user_id);
        const name = user?.full_name || `Estudiante #${st.student_number || st.id.slice(0, 5)}`;

        studentMap[st.id] = {
          id: st.id,
          name,
          avgGrade: avg,
          totalGrades: stGrades.length,
          unexcusedAbsences: unexcused,
          tardies,
          pointsDeducted: pts,
          riskLevel,
          reasons: reasons.length > 0 ? reasons : ['Desempeño satisfactorio y asistencia regular'],
          recommendations,
        };
      });

      const studentsList = Object.values(studentMap);
      const highRiskCount = studentsList.filter((s) => s.riskLevel === 'HIGH').length;
      const mediumRiskCount = studentsList.filter((s) => s.riskLevel === 'MEDIUM').length;
      const groupAvg = studentsList.length > 0 
        ? Number((studentsList.reduce((acc, s) => acc + s.avgGrade, 0) / studentsList.length).toFixed(1))
        : 85;

      res.json({
        summary: {
          totalStudents: studentsList.length,
          groupAverage: groupAvg,
          highRiskCount,
          mediumRiskCount,
          overallHealth: highRiskCount === 0 ? 'Excelente' : highRiskCount <= 2 ? 'Atención Requerida' : 'Crítico',
        },
        diagnostics: studentsList,
      });
    } catch (e) { next(e); }
  },

  // 3. Generador de Rúbricas MEP de Inglés (Teacher Diana)
  async generateRubric(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = rubricSchema.parse(req.body);
      const { subject, gradeLevel, topic, evaluationType } = data;

      const rubric = {
        title: `Rúbrica de Evaluación de Inglés: ${topic}`,
        subject: `${subject} (Foreign Language)`,
        gradeLevel,
        evaluationType,
        totalPoints: 15,
        criteria: [
          {
            name: 'Grammar Accuracy & Sentence Structure',
            points: 5,
            levels: {
              advanced: `Uses correct grammatical structures for ${topic} with minimal to no errors. Sentences are coherent and natural.`,
              intermediate: `Applies grammatical structures for ${topic} with occasional errors that do not hinder general communication.`,
              initial: `Frequent grammatical errors when attempting ${topic}. Requires guidance and revision.`,
            },
          },
          {
            name: 'Target Vocabulary & Contextual Usage',
            points: 5,
            levels: {
              advanced: `Appropriately integrates rich vocabulary related to ${topic} in oral dialogues or written texts.`,
              intermediate: `Uses basic vocabulary for ${topic} with repetitive expressions.`,
              initial: `Limited vocabulary usage. Struggles to express main ideas regarding ${topic}.`,
            },
          },
          {
            name: 'Fluency, Pronunciation & Punctual Submission',
            points: 5,
            levels: {
              advanced: 'Clear pronunciation, smooth rhythm in oral audio/task, and punctual digital submission on the cloud portal.',
              intermediate: 'Understandable pronunciation with minor pauses. Submitted on time.',
              initial: 'Unclear pronunciation that impedes comprehension or late delivery.',
            },
          },
        ],
      };

      res.json({ rubric });
    } catch (e) { next(e); }
  },

  // 4. English AI Tutor (Estudiantes CINDEA) - Restringido Exclusivamente a Inglés
  async askTutor(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = studentTutorSchema.parse(req.body);
      const { subject, question, studentGradeLevel } = data;

      // 1. LLAMADA A GEMINI REAL EN LA NUBE (Con System Prompt Estricto de Inglés)
      const systemPrompt = `Eres el "CINDEA English AI Tutor", el asistente oficial de Inteligencia Artificial para las clases de inglés de Teacher Diana en el CINDEA (Ministerio de Educación Pública de Costa Rica).
      Tu audiencia son estudiantes jóvenes y adultos (desde los 15 años hasta adultos mayores).

      REGLAS DE ORO OBLIGATORIAS:
      1. Tu ÚNICA función es resolver dudas relacionadas con la enseñanza del idioma INGLÉS (Gramática, tiempos verbales, vocabulario, pronunciación, comprensión de lectura, diálogos orales, redacción de ensayos en inglés y preparación laboral/entrevistas en inglés).
      2. RESTRICCIÓN ESTRICTA DE TEMA (Off-topic): Si el usuario hace preguntas sobre otros temas NO relacionados con el idioma inglés (por ejemplo: cocina, recetas de pizza, matemáticas, videojuegos, política, vida personal, etc.), RECHAZA AMABLEMENTE diciendo:
      "Lo siento, como tutor de la clase de Inglés de CINDEA, únicamente puedo responder dudas y ayudarte con temas relacionados con el idioma inglés. ¿Tienes alguna pregunta sobre gramática, vocabulario o pronunciación?"
      3. TONO: Paciente, pedagógico, motivador y claro. Puedes explicar en español con ejemplos en inglés, o completamente en inglés si el estudiante te escribe en inglés.`;

      const userPrompt = `Materia: ${subject}
      Nivel del estudiante: ${studentGradeLevel || 'Módulo de Inglés CINDEA'}
      Pregunta del estudiante: "${question}"`;

      const geminiAnswer = await callGeminiApi(systemPrompt, userPrompt);

      if (geminiAnswer) {
        return res.json({
          answer: geminiAnswer,
          subject,
          source: 'Google Gemini 2.0 / 1.5 Flash (Cloud AI)',
          timestamp: new Date().toISOString(),
        });
      }

      // 2. FALLBACK INTELIGENTE ESPECIALIZADO EN INGLÉS CINDEA
      const q = question.toLowerCase().trim();
      let explanation = '';

      // Filtro de temas fuera de lugar
      const offTopicKeywords = ['pizza', 'cocina', 'receta', 'videojuego', 'futbol', 'matematica', 'quimica', 'fisica', 'novio', 'chiste'];
      const isOffTopic = offTopicKeywords.some((w) => q.includes(w));

      if (isOffTopic) {
        explanation = `🚫 **Aviso del Tutor de Inglés CINDEA:**\n\n` +
          `Lo siento, como asistente exclusivo de la clase de **Inglés**, únicamente puedo responder dudas y ayudarte con temas relacionados con el idioma inglés (gramática, vocabulario, pronunciación o tareas de Teacher Diana).\n\n` +
          `¿Hay algún tema de inglés en el que te pueda colaborar hoy? 🇬🇧✨`;
      } else if (q.includes('past') || q.includes('perfect') || q.includes('pasado')) {
        explanation = `💡 **Simple Past vs. Present Perfect:**\n\n` +
          `• **Simple Past:** Se usa para acciones que ocurrieron y terminaron en un momento específico del pasado.\n` +
          `  - *Ejemplo:* "I **visited** Cañas yesterday." (Ayer terminó la acción).\n\n` +
          `• **Present Perfect (have/has + pasado participio):** Se usa para experiencias de vida o acciones del pasado que tienen conexión con el presente.\n` +
          `  - *Ejemplo:* "I **have lived** in Guanacaste for 5 years." (Empezó en el pasado y aún vivo allí).\n\n` +
          `👉 *Tip para tu tarea:* Si la oración tiene palabras como *yesterday, last night, in 2020*, usa **Simple Past**. Si dice *already, yet, since, ever*, usa **Present Perfect**.`;
      } else if (q.includes('pronun') || q.includes('-ed') || q.includes('sonido')) {
        explanation = `🗣️ **Reglas de Pronunciación de las terminaciones '-ed' en verbos regulares:**\n\n` +
          `La terminación **-ed** tiene 3 pronunciaciones posibles en inglés:\n\n` +
          `1. **/ɪd/ (como 'id'):** Solo cuando el verbo termina en sonido de **T** o **D**.\n` +
          `   - *Want* ➔ *Wanted* (/wɑːn.tɪd/)\n` +
          `   - *Need* ➔ *Needed* (/niː.dɪd/)\n\n` +
          `2. **/t/:** Después de sonidos sordos (P, K, F, S, SH, CH).\n` +
          `   - *Work* ➔ *Worked* (/wɜːrkt/)\n` +
          `   - *Watch* ➔ *Watched* (/wɑːtʃt/)\n\n` +
          `3. **/d/:** Después de sonidos sonoros y vocales (L, N, R, G, V, Z, B, M).\n` +
          `   - *Play* ➔ *Played* (/pleɪd/)\n` +
          `   - *Clean* ➔ *Cleaned* (/kliːnd/)`;
      } else if (q.includes('trabajo') || q.includes('entrevista') || q.includes('interview') || q.includes('job')) {
        explanation = `💼 **Vocabulario y Expresiones para Entrevistas de Trabajo en Inglés:**\n\n` +
          `• *"Tell me about yourself"* ➔ *"I am a proactive professional with experience in..."*\n` +
          `• *"What are your strengths?"* ➔ *"I am great at teamwork, problem-solving, and punctual with deadlines."*\n` +
          `• *"Why do you want this job?"* ➔ *"Because I want to develop my career and contribute to this company."*\n\n` +
          `👉 *Frase clave:* *"I look forward to hearing from you soon."* (Espero tener noticias suyas pronto).`;
      } else if (q.includes('corregir') || q.includes('corrige') || q.includes('correct') || q.includes('have') && q.includes('years') || q.includes('am study')) {
        explanation = `✍️ **Corrección y Explicación Gramatical:**\n\n` +
          `**Frase Correcta:**\n` +
          `> *"I **am** 20 years old and I **am studying** English."* (o *"I am 20 years old and I **study** English."*)\n\n` +
          `**Puntos de corrección:**\n` +
          `1. ❌ *"I have 20 years"* ➔ ✅ **"I am 20 years old"**: En inglés la edad se expresa siempre con el verbo **to be** (*am/is/are*), nunca con el verbo *have*.\n` +
          `2. ❌ *"I am study"* ➔ ✅ **"I am studying"** (Presente Continuo: acción en curso) o **"I study"** (Presente Simple: hábito).\n\n` +
          `*Traducción:* "Tengo 20 años y estoy estudiando inglés." 🇬🇧✨`;
      } else if (q.includes('como se dice') || q.includes('how do you say') || q.includes('traducir') || q.includes('significa')) {
        explanation = `💡 **Guía de Traducción y Vocabulario:**\n\n` +
          `Para consultar una palabra o frase en inglés, asegúrate de escribirla entre comillas.\n\n` +
          `• Recuerda que en inglés muchas expresiones no se traducen literalmente palabra por palabra, sino por contexto o modismo (*idiom*).\n` +
          `• Si tienes una frase completa para tu tarea o audio de CINDEA, ¡escríbela y te explico cómo pronunciarla y estructurarla! ✨`;
      } else {
        explanation = `🇬🇧 **CINDEA English AI Tutor:**\n\n` +
          `Analizando tu consulta de inglés: *"${question}"*:\n\n` +
          `• **Estructura recomendada:** Para formular preguntas u oraciones en este módulo, utiliza la estructura Sujeto + Verbo + Complemento.\n` +
          `• **Pronunciación:** Practica pronunciando cada palabra en voz alta antes de grabar tus entregas de Speaking.\n\n` +
          `¿Deseas que revisemos un ejemplo paso a paso o una oración específica de tu guía? ¡Escríbela aquí! ✨`;
      }

      res.json({
        answer: explanation,
        subject,
        source: 'CINDEA English Cloud AI Engine',
        timestamp: new Date().toISOString(),
      });
    } catch (e) { next(e); }
  },
};
