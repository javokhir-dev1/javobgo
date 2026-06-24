import {
  Controller, Get, Post, Patch, Delete, Body, Query, Param, Res, UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Controller('api/admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // GET /api/admin/stats
  @Get('stats')
  getStats() {
    return this.adminService.getOverallStats();
  }

  // GET /api/admin/stats/hourly
  @Get('stats/hourly')
  getHourlyStats() {
    return this.adminService.getHourlyStats();
  }

  // GET /api/admin/users?page=1&limit=20
  @Get('users')
  getUsers(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.adminService.getUsers(+page, +limit);
  }

  // PATCH /api/admin/users/:telegramId/role
  @Patch('users/:telegramId/role')
  setUserRole(@Param('telegramId') telegramId: string, @Body() body: { role: 'user' | 'admin' }) {
    return this.adminService.setUserRole(telegramId, body.role);
  }

  // GET /api/admin/rate-limit
  @Get('rate-limit')
  getRateLimit() {
    return this.adminService.getRateLimitStatus();
  }

  // GET /api/admin/rate-limit/config
  @Get('rate-limit/config')
  getConfig() {
    return this.adminService.getConfig();
  }

  // PATCH /api/admin/rate-limit/config
  @Patch('rate-limit/config')
  updateConfig(@Body() body: { maxRequestsPerHour?: number; warningThresholdPct?: number; dmLimit?: number; commentLimit?: number }) {
    return this.adminService.updateConfig(body);
  }

  // PATCH /api/admin/rate-limit/override/:igId
  @Patch('rate-limit/override/:igId')
  setCustomLimit(
    @Param('igId') igId: string,
    @Body() body: { customLimit: number | null },
  ) {
    return this.adminService.setIgAccountCustomLimit(igId, body.customLimit);
  }

  // POST /api/admin/rate-limit/block
  @Post('rate-limit/block')
  blockAccount(@Body() body: { instagram_account_id: string }) {
    return this.adminService.blockAccount(body.instagram_account_id);
  }

  // DELETE /api/admin/rate-limit/block/:id
  @Delete('rate-limit/block/:id')
  unblockAccount(@Param('id') id: string) {
    return this.adminService.unblockAccount(id);
  }

  // POST /api/admin/maintenance
  @Post('maintenance')
  setMaintenance(@Body() body: { enabled: boolean }) {
    return this.adminService.updateConfig({ maintenanceMode: body.enabled });
  }

  // GET /api/admin/ig-tokens
  @Get('ig-tokens')
  getIgTokens() {
    return this.adminService.getIgTokenStatus();
  }

  // GET /api/admin/requests?page=1&telegramId=...&igAccountId=...
  @Get('requests')
  getRequests(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('telegramId') telegramId?: string,
    @Query('igAccountId') igAccountId?: string,
  ) {
    return this.adminService.getRequestLogs(+page, +limit, telegramId, igAccountId);
  }

  // GET /api/admin/requests/export  — CSV yuklab olish
  @Get('requests/export')
  async exportRequests(
    @Query('telegramId') telegramId: string | undefined,
    @Query('igAccountId') igAccountId: string | undefined,
    @Res() res: Response,
  ) {
    const logs = await this.adminService.exportRequestLogs(telegramId, igAccountId);

    const header = 'id,createdAt,method,endpoint,statusCode,durationMs,telegram_id,instagram_account_id,ip\n';
    const rows = logs.map(l =>
      [
        l.id,
        l.createdAt?.toISOString() ?? '',
        l.method,
        `"${(l.endpoint || '').replace(/"/g, '""')}"`,
        l.statusCode,
        l.durationMs,
        l.telegram_id ?? '',
        l.instagram_account_id ?? '',
        l.ip ?? '',
      ].join(','),
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="requests-${Date.now()}.csv"`);
    res.send(header + rows);
  }

  // GET /api/admin/endpoints
  @Get('endpoints')
  getEndpoints() {
    return this.adminService.getEndpointStats();
  }
}
