import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { RequestLog } from './entities/request-log.entity';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(RequestLog)
    private logRepo: Repository<RequestLog>,
    private jwtService: JwtService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const start = Date.now();

    // JWT dan telegram_id va instagram_account_id olish
    let telegram_id: string | null = null;
    let instagram_account_id: string | null = null;
    try {
      const cookieHeader = req.headers.cookie || '';
      const cookies: Record<string, string> = {};
      cookieHeader.split(';').forEach((part) => {
        const [k, ...v] = part.trim().split('=');
        if (k) cookies[k.trim()] = v.join('=').trim();
      });
      const token = cookies['tg_access_token'];
      if (token) {
        const payload = this.jwtService.verify(token);
        telegram_id = payload.telegram_id || null;
      }
    } catch {}

    // Active Instagram account header dan
    const igHeader = req.headers['x-active-ig-id'] as string | undefined;
    if (igHeader) instagram_account_id = igHeader;

    const method   = req.method;
    const endpoint = req.path || req.url || '';
    const ip       = (req.ip || req.socket?.remoteAddress || null);

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs  = Date.now() - start;
          const statusCode  = context.switchToHttp().getResponse().statusCode || 200;
          this.logRepo.save(
            this.logRepo.create({ telegram_id, instagram_account_id, method, endpoint, statusCode, durationMs, ip }),
          ).catch(() => {});
        },
        error: (err) => {
          const durationMs = Date.now() - start;
          const statusCode = err.status || 500;
          this.logRepo.save(
            this.logRepo.create({ telegram_id, instagram_account_id, method, endpoint, statusCode, durationMs, ip }),
          ).catch(() => {});
        },
      }),
    );
  }
}
