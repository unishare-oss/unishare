import { Module } from '@nestjs/common'
import { ReportsService } from './reports.service'
import { ReportsController, AdminReportsController } from './reports.controller'

@Module({
  controllers: [ReportsController, AdminReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
