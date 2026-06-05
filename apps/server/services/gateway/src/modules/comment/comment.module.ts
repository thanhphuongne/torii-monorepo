import { Module } from '@nestjs/common';
import { NatsClientModule } from '@server/shared';
import { CommentController } from './controllers/comment.controller';
import { CommentService } from './services/comment.service';

@Module({
  imports: [NatsClientModule],
  controllers: [CommentController],
  providers: [CommentService],
})
export class CommentModule {}
