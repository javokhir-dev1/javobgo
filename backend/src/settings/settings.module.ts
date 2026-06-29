import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Settings } from './entities/settings.entity';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { AuthModule } from '../auth/auth.module';
import { InstagramAccountsModule } from '../instagram-accounts/instagram-accounts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Settings]),
    AuthModule,
    InstagramAccountsModule,
  ],
  providers: [SettingsService],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}
