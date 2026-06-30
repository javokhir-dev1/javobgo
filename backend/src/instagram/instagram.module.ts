import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InstagramService } from './instagram.service';
import { InstagramController } from './instagram.controller';
import { InstagramOAuthController } from './instagram-oauth.controller';
import { InstagramAccountsModule } from '../instagram-accounts/instagram-accounts.module';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [ConfigModule, InstagramAccountsModule, AuthModule],
  providers: [InstagramService],
  controllers: [InstagramController, InstagramOAuthController],
  exports: [InstagramService],
})
export class InstagramModule {}
