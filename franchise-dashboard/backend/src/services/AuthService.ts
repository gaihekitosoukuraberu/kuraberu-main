import jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { User, UserRole } from '../models/User';
import { AppDataSource } from '../config/database';
import { UnauthorizedError, ValidationError } from '../utils/errors';
import { Redis } from '../config/redis';

interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  companyId?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
  deviceId?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private userRepository: Repository<User>;
  private redis: Redis;
  
  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.redis = Redis.getInstance();
  }

  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    const { email, password, deviceId } = credentials;

    // Find user with password field
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'name', 'role', 'companyId', 'isActive', 'lockedUntil', 'failedLoginAttempts'],
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if account is locked
    if (user.isLocked()) {
      throw new UnauthorizedError('Account is locked. Please try again later.');
    }

    // Check if account is active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Validate password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      user.incrementFailedAttempts();
      await this.userRepository.save(user);
      throw new UnauthorizedError('Invalid credentials');
    }

    // Reset failed attempts on successful login
    user.resetFailedAttempts();
    user.lastLoginAt = new Date();
    user.lastLoginIp = deviceId;
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });

    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken, deviceId);

    // Remove password from response
    delete user.password;

    return { user, tokens };
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    // Invalidate refresh token
    if (refreshToken) {
      await this.revokeRefreshToken(userId, refreshToken);
    }

    // Clear user session from Redis
    await this.redis.del(`session:${userId}`);
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    let payload: TokenPayload;
    try {
      payload = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET!
      ) as TokenPayload;
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if refresh token exists in database
    const isValid = await this.validateRefreshToken(payload.userId, refreshToken);
    if (!isValid) {
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    // Get updated user data
    const user = await this.userRepository.findOne({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Generate new tokens
    const newTokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });

    // Replace old refresh token with new one
    await this.replaceRefreshToken(user.id, refreshToken, newTokens.refreshToken);

    return newTokens;
  }

  async validateAccessToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as TokenPayload;

      // Check if user still exists and is active
      const user = await this.userRepository.findOne({
        where: { id: payload.userId },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedError('Invalid token');
      }

      // Check session in Redis for additional validation
      const session = await this.redis.get(`session:${payload.userId}`);
      if (session) {
        const sessionData = JSON.parse(session);
        if (sessionData.revoked) {
          throw new UnauthorizedError('Token has been revoked');
        }
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid token');
      }
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'password'],
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const isValidPassword = await user.validatePassword(currentPassword);
    if (!isValidPassword) {
      throw new ValidationError('Current password is incorrect');
    }

    user.password = newPassword;
    await this.userRepository.save(user);

    // Revoke all refresh tokens to force re-login
    await this.revokeAllRefreshTokens(userId);
  }

  async requestPasswordReset(email: string): Promise<string> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return 'If the email exists, a reset link has been sent';
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'password_reset' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    // Store reset token in Redis with expiry
    await this.redis.setex(
      `password_reset:${user.id}`,
      3600,
      resetToken
    );

    // In production, send email with reset link
    // await emailService.sendPasswordResetEmail(user.email, resetToken);

    return resetToken; // In development, return token directly
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      throw new ValidationError('Invalid or expired reset token');
    }

    if (payload.type !== 'password_reset') {
      throw new ValidationError('Invalid token type');
    }

    // Check if token exists in Redis
    const storedToken = await this.redis.get(`password_reset:${payload.userId}`);
    if (!storedToken || storedToken !== token) {
      throw new ValidationError('Reset token has been used or expired');
    }

    // Update password
    const user = await this.userRepository.findOne({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    user.password = newPassword;
    await this.userRepository.save(user);

    // Delete reset token
    await this.redis.del(`password_reset:${payload.userId}`);

    // Revoke all refresh tokens
    await this.revokeAllRefreshTokens(payload.userId);
  }

  private generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, token: string, deviceId?: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) return;

    // Store refresh token with device info
    const tokenData = {
      token,
      deviceId,
      createdAt: new Date().toISOString(),
    };

    // Store in Redis with expiry
    await this.redis.setex(
      `refresh_token:${userId}:${token}`,
      7 * 24 * 60 * 60, // 7 days
      JSON.stringify(tokenData)
    );

    // Also store in database for persistence
    user.refreshTokens = [...user.refreshTokens, token];
    
    // Limit to 5 refresh tokens per user
    if (user.refreshTokens.length > 5) {
      const oldToken = user.refreshTokens.shift();
      await this.redis.del(`refresh_token:${userId}:${oldToken}`);
    }

    await this.userRepository.save(user);
  }

  private async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    // Check Redis first
    const tokenData = await this.redis.get(`refresh_token:${userId}:${token}`);
    if (!tokenData) {
      return false;
    }

    // Check database as fallback
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    return user?.refreshTokens.includes(token) || false;
  }

  private async replaceRefreshToken(userId: string, oldToken: string, newToken: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) return;

    // Remove old token
    user.refreshTokens = user.refreshTokens.filter(t => t !== oldToken);
    await this.redis.del(`refresh_token:${userId}:${oldToken}`);

    // Add new token
    await this.storeRefreshToken(userId, newToken);
  }

  private async revokeRefreshToken(userId: string, token: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) return;

    user.refreshTokens = user.refreshTokens.filter(t => t !== token);
    await this.userRepository.save(user);
    
    await this.redis.del(`refresh_token:${userId}:${token}`);
  }

  private async revokeAllRefreshTokens(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) return;

    // Delete all tokens from Redis
    for (const token of user.refreshTokens) {
      await this.redis.del(`refresh_token:${userId}:${token}`);
    }

    // Clear from database
    user.refreshTokens = [];
    await this.userRepository.save(user);
  }
}