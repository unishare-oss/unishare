import { Injectable, NotFoundException } from '@nestjs/common'
import { UniversitiesRepository } from './universities.repository'

@Injectable()
export class UniversitiesService {
  constructor(private readonly universitiesRepository: UniversitiesRepository) {}

  findAll() {
    return this.universitiesRepository.findAll()
  }

  async findById(id: string) {
    const university = await this.universitiesRepository.findById(id)
    if (!university) throw new NotFoundException('University not found')
    return university
  }
}
