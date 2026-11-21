import { ApiProperty } from '@nestjs/swagger'

export class ExamImportCourseCandidateEntity {
  @ApiProperty() id: string
  @ApiProperty() code: string
  @ApiProperty() name: string
  @ApiProperty() departmentName: string
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
  @ApiProperty({ enum: ['matched', 'ambiguous', 'unmatched'] }) matchStatus: string
}

export class ExamImportEntity {
  @ApiProperty({ type: [ExamImportRowEntity] })
  rows: ExamImportRowEntity[]
}
