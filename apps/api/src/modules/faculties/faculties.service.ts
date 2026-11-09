import { Injectable, NotFoundException } from '@nestjs/common'
import { FacultiesRepository } from './faculties.repository'

@Injectable()
export class FacultiesService {
  constructor(private readonly facultiesRepository: FacultiesRepository) {}

  findAll(universityId?: string) {
    return this.facultiesRepository.findAll(universityId)
  }

  async findById(id: string) {
    const faculty = await this.facultiesRepository.findById(id)
    if (!faculty) throw new NotFoundException('Faculty not found')
    return faculty
  }
}
