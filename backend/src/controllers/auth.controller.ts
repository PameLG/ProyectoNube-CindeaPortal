import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  registerTeacher,
  loginWithPassword,
  rotateRefreshToken,
  logoutWithRefreshToken,
} from '../services/auth.service';
import { userQueries, toPublicUser } from '../database/queries/users';
import type { AuthRequest } from '../middleware/auth.middleware';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = registerSchema.parse(req.body);
      const result = await registerTeacher(data);
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = loginSchema.parse(req.body);
      const result = await loginWithPassword(data.email, data.password);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);
      const result = await rotateRefreshToken(refreshToken);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = (req.body ?? {}) as { refreshToken?: string };
      if (refreshToken) await logoutWithRefreshToken(refreshToken);
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },

  async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.json({ user: null });
      const result = await userQueries.findById(req.user.id);
      const user = result.rows[0];
      if (!user || !user.is_active) {
        return res.json({ user: null });
      }
      res.json({ user: toPublicUser(user) });
    } catch (e) {
      next(e);
    }
  },
};
