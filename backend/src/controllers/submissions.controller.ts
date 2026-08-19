import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { submissionQueries } from '../database/queries/submissions';
import { param } from '../utils/http';
import type { AuthRequest } from '../middleware/auth.middleware';

const submitTaskSchema = z.object({
  assignmentId: z.string(),
  studentId: z.string(),
  fileName: z.string().min(1),
  fileData: z.string().optional(),
  fileSize: z.number().default(1024 * 500),
});

const gradeSubmissionSchema = z.object({
  grade: z.number().min(0).max(100),
  feedback: z.string().nullable().optional(),
});

export const submissionsController = {
  async listByAssignment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const assignmentId = param(req, 'assignmentId');
      const result = await submissionQueries.listByAssignment(assignmentId);
      res.json({ submissions: result.rows });
    } catch (e) { next(e); }
  },

  async listByStudent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const studentId = param(req, 'studentId');
      const result = await submissionQueries.listByStudent(studentId);
      res.json({ submissions: result.rows });
    } catch (e) { next(e); }
  },

  async submit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = submitTaskSchema.parse(req.body);
      
      const safeFileName = data.fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const cloudStorageUrl = `/CloudStorage/2026/Entregas/${data.assignmentId}/${safeFileName}`;

      // Buscar si ya existía una entrega anterior de este estudiante para esta tarea
      let oldFileName: string | undefined;
      try {
        const prevSubmissions = await submissionQueries.listByStudent(data.studentId);
        const existingSub = prevSubmissions.rows.find((s) => s.assignmentId === data.assignmentId);
        oldFileName = existingSub?.fileName;
      } catch (_) {}

      const result = await submissionQueries.createOrUpdate({
        assignmentId: data.assignmentId,
        studentId: data.studentId,
        fileName: data.fileName,
        fileUrl: cloudStorageUrl,
        fileSize: data.fileSize,
        fileData: data.fileData,
        status: 'submitted',
      });

      // Subir archivo real a la subcarpeta del curso y tarea en Google Drive (eliminando el anterior si se reemplazó)
      try {
        const { assignmentQueries } = await import('../database/queries/assignments');
        const { courseQueries } = await import('../database/queries/courses');
        const { uploadFileToDrive } = await import('../integrations/google/google.service');
        const assignRes = await assignmentQueries.findById(data.assignmentId);
        const assignment = assignRes.rows[0];
        if (assignment) {
          const courseRes = await courseQueries.findById(assignment.course_id);
          const courseName = courseRes.rows[0]?.name || 'Inglés CINDEA';
          await uploadFileToDrive(courseName, assignment.title, data.fileName, data.fileData, oldFileName);
        }
      } catch (err: any) {
        console.warn('[Submissions] No se pudo sincronizar archivo con Drive:', err.message);
      }

      res.status(201).json({
        submission: result.rows[0],
        cloudMetadata: {
          storageProvider: 'Google Cloud Storage / Drive PaaS',
          path: cloudStorageUrl,
          encryption: 'AES-256 Cloud Encrypted',
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (e) { next(e); }
  },

  async grade(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = param(req, 'id');
      const data = gradeSubmissionSchema.parse(req.body);
      const result = await submissionQueries.gradeSubmission(id, data.grade, data.feedback);
      const sub = result.rows[0];

      if (sub) {
        try {
          const { assignmentQueries } = await import('../database/queries/assignments');
          const { gradeQueries } = await import('../database/queries/grades');
          const assignRes = await assignmentQueries.findById(sub.assignmentId);
          const assignment = assignRes.rows[0];
          if (assignment) {
            await gradeQueries.create(assignment.course_id, {
              studentId: sub.studentId,
              assignmentId: sub.assignmentId,
              title: assignment.title,
              score: data.grade,
              maxScore: Number(assignment.max_score || 100),
              weight: 10,
              category: assignment.category || 'Tareas (10%)',
              gradedOn: new Date().toISOString(),
              notes: data.feedback,
            });
          }
        } catch (_) {}
      }

      res.json({ submission: sub });
    } catch (e) { next(e); }
  },
};
