import { PartialType } from '@nestjs/swagger'
import { CreateReadingListDto } from './create-reading-list.dto'

export class UpdateReadingListDto extends PartialType(CreateReadingListDto) {}
