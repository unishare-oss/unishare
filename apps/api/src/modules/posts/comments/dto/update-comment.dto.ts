import { OmitType, PartialType } from '@nestjs/swagger'
import { CreateCommentDto } from './create-comment.dto'

export class UpdateCommentDto extends PartialType(
  OmitType(CreateCommentDto, ['mentions', 'parentId']),
) {}
