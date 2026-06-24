import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  UseInterceptors,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { InternalSecretGuard } from './internal-secret.guard';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';

const logger = new Logger('AuthController');

const rateLimitMap = new Map<string, number[]>();

// Har 5 daqiqada eski yozuvlarni tozalash (Memory Leak oldini olish)
setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of rateLimitMap.entries()) {
    const fresh = times.filter((t) => now - t < 60_000);
    if (fresh.length === 0) rateLimitMap.delete(ip);
    else rateLimitMap.set(ip, fresh);
  }
}, 5 * 60 * 1000).unref();

function checkRateLimit(ip: string, max = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const hits = (rateLimitMap.get(ip) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) return false;
  hits.push(now);
  rateLimitMap.set(ip, hits);
  return true;
}

function parseCookieToken(req: Request): string | null {
  const cookieHeader = req.headers.cookie || '';
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((part) => {
    const [k, ...v] = part.trim().split('=');
    if (k) cookies[k.trim()] = v.join('=').trim();
  });
  return cookies['tg_access_token'] || null;
}

// Magic number tekshiruvi (mimetype spoofing oldini olish)
function checkMagicBytes(filePath: string): boolean {
  try {
    const buf = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    // JPEG: FF D8 FF
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true;
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true;
    // GIF: GIF87a / GIF89a
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true;
    // WebP: RIFF....WEBP
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
        buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;
    return false;
  } catch {
    return false;
  }
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body.name, body.email, body.password);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.authService.login(user);
  }

  @UseGuards(InternalSecretGuard)
  @HttpCode(HttpStatus.OK)
  @Post('verify-token')
  async verifyToken(@Body() body: { token: string }, @Req() req: Request, @Res() res: Response) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip, 10, 60_000)) {
      return res.status(429).json({ error: 'too_many_requests' });
    }
    const token = (body.token || '').trim();
    if (!token) {
      return res.status(400).json({ error: 'invalid_token_format' });
    }
    const result = await this.authService.verifyAuthToken(token);
    if (!result) {
      return res.status(401).json({ error: 'invalid_or_expired_token' });
    }
    res.cookie('tg_access_token', result.jwt, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    return res.json({
      user: {
        telegram_id: result.user.telegram_id,
        first_name: result.user.first_name,
        username: result.user.username,
        created_at: result.user.created_at,
        avatar_url: result.user.avatar_url,
      },
    });
  }

  @Get('validate')
  async validateToken(@Query('token') token: string, @Req() req: Request, @Res() res: Response) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      throw new ForbiddenException('Too many requests');
    }
    if (!token) {
      return res.status(400).json({ error: 'token_missing' });
    }
    const result = await this.authService.validateTelegramToken(token);
    if (!result) {
      return res.status(401).json({ error: 'invalid_or_expired_token' });
    }
    res.cookie('tg_access_token', result.jwt, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    return res.json({
      user: {
        telegram_id: result.user.telegram_id,
        first_name: result.user.first_name,
        username: result.user.username,
        created_at: result.user.created_at,
        avatar_url: result.user.avatar_url,
      },
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('telegram-webapp')
  async telegramWebApp(@Body() body: { initData: string }, @Req() req: Request, @Res() res: Response) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip, 20, 60_000)) {
      return res.status(429).json({ error: 'too_many_requests' });
    }
    const initData = (body.initData || '').trim();
    if (!initData) {
      return res.status(400).json({ error: 'initData_missing' });
    }
    const result = await this.authService.authenticateTelegramWebApp(initData);
    if (!result) {
      return res.status(401).json({ error: 'invalid_initData' });
    }
    res.cookie('tg_access_token', result.jwt, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    return res.json({
      user: {
        telegram_id: result.user.telegram_id,
        first_name: result.user.first_name,
        username: result.user.username,
        created_at: result.user.created_at,
        avatar_url: result.user.avatar_url,
      },
    });
  }

  @Get('me')
  async me(@Req() req: Request) {
    const token = parseCookieToken(req);
    if (!token) throw new UnauthorizedException('Autentifikatsiya talab qilinadi');
    const payload = this.authService.verifyJwt(token);
    const user = await this.authService.findUserByTelegramId(payload.telegram_id);
    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');
    return {
      telegram_id: user.telegram_id,
      first_name: user.first_name,
      username: user.username,
      avatar_url: user.avatar_url,
    };
  }

  @Post('upload-avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'avatars'),
        filename: (_req: any, file: any, cb: any) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        const allowedExtensions = /\.(jpg|jpeg|png|webp|gif)$/i;
        if (!allowedMimeTypes.includes(file.mimetype) || !allowedExtensions.test(file.originalname)) {
          return cb(new BadRequestException('Faqat rasm fayllari qabul qilinadi (jpg, png, webp, gif)'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(@Req() req: Request & { file?: any }, @Res() res: Response) {
    const token = parseCookieToken(req);
    if (!token) return res.status(401).json({ error: 'unauthorized' });
    let telegram_id: string;
    try {
      const payload = this.authService.verifyJwt(token);
      telegram_id = payload.telegram_id;
    } catch {
      return res.status(401).json({ error: 'invalid_token' });
    }
    const user = await this.authService.findUserByTelegramId(telegram_id);
    if (!user) return res.status(401).json({ error: 'user_not_found' });
    if (!req.file) {
      return res.status(400).json({ error: 'file_required' });
    }

    // Magic number tekshiruvi — mimetype spoofing oldini olish
    const savedPath = req.file.path;
    if (!checkMagicBytes(savedPath)) {
      try { fs.unlinkSync(savedPath); } catch {}
      logger.warn(`uploadAvatar: magic bytes mos kelmadi (${telegram_id})`);
      return res.status(400).json({ error: 'invalid_image_file' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await this.authService.updateAvatar(telegram_id, avatarUrl);
    return res.json({ ok: true, avatar_url: avatarUrl });
  }

  @Patch('update-profile')
  async updateProfile(@Req() req: Request, @Res() res: Response, @Body() body: { first_name?: string }) {
    const token = parseCookieToken(req);
    if (!token) return res.status(401).json({ error: 'unauthorized' });
    let telegram_id: string;
    try {
      const payload = this.authService.verifyJwt(token);
      telegram_id = payload.telegram_id;
    } catch {
      return res.status(401).json({ error: 'invalid_token' });
    }
    await this.authService.updateProfile(telegram_id, { first_name: body.first_name });
    const user = await this.authService.findUserByTelegramId(telegram_id);
    return res.json({
      ok: true,
      user: {
        telegram_id: user?.telegram_id,
        first_name: user?.first_name,
        username: user?.username,
        avatar_url: user?.avatar_url,
      },
    });
  }

  @Post('logout')
  async logout(@Res() res: Response) {
    res.clearCookie('tg_access_token', { path: '/' });
    return res.json({ ok: true });
  }
}
