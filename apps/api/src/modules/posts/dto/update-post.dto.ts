import { OmitType, PartialType } from '@nestjs/swagger'
import { CreatePostDto } from './create-post.dto'

export class UpdatePostDto extends PartialType(
  OmitType(CreatePostDto, ['type', 'courseId'] as const),
) {}
