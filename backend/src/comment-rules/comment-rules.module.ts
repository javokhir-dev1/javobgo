import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentRule } from './entities/comment-rule.entity';
import { CommentRulesService } from './comment-rules.service';
import { CommentRulesController } from './comment-rules.controller';
import { AuthModule } from '../auth/auth.module';
import { InstagramAccountsModule } from '../instagram-accounts/instagram-accounts.module';

@Module({
  imports: [TypeOrmModule.forFeature([CommentRule]), AuthModule, InstagramAccountsModule],
  controllers: [CommentRulesController],
  providers: [CommentRulesService],
  exports: [CommentRulesService],
})
export class CommentRulesModule {}
