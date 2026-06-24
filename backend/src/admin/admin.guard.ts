import {
  CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramUser } from '../telegram/telegram-user.entity';
import type { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(TelegramUser)
    private userRepo: Repository<TelegramUser>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const cookieHeader = req.headers.cookie || '';
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach((part) => {
      const [k, ...v] = part.trim().split('=');
      if (k) cookies[k.trim()] = v.join('=').trim();
    });
    const token = cookies['tg_access_token'];
    if (!token) throw new UnauthorizedException('Token yo\'q');

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token noto\'g\'ri');
    }

    const user = await this.userRepo.findOne({ where: { telegram_id: payload.telegram_id } });
    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');
    if (user.role !== 'admin') throw new ForbiddenException('Admin huquqi yo\'q');

    (req as any).adminUser = user;
    return true;
  }
}
