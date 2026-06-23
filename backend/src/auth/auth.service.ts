import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { TelegramUser } from '../telegram/telegram-user.entity';
import { AuthToken } from './auth-token.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(TelegramUser)
    private telegramUserRepo: Repository<TelegramUser>,
    @InjectRepository(AuthToken)
    private tokenRepo: Repository<AuthToken>,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return { access_token: this.jwtService.sign(payload) };
  }

  async register(name: string, email: string, pass: string) {
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) throw new ConflictException('Email already in use');
    const passwordHash = await bcrypt.hash(pass, 10);
    const newUser = await this.usersService.create({ name, email, passwordHash });
    const { passwordHash: _, ...result } = newUser;
    return result;
  }

  async verifyAuthToken(token: string): Promise<{ jwt: string; user: TelegramUser } | null> {
    return this.validateTelegramToken(token);
  }

  async validateTelegramToken(
    token: string,
  ): Promise<{ jwt: string; user: TelegramUser } | null> {
    console.log('[Auth] OTP qidirilmoqda:', token);

    const authToken = await this.tokenRepo.findOne({
      where: { token, is_used: false },
    });

    console.log('[Auth] DB da topildi:', !!authToken);
    if (authToken) {
      console.log('[Auth] expires_at:', authToken.expires_at, '| hozir:', new Date());
      console.log('[Auth] muddati otganmi:', new Date() > authToken.expires_at);
    }

    if (!authToken) return null;
    if (new Date() > authToken.expires_at) return null;

    authToken.is_used = true;
    await this.tokenRepo.save(authToken);

    const user = await this.telegramUserRepo.findOne({
      where: { telegram_id: authToken.telegram_id },
    });
    if (!user) return null;

    const payload = {
      sub: user.telegram_id,
      telegram_id: user.telegram_id,
      first_name: user.first_name,
      username: user.username,
      auth_type: 'telegram',
    };
    const jwt = this.jwtService.sign(payload, { expiresIn: '7d' });

    return { jwt, user };
  }

  async updateAvatar(telegram_id: string, avatarUrl: string): Promise<void> {
    await this.telegramUserRepo.update({ telegram_id }, { avatar_url: avatarUrl });
  }

  async updateProfile(telegram_id: string, data: { first_name?: string }): Promise<void> {
    const update: Partial<{ first_name: string }> = {};
    if (data.first_name?.trim()) update.first_name = data.first_name.trim();
    if (Object.keys(update).length) {
      await this.telegramUserRepo.update({ telegram_id }, update);
    }
  }

  async findUserByTelegramId(telegram_id: string): Promise<TelegramUser | null> {
    return this.telegramUserRepo.findOne({ where: { telegram_id } });
  }

  verifyJwt(token: string): any {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Notogri yoki muddati otgan token');
    }
  }
}
