import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';

import {
  GatewayAuthGuard,
  ReqWithRequester,
  ZodValidationPipe,
  errorResponse,
  successPaginatedResponse,
  successResponse,
} from '@server/shared';

import {
  commentCreateDTOSchema,
  commentQueryDTOSchema,
  commentUpdateDTOSchema,
} from '@workspace/schemas';
import type {
  CommentCreateDTO,
  CommentQueryDTO,
  CommentUpdateDTO,
} from '@workspace/schemas';

import { CommentService } from '../services/comment.service';

@Controller('api/comments')
@UseGuards(GatewayAuthGuard)
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  async findAll(
    @Req() req: ReqWithRequester,
    @Query(new ZodValidationPipe(commentQueryDTOSchema))
    query: CommentQueryDTO,
  ) {
    try {
      const requesterId = req.requester?.sub;
      const requesterPermissions = req.requester?.permissions;
      const pagination = await this.commentService.findAllComments(
        query,
        requesterId,
        requesterPermissions,
      );
      return successPaginatedResponse(pagination);
    } catch (error: any) {
      return errorResponse(error?.message || 'Failed to fetch comments');
    }
  }

  @Get(':id/replies')
  async getReplies(
    @Req() req: ReqWithRequester,
    @Param('id') commentId: string,
    @Query('depth') depthRaw?: string,
  ) {
    try {
      const depth = Math.max(1, Number(depthRaw ?? 2));
      const requesterId = req.requester?.sub;
      const requesterPermissions = req.requester?.permissions;
      const item = await this.commentService.getReplies(
        commentId,
        depth,
        requesterId,
        requesterPermissions,
      );
      return successResponse(item);
    } catch (error: any) {
      return errorResponse(error?.message || 'Failed to fetch replies');
    }
  }

  @Post()
  @UsePipes(new ZodValidationPipe(commentCreateDTOSchema))
  async create(@Req() req: ReqWithRequester, @Body() dto: CommentCreateDTO) {
    try {
      const requesterId = req.requester?.sub;
      const requesterPermissions = req.requester?.permissions;
      if (!requesterId) throw new ForbiddenException('Unauthorized');
      const item = await this.commentService.createComment(
        dto,
        requesterId,
        requesterPermissions,
      );
      return successResponse(item);
    } catch (error: any) {
      return errorResponse(error?.message || 'Failed to create comment');
    }
  }

  @Patch(':id')
  async update(
    @Req() req: ReqWithRequester,
    @Param('id') commentId: string,
    @Body(new ZodValidationPipe(commentUpdateDTOSchema)) dto: CommentUpdateDTO,
  ) {
    try {
      const requesterId = req.requester?.sub;
      if (!requesterId) throw new ForbiddenException('Unauthorized');
      const item = await this.commentService.updateComment(
        commentId,
        dto,
        requesterId,
      );
      return successResponse(item);
    } catch (error: any) {
      return errorResponse(error?.message || 'Failed to update comment');
    }
  }

  @Delete(':id')
  async delete(@Req() req: ReqWithRequester, @Param('id') commentId: string) {
    try {
      const requesterId = req.requester?.sub;
      if (!requesterId) throw new ForbiddenException('Unauthorized');
      await this.commentService.deleteComment(commentId, requesterId);
      return successResponse(null, 'Comment deleted successfully');
    } catch (error: any) {
      return errorResponse(error?.message || 'Failed to delete comment');
    }
  }

  @Post(':id/like')
  async toggleLike(
    @Req() req: ReqWithRequester,
    @Param('id') commentId: string,
  ) {
    try {
      const requesterId = req.requester?.sub;
      if (!requesterId) throw new ForbiddenException('Unauthorized');
      const result = await this.commentService.toggleLike(
        commentId,
        requesterId,
      );
      return successResponse(result);
    } catch (error: any) {
      return errorResponse(error?.message || 'Failed to toggle like');
    }
  }
}
