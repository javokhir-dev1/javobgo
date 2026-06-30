import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstagramAccount } from './instagram-account.entity';
import { InstagramAccountsService } from './instagram-accounts.service';
import { InstagramAccountsController } from './instagram-accounts.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([InstagramAccount]), AuthModule],
  providers: [InstagramAccountsService],
  controllers: [InstagramAccountsController],
  exports: [InstagramAccountsService],
})
export class InstagramAccountsModule {}
