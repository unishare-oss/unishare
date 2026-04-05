import { Injectable } from '@nestjs/common'
import { UniversitiesRepository } from './universities.repository'

@Injectable()
export class UniversitiesService {
  constructor(private readonly universitiesRepository: UniversitiesRepository) {}

  findAll() {
    return this.universitiesRepository.findAll()
  }

  findById(id: string) {
    return this.universitiesRepository.findById(id)
  }
}
