import { ApiProperty } from '@nestjs/swagger'

export const AI_INDEX_STATES = ['unsupported', 'preparing', 'ready', 'failed'] as const

export type AiIndexState = (typeof AI_INDEX_STATES)[number]

export class AiIndexStatusDto {
  @ApiProperty({
    enum: AI_INDEX_STATES,
    enumName: 'AiIndexState',
    description:
      "'unsupported' — nothing on this post can be indexed. 'preparing' — at least one supported " +
      "file is still pending or processing. 'ready' — indexing has settled and at least one " +
      "supported file was indexed. 'failed' — indexing has settled and none succeeded.",
  })
  state: AiIndexState

  @ApiProperty({
    description:
      'Live count of post_chunk rows for this post. Deliberately not a percentage: the total ' +
      'chunk count is unknowable until chunking finishes, so any ratio would be invented.',
  })
  indexedChunks: number

  @ApiProperty({ description: 'Files on this post whose mime type can be indexed' })
  supportedFiles: number

  @ApiProperty({ description: 'Supported files that finished indexing successfully' })
  readyFiles: number
}
