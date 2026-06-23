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
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { InternalSecretGuard } from './internal-secret.guard';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

const rateLimitMap = new Map<string, number[]>();
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
  @Post('verify-otp')
  async verifyOtp(
    @Body() body: { otp: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip, 10, 60_000)) {
      return res.status(429).json({ error: 'too_many_requests' });
    }

    const otp = (body.otp || '').trim();
    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: 'invalid_otp_format' });
    }

    const result = await this.authService.verifyOtp(otp);
    if (!result) {
      return res.status(401).json({ error: 'invalid_or_expired_otp' });
    }

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('tg_access_token', result.jwt, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
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
  async validateToken(
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
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

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('tg_access_token', result.jwt, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
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

    // 1. JWT imzosi va muddatini tekshirish
    const payload = this.authService.verifyJwt(token);

    // 2. DB da haqiqatda shu user borligini tekshirish
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
        if (!file.originalname.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
          return cb(new BadRequestException('Faqat rasm fayllari qabul qilinadi'), false);
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

    // DB da user borligini tekshirish
    const user = await this.authService.findUserByTelegramId(telegram_id);
    if (!user) return res.status(401).json({ error: 'user_not_found' });

    if (!req.file) {
      return res.status(400).json({ error: 'file_required' });
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
