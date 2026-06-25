import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CookieAuthGuard } from '../auth/cookie-auth.guard';

@UseGuards(CookieAuthGuard)
@Controller('api/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async get() {
    const settings = await this.settingsService.get();
    return { success: true, settings };
  }

  @Patch()
  async update(@Body() dto: UpdateSettingsDto) {
    const settings = await this.settingsService.update(dto);
    return { success: true, settings };
  }
}
