import { ApiProperty } from '@nestjs/swagger'
import { ExamEntity } from './exam.entity'
import { EXAM_BULK_SKIP_REASONS, type ExamBulkSkipReason } from '../exams.types'

export class ExamImportCourseCandidateEntity {
  @ApiProperty() id: string
  @ApiProperty() code: string
  @ApiProperty() name: string
  @ApiProperty() departmentName: string
}

export class ExamImportExistingExamEntity {
  @ApiProperty() id: string
  @ApiProperty() title: string
  @ApiProperty() startsAt: string
  @ApiProperty({ type: String, nullable: true }) endsAt: string | null
  @ApiProperty({ type: String, nullable: true }) examRoom: string | null
}

export class ExamImportRowEntity {
  @ApiProperty() courseCode: string
  @ApiProperty({ type: String, nullable: true }) courseId: string | null
  @ApiProperty({ type: String, nullable: true }) courseName: string | null
  @ApiProperty() date: string
  @ApiProperty() startsAt: string
  @ApiProperty({ type: String, nullable: true }) endsAt: string | null
  @ApiProperty() title: string
  @ApiProperty({ type: String, nullable: true }) examRoom: string | null
  @ApiProperty({ type: [ExamImportCourseCandidateEntity] })
  candidates: ExamImportCourseCandidateEntity[]
  @ApiProperty({ type: [ExamImportExistingExamEntity] })
  existingExams: ExamImportExistingExamEntity[]
  @ApiProperty({ enum: ['matched', 'ambiguous', 'unmatched'] }) matchStatus: string
}

export class ExamImportEntity {
  @ApiProperty({ type: [ExamImportRowEntity] })
  rows: ExamImportRowEntity[]
  @ApiProperty({ description: 'Rows the AI returned that were invalid and dropped' })
  droppedCount: number
  @ApiProperty({ description: 'Chunks of the file the AI could not read' })
  unreadableChunkCount: number
}

export class ExamBulkSkippedEntity {
  @ApiProperty() index: number
  @ApiProperty({ enum: EXAM_BULK_SKIP_REASONS }) reason: ExamBulkSkipReason
}

export class ExamBulkCreateEntity {
  @ApiProperty({ type: [ExamEntity] }) created: ExamEntity[]
  @ApiProperty({ type: [ExamBulkSkippedEntity] }) skipped: ExamBulkSkippedEntity[]
}
