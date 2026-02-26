import { Injectable, NotFoundException } from '@nestjs/common'
import { UsersRepository } from './users.repository'
import { UpdateProfileDto } from './dto/update-profile.dto'

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findById(id: string) {
    const user = await this.usersRepository.findById(id)
    if (!user) throw new NotFoundException('User not found')
    return this.toProfileView(user)
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const user = await this.usersRepository.updateProfile(id, dto)
    return this.toProfileView(user)
  }

  private toProfileView(user: { startYear: number | null; [key: string]: unknown }) {
    const currentYear = new Date().getFullYear()
    const yearLevel = user.startYear === null ? null : Math.max(1, currentYear - user.startYear + 1)

    return { ...user, yearLevel }
  }
}
