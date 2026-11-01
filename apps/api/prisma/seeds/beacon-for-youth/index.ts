// The four GED test subjects; they have no official course codes or year levels.
const gedCourses: { code: string; name: string; yearLevel?: number }[] = [
  { code: 'GED-RLA', name: 'Reasoning Through Language Arts' },
  { code: 'GED-MATH', name: 'Mathematical Reasoning' },
  { code: 'GED-SCI', name: 'Science' },
  { code: 'GED-SS', name: 'Social Studies' },
]

// An online school that only teaches the GED, so one faculty with one department.
export const beaconForYouth = {
  university: {
    name: 'Beacon for Youth',
    shortName: 'Beacon',
    logoUrl: null,
    // the uniauth organization slug, the same in every environment
    slug: 'beacon-for-youth',
  },
  faculties: [{ name: 'GED Program', departments: [{ name: 'GED', courses: gedCourses }] }],
}
