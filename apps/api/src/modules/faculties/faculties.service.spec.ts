import { Test } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { FacultiesService } from './faculties.service'
import { FacultiesRepository } from './faculties.repository'

describe('FacultiesService', () => {
  let service: FacultiesService
  let repo: { findAll: jest.Mock; findById: jest.Mock }

  beforeEach(async () => {
    repo = { findAll: jest.fn(), findById: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [FacultiesService, { provide: FacultiesRepository, useValue: repo }],
    }).compile()

    service = module.get(FacultiesService)
  })

  it("lists one university's faculties", async () => {
    const rows = [{ id: 'f1', name: 'School of IT', universityId: 'u1' }]
    repo.findAll.mockResolvedValue(rows)

    await expect(service.findAll('u1')).resolves.toEqual(rows)
    expect(repo.findAll).toHaveBeenCalledWith('u1')
  })

  it('lists every faculty when no university is given', async () => {
    repo.findAll.mockResolvedValue([])
    await service.findAll()
    expect(repo.findAll).toHaveBeenCalledWith(undefined)
  })

  it('404s on an unknown faculty', async () => {
    repo.findById.mockResolvedValue(null)
    await expect(service.findById('nope')).rejects.toThrow(NotFoundException)
  })
})
