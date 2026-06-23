import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class InternalSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const secret = req.headers['x-internal-secret'];
    const expected = process.env.INTERNAL_API_SECRET;

    console.log('[Guard] INTERNAL_API_SECRET set:', !!expected);
    console.log('[Guard] x-internal-secret received:', !!secret);
    console.log('[Guard] match:', secret === expected);

    if (!expected) {
      console.error('[Guard] INTERNAL_API_SECRET .env da topilmadi!');
      throw new UnauthorizedException('INTERNAL_API_SECRET .env da sozlanmagan');
    }

    if (!secret || secret !== expected) {
      console.error('[Guard] Secret mos kelmadi');
      throw new UnauthorizedException('Ruxsatsiz sorov');
    }

    return true;
  }
}
