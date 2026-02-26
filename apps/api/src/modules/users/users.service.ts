import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { UsersRepository } from './users.repository'
import { UpdateProfileDto } from './dto/update-profile.dto'

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly config: ConfigService,
  ) {}

  async findById(id: string) {
    const user = await this.usersRepository.findById(id)
    if (!user) throw new NotFoundException('User not found')
    return this.toProfileView(user)
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const user = await this.usersRepository.updateProfile(id, dto)
    return this.toProfileView(user)
  }

  private toProfileView(user: { enrollmentYear: number | null; [key: string]: unknown }) {
    if (user.enrollmentYear === null) return { ...user, yearLevel: null }

    const academicStartMonth = this.config.get<number>('ACADEMIC_START_MONTH', 9)
    const now = new Date()
    const currentAcademicYear =
      now.getMonth() + 1 >= academicStartMonth ? now.getFullYear() : now.getFullYear() - 1
    const yearLevel = Math.max(1, currentAcademicYear - user.enrollmentYear + 1)

    return { ...user, yearLevel }
  }
}
