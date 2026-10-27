import { Test } from '@nestjs/testing'
import { BadRequestException, ConflictException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '@/prisma/prisma.service'
import { FollowsService } from '../follows/follows.service'
import { ChatService } from '../chat/chat.service'
import { AuditService } from '../audit/audit.service'
import { UsersService } from './users.service'
import { UsersRepository } from './users.repository'

describe('UsersService — updateAcademicProfile', () => {
  let service: UsersService
  let repo: {
    findDepartmentById: jest.Mock
    findUniversityById: jest.Mock
    findAcademicProfileOfUser: jest.Mock
    updateAcademicProfile: jest.Mock
    updateAcademicProfileIf: jest.Mock
  }

  beforeEach(async () => {
    repo = {
      findDepartmentById: jest
        .fn()
        .mockResolvedValue({ id: 'd1', faculty: { universityId: 'u1' } }),
      findUniversityById: jest.fn((id: string) => Promise.resolve({ id })),
      findAcademicProfileOfUser: jest.fn().mockResolvedValue({ universityId: 'u1' }),
      updateAcademicProfile: jest.fn((id, dto) =>
        Promise.resolve({ id, enrollmentYear: null, ...dto }),
      ),
      updateAcademicProfileIf: jest.fn((id, _expected, dto) =>
        Promise.resolve({ id, enrollmentYear: null, ...dto }),
      ),
    }

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: repo },
        { provide: PrismaService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: FollowsService, useValue: {} },
        { provide: ChatService, useValue: {} },
        { provide: AuditService, useValue: {} },
      ],
    }).compile()

    service = module.get(UsersService)
  })

  it("saves a department from the user's own university", async () => {
    await service.updateAcademicProfile('user1', { departmentId: 'd1' })
    expect(repo.updateAcademicProfileIf).toHaveBeenCalledWith(
      'user1',
      { universityId: 'u1' },
      { departmentId: 'd1' },
    )
  })

  it('409s when the stored university changed before the department was written', async () => {
    repo.updateAcademicProfileIf.mockResolvedValue(null)
    await expect(service.updateAcademicProfile('user1', { departmentId: 'd1' })).rejects.toThrow(
      ConflictException,
    )
  })

  it('rejects a department from another university with 400', async () => {
    repo.findAcademicProfileOfUser.mockResolvedValue({ universityId: 'u2' })
    await expect(service.updateAcademicProfile('user1', { departmentId: 'd1' })).rejects.toThrow(
      BadRequestException,
    )
    expect(repo.updateAcademicProfileIf).not.toHaveBeenCalled()
  })

  it('checks against the university sent in the same request', async () => {
    await expect(
      service.updateAcademicProfile('user1', { departmentId: 'd1', universityId: 'u2' }),
    ).rejects.toThrow(BadRequestException)
    expect(repo.findAcademicProfileOfUser).not.toHaveBeenCalled()

    await service.updateAcademicProfile('user2', { departmentId: 'd1', universityId: 'u1' })
    expect(repo.updateAcademicProfile).toHaveBeenCalledTimes(1)
  })

  it('rejects a department when the university is cleared in the same request', async () => {
    await expect(
      service.updateAcademicProfile('user1', { departmentId: 'd1', universityId: null }),
    ).rejects.toThrow(BadRequestException)
  })

  it('rejects a department when the user has no university', async () => {
    repo.findAcademicProfileOfUser.mockResolvedValue({ universityId: null })
    await expect(service.updateAcademicProfile('user1', { departmentId: 'd1' })).rejects.toThrow(
      BadRequestException,
    )
  })

  it('drops the stored department when the university changes to another one', async () => {
    repo.findAcademicProfileOfUser.mockResolvedValue({
      universityId: 'u1',
      department: { faculty: { universityId: 'u1' } },
    })
    await service.updateAcademicProfile('user1', { universityId: 'u2' })
    expect(repo.updateAcademicProfile).toHaveBeenCalledWith('user1', {
      universityId: 'u2',
      departmentId: null,
    })

    await service.updateAcademicProfile('user1', { universityId: null })
    expect(repo.updateAcademicProfile).toHaveBeenLastCalledWith('user1', {
      universityId: null,
      departmentId: null,
    })
  })

  it('keeps the stored department when the university stays the same', async () => {
    repo.findAcademicProfileOfUser.mockResolvedValue({
      universityId: 'u1',
      departmentId: 'd1',
      department: { faculty: { universityId: 'u1' } },
    })
    await service.updateAcademicProfile('user1', { universityId: 'u1' })
    // Only while the department is still the one checked against the new university
    expect(repo.updateAcademicProfileIf).toHaveBeenCalledWith(
      'user1',
      { departmentId: 'd1' },
      { universityId: 'u1' },
    )
  })
})
