export const defaultPassword = 'Password@123';

export const seedUsers = [
  {
    username: 'sumit1',
    email: 'sumit.admin1@rps.local',
    password: defaultPassword,
    displayName: 'Sumit',
    role: 'admin',
    department: 'Administration',
    status: 'active'
  },
  {
    username: 'sumit2',
    email: 'sumit.admin2@rps.local',
    password: defaultPassword,
    displayName: 'Sumit',
    role: 'admin',
    department: 'Administration',
    status: 'active'
  },
  {
    username: 'exam',
    email: 'exam@rps.local',
    password: defaultPassword,
    displayName: 'Examination Department',
    role: 'exam_department',
    department: 'Examination',
    status: 'active'
  },
  {
    username: 'faculty',
    email: 'faculty@rps.local',
    password: defaultPassword,
    displayName: 'Priya Sharma',
    role: 'faculty',
    department: 'Computer Science',
    employeeId: 'FAC-CS-001',
    status: 'active'
  },
  {
    username: 'student',
    email: 'student@rps.local',
    password: defaultPassword,
    displayName: 'Aarav Mehta',
    role: 'student',
    department: 'Computer Science',
    enrollmentNumber: 'RPS2026001',
    semester: 1,
    status: 'active'
  },
  {
    username: 'student2',
    email: 'student.neha@rps.local',
    password: defaultPassword,
    displayName: 'Neha Singh',
    role: 'student',
    department: 'Computer Science',
    enrollmentNumber: 'RPS2026002',
    semester: 1,
    status: 'active'
  },
  {
    username: 'student3',
    email: 'student.rohan@rps.local',
    password: defaultPassword,
    displayName: 'Rohan Verma',
    role: 'student',
    department: 'Computer Science',
    enrollmentNumber: 'RPS2026003',
    semester: 1,
    status: 'active'
  },
  {
    username: 'student4',
    email: 'student.sana@rps.local',
    password: defaultPassword,
    displayName: 'Sana Khan',
    role: 'student',
    department: 'Computer Science',
    enrollmentNumber: 'RPS2026004',
    semester: 2,
    status: 'active'
  },
  {
    username: 'student5',
    email: 'student.vikram@rps.local',
    password: defaultPassword,
    displayName: 'Vikram Rao',
    role: 'student',
    department: 'Computer Science',
    enrollmentNumber: 'RPS2026005',
    semester: 2,
    status: 'active'
  }
];

export const seedRoles = [
  { id: 'admin', label: 'Admin', permissions: ['manage_users', 'manage_subjects', 'process_results'] },
  {
    id: 'exam_department',
    label: 'Examination Department',
    permissions: ['enter_marks', 'verify_marks', 'generate_results']
  },
  { id: 'faculty', label: 'Faculty', permissions: ['enter_marks', 'view_subjects'] },
  { id: 'student', label: 'Student', permissions: ['view_result', 'download_marksheet'] }
];

export const seedPrograms = [
  {
    code: 'BTCS',
    name: 'B.Tech Computer Science',
    durationSemesters: 8,
    department: 'Computer Science',
    status: 'active'
  }
];

export const seedAcademicYears = [
  {
    code: 'AY2026',
    name: 'Academic Year 2026-27',
    active: true,
    semesters: [1, 2]
  }
];

export const seedSubjects = [
  {
    code: 'CS101',
    name: 'Programming Fundamentals',
    program: 'B.Tech Computer Science',
    semester: 1,
    credits: 4,
    type: 'theory',
    maxInternalMarks: 30,
    maxExternalMarks: 70,
    passingMarks: 40
  },
  {
    code: 'CS102',
    name: 'Computer Organization',
    program: 'B.Tech Computer Science',
    semester: 1,
    credits: 4,
    type: 'theory',
    maxInternalMarks: 30,
    maxExternalMarks: 70,
    passingMarks: 40
  },
  {
    code: 'MA101',
    name: 'Engineering Mathematics I',
    program: 'B.Tech Computer Science',
    semester: 1,
    credits: 4,
    type: 'theory',
    maxInternalMarks: 30,
    maxExternalMarks: 70,
    passingMarks: 40
  },
  {
    code: 'CS151',
    name: 'Programming Lab',
    program: 'B.Tech Computer Science',
    semester: 1,
    credits: 2,
    type: 'practical',
    maxInternalMarks: 50,
    maxExternalMarks: 50,
    passingMarks: 40
  },
  {
    code: 'CS201',
    name: 'Data Structures',
    program: 'B.Tech Computer Science',
    semester: 2,
    credits: 4,
    type: 'theory',
    maxInternalMarks: 30,
    maxExternalMarks: 70,
    passingMarks: 40
  },
  {
    code: 'CS202',
    name: 'Database Management Systems',
    program: 'B.Tech Computer Science',
    semester: 2,
    credits: 4,
    type: 'theory',
    maxInternalMarks: 30,
    maxExternalMarks: 70,
    passingMarks: 40
  },
  {
    code: 'CS203',
    name: 'Operating Systems',
    program: 'B.Tech Computer Science',
    semester: 2,
    credits: 4,
    type: 'theory',
    maxInternalMarks: 30,
    maxExternalMarks: 70,
    passingMarks: 40
  },
  {
    code: 'CS251',
    name: 'Database Lab',
    program: 'B.Tech Computer Science',
    semester: 2,
    credits: 2,
    type: 'practical',
    maxInternalMarks: 50,
    maxExternalMarks: 50,
    passingMarks: 40
  }
];

export const seedResultRecords = [
  {
    id: 'RPS2026001-S1',
    enrollmentNumber: 'RPS2026001',
    studentUsername: 'student',
    studentName: 'Aarav Mehta',
    semester: 1,
    academicYear: 'AY2026',
    status: 'draft',
    marks: [
      { subjectCode: 'CS101', internal: 24, external: 58, total: 82, grade: 'A' },
      { subjectCode: 'CS102', internal: 22, external: 53, total: 75, grade: 'B+' },
      { subjectCode: 'MA101', internal: 25, external: 60, total: 85, grade: 'A' },
      { subjectCode: 'CS151', internal: 43, external: 42, total: 85, grade: 'A' }
    ]
  },
  {
    id: 'RPS2026002-S1',
    enrollmentNumber: 'RPS2026002',
    studentUsername: 'student2',
    studentName: 'Neha Singh',
    semester: 1,
    academicYear: 'AY2026',
    status: 'draft',
    marks: [
      { subjectCode: 'CS101', internal: 21, external: 49, total: 70, grade: 'B+' },
      { subjectCode: 'CS102', internal: 25, external: 57, total: 82, grade: 'A' },
      { subjectCode: 'MA101', internal: 19, external: 46, total: 65, grade: 'B' },
      { subjectCode: 'CS151', internal: 40, external: 41, total: 81, grade: 'A' }
    ]
  },
  {
    id: 'RPS2026003-S1',
    enrollmentNumber: 'RPS2026003',
    studentUsername: 'student3',
    studentName: 'Rohan Verma',
    semester: 1,
    academicYear: 'AY2026',
    status: 'published',
    marks: [
      { subjectCode: 'CS101', internal: 18, external: 44, total: 62, grade: 'B' },
      { subjectCode: 'CS102', internal: 20, external: 47, total: 67, grade: 'B' },
      { subjectCode: 'MA101', internal: 17, external: 41, total: 58, grade: 'C' },
      { subjectCode: 'CS151', internal: 38, external: 39, total: 77, grade: 'B+' }
    ]
  },
  {
    id: 'RPS2026004-S2',
    enrollmentNumber: 'RPS2026004',
    studentUsername: 'student4',
    studentName: 'Sana Khan',
    semester: 2,
    academicYear: 'AY2026',
    status: 'published',
    marks: [
      { subjectCode: 'CS201', internal: 26, external: 61, total: 87, grade: 'A' },
      { subjectCode: 'CS202', internal: 24, external: 59, total: 83, grade: 'A' },
      { subjectCode: 'CS203', internal: 23, external: 56, total: 79, grade: 'B+' },
      { subjectCode: 'CS251', internal: 45, external: 44, total: 89, grade: 'A' }
    ]
  },
  {
    id: 'RPS2026005-S2',
    enrollmentNumber: 'RPS2026005',
    studentUsername: 'student5',
    studentName: 'Vikram Rao',
    semester: 2,
    academicYear: 'AY2026',
    status: 'draft',
    marks: [
      { subjectCode: 'CS201', internal: 19, external: 43, total: 62, grade: 'B' },
      { subjectCode: 'CS202', internal: 18, external: 39, total: 57, grade: 'C' },
      { subjectCode: 'CS203', internal: 21, external: 45, total: 66, grade: 'B' },
      { subjectCode: 'CS251', internal: 36, external: 37, total: 73, grade: 'B+' }
    ]
  },
  {
    id: 'RPS2026001-S2',
    enrollmentNumber: 'RPS2026001',
    studentUsername: 'student',
    studentName: 'Aarav Mehta',
    semester: 2,
    academicYear: 'AY2026',
    status: 'published',
    marks: [
      { subjectCode: 'CS201', internal: 25, external: 60, total: 85, grade: 'A' },
      { subjectCode: 'CS202', internal: 23, external: 54, total: 77, grade: 'B+' },
      { subjectCode: 'CS203', internal: 22, external: 52, total: 74, grade: 'B+' },
      { subjectCode: 'CS251', internal: 44, external: 43, total: 87, grade: 'A' }
    ]
  },
  {
    id: 'RPS2026002-S2',
    enrollmentNumber: 'RPS2026002',
    studentUsername: 'student2',
    studentName: 'Neha Singh',
    semester: 2,
    academicYear: 'AY2026',
    status: 'published',
    marks: [
      { subjectCode: 'CS201', internal: 24, external: 56, total: 80, grade: 'A' },
      { subjectCode: 'CS202', internal: 21, external: 50, total: 71, grade: 'B+' },
      { subjectCode: 'CS203', internal: 22, external: 49, total: 71, grade: 'B+' },
      { subjectCode: 'CS251', internal: 42, external: 40, total: 82, grade: 'A' }
    ]
  }
];
