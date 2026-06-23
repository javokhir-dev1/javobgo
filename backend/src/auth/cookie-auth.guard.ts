import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AuthService } from './auth.service';

@Injectable()
export class CookieAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user: any }>();

    const cookieHeader = req.headers.cookie || '';
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach((part) => {
      const [k, ...v] = part.trim().split('=');
      if (k) cookies[k.trim()] = v.join('=').trim();
    });

    const token = cookies['tg_access_token'];
    if (!token) throw new UnauthorizedException('Autentifikatsiya talab qilinadi');

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token muddati otgan yoki notogri');
    }

    // DB da haqiqatda shu user borligini tekshirish
    const user = await this.authService.findUserByTelegramId(payload.telegram_id);
    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');

    req.user = payload;
    return true;
  }
}
