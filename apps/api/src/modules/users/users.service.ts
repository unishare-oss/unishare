import { Injectable, NotFoundException } from '@nestjs/common'
import { UsersRepository } from './users.repository'
import { UpdateProfileDto } from './dto/update-profile.dto'

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findById(id: string) {
    const user = await this.usersRepository.findById(id)
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  updateProfile(id: string, dto: UpdateProfileDto) {
    return this.usersRepository.updateProfile(id, dto)
  }
}
