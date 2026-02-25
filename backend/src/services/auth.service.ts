import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { SignupInput, LoginInput } from '../validators/auth.validator';
import { JwtPayload } from '../types';
import { Role } from '@prisma/client';

export class AuthService {
  async signup(data: SignupInput) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw { status: 409, message: 'Email already in use', code: 'DUPLICATE_EMAIL' };
    }

    const hashedPassword = await argon2.hash(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role as Role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return user;
  }

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      throw { status: 401, message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' };
    }

    const isValidPassword = await argon2.verify(user.password, data.password);

    if (!isValidPassword) {
      throw { status: 401, message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' };
    }

    const payload: JwtPayload = { sub: user.id, role: user.role };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
      expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as jwt.SignOptions['expiresIn'],
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}

export const authService = new AuthService();