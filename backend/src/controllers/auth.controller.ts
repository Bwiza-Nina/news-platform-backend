import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess, sendError } from '../utils/response';

export class AuthController {
  async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.signup(req.body);
      return sendSuccess(res, 'Account created successfully', user, 201);
    } catch (err: any) {
      if (err.code === 'DUPLICATE_EMAIL') {
        return sendError(res, 'Registration failed', ['Email is already in use'], 409);
      }
      next(err); // Pass error to Express error handler
    }
  }

  async login(req: Request, res: Response) {
    try {
      const result = await authService.login(req.body);
      return sendSuccess(res, 'Login successful', result);
    } catch (err: any) {
      if (err.code === 'INVALID_CREDENTIALS') {
        return sendError(res, 'Invalid email or password', null, 401);
      }
      throw err;
    }
  }
}

export const authController = new AuthController();