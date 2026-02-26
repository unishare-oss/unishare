export type PostType = 'NOTE' | 'PAST EXAM'
export type PostStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface User {
  id: string
  name: string
  email: string
  avatar: string
  role: 'STUDENT' | 'MODERATOR' | 'ADMIN'
  department: string
  enrollmentYear: number
  yearLevel: number
}

export interface Department {
  id: string
  name: string
  courseCount: number
}

export interface Course {
  id: string
  code: string
  name: string
  departmentId: string
  postCount: number
}

export interface PostFile {
  id: string
  name: string
  size: string
  type: 'PDF' | 'DOCX' | 'PPTX' | 'PNG'
}

export interface Comment {
  id: string
  author: User
  content: string
  createdAt: string
  deleted: boolean
}

export interface Post {
  id: string
  type: PostType
  status: PostStatus
  title: string
  description: string
  courseCode: string
  courseName: string
  department: string
  author: User
  yearLevel: number
  semester: number
  module?: number
  examYear?: number
  files: PostFile[]
  comments: Comment[]
  commentCount: number
  fileCount: number
  savedByUser: boolean
  createdAt: string
  externalUrl?: string
}

export const currentUser: User = {
  id: 'u1',
  name: 'Sarah Chen',
  email: 'sarah.chen@university.edu',
  avatar: '',
  role: 'STUDENT',
  department: 'Computer Science',
  enrollmentYear: 2023,
  yearLevel: 3,
}

export const departments: Department[] = [
  { id: 'd1', name: 'Computer Science', courseCount: 24 },
  { id: 'd2', name: 'Mathematics', courseCount: 18 },
  { id: 'd3', name: 'Physics', courseCount: 14 },
  { id: 'd4', name: 'Biology', courseCount: 16 },
  { id: 'd5', name: 'Economics', courseCount: 12 },
  { id: 'd6', name: 'English Literature', courseCount: 10 },
  { id: 'd7', name: 'Chemistry', courseCount: 15 },
  { id: 'd8', name: 'Psychology', courseCount: 11 },
]

export const courses: Course[] = [
  { id: 'c1', code: 'CS101', name: 'Intro to Programming', departmentId: 'd1', postCount: 45 },
  { id: 'c2', code: 'CS201', name: 'Data Structures', departmentId: 'd1', postCount: 38 },
  { id: 'c3', code: 'CS301', name: 'Algorithms', departmentId: 'd1', postCount: 29 },
  { id: 'c4', code: 'CS401', name: 'Machine Learning', departmentId: 'd1', postCount: 22 },
  { id: 'c5', code: 'MATH101', name: 'Calculus I', departmentId: 'd2', postCount: 31 },
  { id: 'c6', code: 'MATH201', name: 'Linear Algebra', departmentId: 'd2', postCount: 27 },
  { id: 'c7', code: 'PHY101', name: 'Classical Mechanics', departmentId: 'd3', postCount: 19 },
  { id: 'c8', code: 'BIO101', name: 'Cell Biology', departmentId: 'd4', postCount: 24 },
  { id: 'c9', code: 'ECON101', name: 'Microeconomics', departmentId: 'd5', postCount: 17 },
  { id: 'c10', code: 'ENG201', name: 'Shakespeare Studies', departmentId: 'd6', postCount: 8 },
]

const users: User[] = [
  currentUser,
  {
    id: 'u2',
    name: 'James Okafor',
    email: 'james.o@university.edu',
    avatar: '',
    role: 'STUDENT',
    department: 'Computer Science',
    enrollmentYear: 2022,
    yearLevel: 4,
  },
  {
    id: 'u3',
    name: 'Mina Park',
    email: 'mina.p@university.edu',
    avatar: '',
    role: 'STUDENT',
    department: 'Mathematics',
    enrollmentYear: 2024,
    yearLevel: 2,
  },
  {
    id: 'u4',
    name: 'David Ruiz',
    email: 'david.r@university.edu',
    avatar: '',
    role: 'MODERATOR',
    department: 'Computer Science',
    enrollmentYear: 2021,
    yearLevel: 5,
  },
  {
    id: 'u5',
    name: 'Aisha Mohammed',
    email: 'aisha.m@university.edu',
    avatar: '',
    role: 'STUDENT',
    department: 'Physics',
    enrollmentYear: 2023,
    yearLevel: 3,
  },
  {
    id: 'u6',
    name: "Liam O'Brien",
    email: 'liam.ob@university.edu',
    avatar: '',
    role: 'STUDENT',
    department: 'Economics',
    enrollmentYear: 2024,
    yearLevel: 2,
  },
]

export const posts: Post[] = [
  {
    id: 'p1',
    type: 'NOTE',
    status: 'APPROVED',
    title: 'Complete Lecture Notes: Intro to Algorithms and Big-O Notation',
    description:
      'Comprehensive notes covering all lectures from weeks 1-6. Includes detailed explanations of time complexity analysis, Big-O, Big-Theta, and Big-Omega notation with worked examples. Also covers basic sorting algorithms and their complexity analysis.',
    courseCode: 'CS101',
    courseName: 'Intro to Programming',
    department: 'Computer Science',
    author: users[1],
    yearLevel: 2,
    semester: 1,
    module: 4,
    files: [
      { id: 'f1', name: 'CS101_Algorithms_Notes.pdf', size: '2.4 MB', type: 'PDF' },
      { id: 'f2', name: 'Big-O_Cheatsheet.pdf', size: '340 KB', type: 'PDF' },
      { id: 'f3', name: 'Lecture_Slides_W1-W6.pptx', size: '8.1 MB', type: 'PPTX' },
    ],
    comments: [
      {
        id: 'cm1',
        author: users[0],
        content: 'These are incredibly thorough. The Big-O cheatsheet alone is worth bookmarking.',
        createdAt: '1h ago',
        deleted: false,
      },
      {
        id: 'cm2',
        author: users[2],
        content: 'Saved me during midterms. The worked examples really help.',
        createdAt: '3h ago',
        deleted: false,
      },
      {
        id: 'cm3',
        author: users[4],
        content: 'Would love similar notes for the second half of the course!',
        createdAt: '5h ago',
        deleted: false,
      },
    ],
    commentCount: 12,
    fileCount: 3,
    savedByUser: false,
    createdAt: '2h ago',
  },
  {
    id: 'p2',
    type: 'PAST EXAM',
    status: 'APPROVED',
    title: '2024 Final Exam — Data Structures with Solutions',
    description:
      'Full 2024 final examination paper with detailed step-by-step solutions for all questions. Covers binary trees, hash tables, graph algorithms, and dynamic programming.',
    courseCode: 'CS201',
    courseName: 'Data Structures',
    department: 'Computer Science',
    author: users[3],
    yearLevel: 3,
    semester: 2,
    examYear: 2024,
    files: [
      { id: 'f4', name: 'CS201_2024_Final.pdf', size: '1.8 MB', type: 'PDF' },
      { id: 'f5', name: 'CS201_2024_Solutions.pdf', size: '3.2 MB', type: 'PDF' },
    ],
    comments: [],
    commentCount: 8,
    fileCount: 2,
    savedByUser: true,
    createdAt: '5h ago',
  },
  {
    id: 'p3',
    type: 'NOTE',
    status: 'APPROVED',
    title: 'Linear Algebra Study Guide — Eigenvalues & Eigenvectors',
    description:
      'A focused study guide on eigenvalues, eigenvectors, diagonalization, and their applications. Includes practice problems with solutions from past tutorials.',
    courseCode: 'MATH201',
    courseName: 'Linear Algebra',
    department: 'Mathematics',
    author: users[2],
    yearLevel: 2,
    semester: 1,
    module: 7,
    files: [{ id: 'f6', name: 'LinAlg_Eigen_Guide.pdf', size: '1.1 MB', type: 'PDF' }],
    comments: [],
    commentCount: 5,
    fileCount: 1,
    savedByUser: false,
    createdAt: '1d ago',
  },
  {
    id: 'p4',
    type: 'PAST EXAM',
    status: 'APPROVED',
    title: '2023 Midterm — Classical Mechanics (with Marking Scheme)',
    description:
      "The 2023 midterm paper for PHY101 with the official marking scheme. Focus on Newton's laws, energy conservation, and rotational dynamics.",
    courseCode: 'PHY101',
    courseName: 'Classical Mechanics',
    department: 'Physics',
    author: users[4],
    yearLevel: 2,
    semester: 1,
    examYear: 2023,
    files: [
      { id: 'f7', name: 'PHY101_Midterm_2023.pdf', size: '950 KB', type: 'PDF' },
      { id: 'f8', name: 'Marking_Scheme.docx', size: '420 KB', type: 'DOCX' },
    ],
    comments: [],
    commentCount: 3,
    fileCount: 2,
    savedByUser: false,
    createdAt: '2d ago',
  },
  {
    id: 'p5',
    type: 'NOTE',
    status: 'PENDING',
    title: 'Microeconomics: Supply & Demand Comprehensive Summary',
    description:
      'Detailed summary covering chapters 1-8 on supply and demand, market equilibrium, elasticity, and consumer/producer surplus with diagrams.',
    courseCode: 'ECON101',
    courseName: 'Microeconomics',
    department: 'Economics',
    author: users[5],
    yearLevel: 1,
    semester: 2,
    module: 3,
    files: [{ id: 'f9', name: 'ECON101_Supply_Demand.pdf', size: '2.8 MB', type: 'PDF' }],
    comments: [],
    commentCount: 0,
    fileCount: 1,
    savedByUser: false,
    createdAt: '30m ago',
  },
  {
    id: 'p6',
    type: 'NOTE',
    status: 'APPROVED',
    title: 'Machine Learning: Neural Networks from Scratch',
    description:
      'Hand-written notes converted to PDF covering the mathematics behind neural networks, backpropagation, gradient descent, and activation functions.',
    courseCode: 'CS401',
    courseName: 'Machine Learning',
    department: 'Computer Science',
    author: users[0],
    yearLevel: 3,
    semester: 2,
    module: 5,
    files: [
      { id: 'f10', name: 'ML_Neural_Nets.pdf', size: '4.5 MB', type: 'PDF' },
      { id: 'f11', name: 'Code_Examples.pdf', size: '1.2 MB', type: 'PDF' },
    ],
    comments: [],
    commentCount: 15,
    fileCount: 2,
    savedByUser: false,
    createdAt: '3d ago',
  },
  {
    id: 'p7',
    type: 'PAST EXAM',
    status: 'PENDING',
    title: '2024 Calculus I Final — All Sections',
    description:
      'Complete final exam from 2024 covering limits, derivatives, integrals, and series. No solutions yet — looking for collaborators.',
    courseCode: 'MATH101',
    courseName: 'Calculus I',
    department: 'Mathematics',
    author: users[2],
    yearLevel: 1,
    semester: 1,
    examYear: 2024,
    files: [{ id: 'f12', name: 'MATH101_Final_2024.pdf', size: '1.5 MB', type: 'PDF' }],
    comments: [],
    commentCount: 2,
    fileCount: 1,
    savedByUser: false,
    createdAt: '4h ago',
  },
  {
    id: 'p8',
    type: 'NOTE',
    status: 'REJECTED',
    title: 'Cell Biology Quick Reference Card',
    description:
      'Single-page quick reference covering cell organelles, membrane transport, and the cell cycle.',
    courseCode: 'BIO101',
    courseName: 'Cell Biology',
    department: 'Biology',
    author: users[4],
    yearLevel: 1,
    semester: 1,
    module: 2,
    files: [{ id: 'f13', name: 'BIO101_Quick_Ref.png', size: '780 KB', type: 'PNG' }],
    comments: [],
    commentCount: 1,
    fileCount: 1,
    savedByUser: false,
    createdAt: '1w ago',
  },
]
