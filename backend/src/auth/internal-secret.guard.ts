import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import type { Request } from 'express';

@Injectable()
export class InternalSecretGuard implements CanActivate {
  private readonly logger = new Logger(InternalSecretGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const secret = req.headers['x-internal-secret'] as string | undefined;
    const expected = process.env.INTERNAL_API_SECRET;

    if (!expected) {
      this.logger.error('INTERNAL_API_SECRET .env da sozlanmagan!');
      throw new UnauthorizedException('INTERNAL_API_SECRET .env da sozlanmagan');
    }

    if (!secret) {
      throw new UnauthorizedException('Ruxsatsiz sorov');
    }

    // timing-safe taqqoslash (secret brute-force dan himoya)
    const secretBuf   = Buffer.from(secret);
    const expectedBuf = Buffer.from(expected);
    if (
      secretBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(secretBuf, expectedBuf)
    ) {
      this.logger.warn("InternalSecretGuard: noto'g'ri secret");
      throw new UnauthorizedException('Ruxsatsiz sorov');
    }

    return true;
  }
}
