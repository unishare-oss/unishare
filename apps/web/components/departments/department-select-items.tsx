'use client'

import { SelectGroup, SelectItem, SelectLabel } from '@/components/ui/select'
import { groupByFaculty } from '@/hooks/use-my-departments'
import type { DepartmentEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

/** Department options inside an existing `SelectContent`, one labelled group per faculty. */
export function DepartmentSelectItems({
  departments,
}: {
  departments: Pick<DepartmentEntity, 'id' | 'name' | 'faculty'>[]
}) {
  return groupByFaculty(departments).map(({ faculty, departments }) => (
    <SelectGroup key={faculty.id}>
      <SelectLabel>{faculty.name}</SelectLabel>
      {departments.map((d) => (
        <SelectItem key={d.id} value={d.id}>
          <span className="truncate block">{d.name}</span>
        </SelectItem>
      ))}
    </SelectGroup>
  ))
}
