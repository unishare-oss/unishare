import { Test } from '@nestjs/testing'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { DepartmentsService } from './departments.service'
import { DepartmentsRepository } from './departments.repository'
import { FacultiesService } from '../faculties/faculties.service'

describe('DepartmentsService', () => {
  let service: DepartmentsService
  let repo: {
    create: jest.Mock
    findAll: jest.Mock
    findByFacultyAndName: jest.Mock
    findById: jest.Mock
    update: jest.Mock
  }
  let faculties: { findById: jest.Mock }

  beforeEach(async () => {
    repo = {
      create: jest.fn((dto) => Promise.resolve({ id: 'new', ...dto })),
      findAll: jest.fn(),
      findByFacultyAndName: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
      update: jest.fn((id, dto) => Promise.resolve({ id, ...dto })),
    }
    faculties = {
      findById: jest.fn((id: string) => Promise.resolve({ id, name: 'F', universityId: 'u1' })),
    }

    const module = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        { provide: DepartmentsRepository, useValue: repo },
        { provide: FacultiesService, useValue: faculties },
      ],
    }).compile()

    service = module.get(DepartmentsService)
  })

  describe('findAll', () => {
    it('passes the university filter and maps faculty and courseCount', async () => {
      const faculty = { id: 'f1', name: 'School of IT', universityId: 'u1' }
      repo.findAll.mockResolvedValue([
        { id: 'd1', name: 'Computer Science', facultyId: 'f1', faculty, _count: { courses: 3 } },
      ])

      const result = await service.findAll('u1')

      expect(repo.findAll).toHaveBeenCalledWith('u1')
      expect(result).toEqual([
        { id: 'd1', name: 'Computer Science', facultyId: 'f1', faculty, courseCount: 3 },
      ])
    })

    it('lists every department when no university is given', async () => {
      repo.findAll.mockResolvedValue([])
      await service.findAll()
      expect(repo.findAll).toHaveBeenCalledWith(undefined)
    })
  })

  describe('create', () => {
    it('409s when a concurrent create wins the unique index', async () => {
      repo.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }))
      await expect(service.create({ name: 'CS', facultyId: 'f1' })).rejects.toThrow(
        ConflictException,
      )
    })

    it('404s when the faculty does not exist', async () => {
      faculties.findById.mockRejectedValue(new NotFoundException('Faculty not found'))
      await expect(service.create({ name: 'CS', facultyId: 'nope' })).rejects.toThrow(
        NotFoundException,
      )
      expect(repo.create).not.toHaveBeenCalled()
    })

    it('409s when the name already exists in the same faculty', async () => {
      repo.findByFacultyAndName.mockResolvedValue({ id: 'd1', name: 'CS', facultyId: 'f1' })
      await expect(service.create({ name: 'CS', facultyId: 'f1' })).rejects.toThrow(
        ConflictException,
      )
      expect(repo.findByFacultyAndName).toHaveBeenCalledWith('f1', 'CS')
      expect(repo.create).not.toHaveBeenCalled()
    })

    it('creates the same name in another faculty', async () => {
      repo.findByFacultyAndName.mockImplementation((facultyId: string) =>
        Promise.resolve(facultyId === 'f1' ? { id: 'd1', name: 'CS', facultyId: 'f1' } : null),
      )
      await expect(service.create({ name: 'CS', facultyId: 'f2' })).resolves.toMatchObject({
        name: 'CS',
        facultyId: 'f2',
      })
      expect(repo.create).toHaveBeenCalledWith({ name: 'CS', facultyId: 'f2' })
    })
  })

  describe('update', () => {
    beforeEach(() => {
      repo.findById.mockResolvedValue({
        id: 'd1',
        name: 'CS',
        facultyId: 'f1',
        faculty: { id: 'f1', name: 'F', universityId: 'u1' },
        courses: [],
      })
    })

    it('moves to another faculty of the same university', async () => {
      await service.update('d1', { facultyId: 'f2' })
      expect(repo.update).toHaveBeenCalledWith('d1', { facultyId: 'f2' })
    })

    it('400s when moving into a faculty of another university', async () => {
      faculties.findById.mockResolvedValue({ id: 'f9', name: 'F', universityId: 'u2' })
      await expect(service.update('d1', { facultyId: 'f9' })).rejects.toThrow(BadRequestException)
      expect(repo.update).not.toHaveBeenCalled()
    })

    it('409s when a concurrent rename wins the unique index', async () => {
      repo.update.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }))
      await expect(service.update('d1', { name: 'IT' })).rejects.toThrow(ConflictException)
    })

    it('409s when renaming to a name taken in the same faculty', async () => {
      repo.findByFacultyAndName.mockResolvedValue({ id: 'd2', name: 'IT', facultyId: 'f1' })
      await expect(service.update('d1', { name: 'IT' })).rejects.toThrow(ConflictException)
      expect(repo.findByFacultyAndName).toHaveBeenCalledWith('f1', 'IT')
    })

    it('409s when moving into a faculty that already has the name', async () => {
      repo.findByFacultyAndName.mockResolvedValue({ id: 'd2', name: 'CS', facultyId: 'f2' })
      await expect(service.update('d1', { facultyId: 'f2' })).rejects.toThrow(ConflictException)
      expect(repo.findByFacultyAndName).toHaveBeenCalledWith('f2', 'CS')
    })

    it('404s when moving into an unknown faculty', async () => {
      faculties.findById.mockRejectedValue(new NotFoundException('Faculty not found'))
      await expect(service.update('d1', { facultyId: 'nope' })).rejects.toThrow(NotFoundException)
      expect(repo.update).not.toHaveBeenCalled()
    })

    it('allows saving the department under its own name', async () => {
      repo.findByFacultyAndName.mockResolvedValue({ id: 'd1', name: 'CS', facultyId: 'f1' })
      await service.update('d1', { name: 'CS' })
      expect(repo.update).toHaveBeenCalledWith('d1', { name: 'CS' })
    })

    it('400s when facultyId is null', async () => {
      await expect(service.update('d1', { facultyId: null as unknown as string })).rejects.toThrow(
        BadRequestException,
      )
      expect(repo.update).not.toHaveBeenCalled()
    })
  })
})
