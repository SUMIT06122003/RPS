import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  CloudUpload,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Lock,
  LogOut,
  RefreshCcw,
  Search,
  Send,
  Shield,
  UserRound,
  Users
} from 'lucide-react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import { auth, db, firebaseReady } from './firebase';
import { uploadToCloudinary } from './cloudinary';
import { seedFirebase } from './seedFirebase';
import { defaultPassword, seedResultRecords, seedSubjects, seedUsers } from './seedData';
import './styles.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="center-screen error-panel">
          <Shield size={42} />
          <h1>Something went wrong</h1>
          <p>{this.state.error.message}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload App
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

const roleLabels = {
  admin: 'Admin',
  exam_department: 'Examination Department',
  faculty: 'Faculty',
  student: 'Student'
};

const dashboardTabs = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'results', label: 'Results', icon: FileText },
  { id: 'media', label: 'Media', icon: CloudUpload }
];

function uniqueBy(items, keyFn) {
  const map = new Map();

  for (const item of items) {
    const key = keyFn(item);
    if (key) {
      map.set(key, { ...map.get(key), ...item });
    }
  }

  return [...map.values()];
}

function studentProfilesFromSeed() {
  return seedUsers
    .filter((user) => user.role === 'student')
    .map((user) => ({
      uid: user.username,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      department: user.department,
      enrollmentNumber: user.enrollmentNumber,
      semester: user.semester,
      status: user.status
    }));
}

function resultStats(result) {
  const marks = Array.isArray(result?.marks) ? result.marks : [];
  const total = marks.reduce((sum, mark) => sum + Number(mark.total || 0), 0);
  const percentage = marks.length ? Math.round(total / marks.length) : 0;

  return { marks, total, percentage };
}

function resolveResultStudent(result, students = []) {
  const student = students.find((item) => item.username === result?.studentUsername);
  return {
    name: result?.studentName || student?.displayName || result?.studentUsername || 'Student',
    enrollmentNumber: result?.enrollmentNumber || student?.enrollmentNumber || '-',
    semester: result?.semester || student?.semester || '-',
    department: student?.department || 'Computer Science'
  };
}

function downloadMarksheet(result, students = []) {
  if (!result) return;

  const { marks, percentage } = resultStats(result);
  const student = resolveResultStudent(result, students);
  const rows = marks
    .map(
      (mark) => `
        <tr>
          <td>${mark.subjectCode}</td>
          <td>${mark.internal}</td>
          <td>${mark.external}</td>
          <td>${mark.total}</td>
          <td>${mark.grade}</td>
        </tr>`
    )
    .join('');
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Marksheet - ${student.enrollmentNumber}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #172033; margin: 32px; }
      h1 { margin-bottom: 4px; }
      table { border-collapse: collapse; width: 100%; margin-top: 24px; }
      th, td { border: 1px solid #cdd7e8; padding: 10px; text-align: left; }
      th { background: #eef4ff; }
      .summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 20px; }
      .summary div { border: 1px solid #cdd7e8; padding: 12px; }
    </style>
  </head>
  <body>
    <h1>Result Processing System</h1>
    <h2>Semester Marksheet</h2>
    <p><strong>Name:</strong> ${student.name}</p>
    <p><strong>Enrollment:</strong> ${student.enrollmentNumber}</p>
    <p><strong>Department:</strong> ${student.department}</p>
    <p><strong>Semester:</strong> ${student.semester}</p>
    <table>
      <thead>
        <tr>
          <th>Subject</th>
          <th>Internal</th>
          <th>External</th>
          <th>Total</th>
          <th>Grade</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="summary">
      <div><strong>Average:</strong> ${percentage}%</div>
      <div><strong>Status:</strong> ${result.status || 'draft'}</div>
    </div>
  </body>
</html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `marksheet-${student.enrollmentNumber}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function publicSeedProfile(user) {
  if (!user) return null;

  return {
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    department: user.department,
    employeeId: user.employeeId || null,
    enrollmentNumber: user.enrollmentNumber || null,
    semester: user.semester || null,
    status: user.status
  };
}

function normalizeProfile(profile, firebaseUser) {
  const seededProfile = seedUsers.find(
    (user) =>
      user.email === firebaseUser?.email ||
      user.username === profile?.username ||
      user.email === profile?.email
  );

  return {
    ...(profile || {}),
    ...(publicSeedProfile(seededProfile) || {})
  };
}

async function resolveLoginIdentifier(identifier) {
  const value = identifier.trim().toLowerCase();

  if (value.includes('@')) {
    return value;
  }

  if (db) {
    const alias = await getDoc(doc(db, 'usernameAliases', value));
    if (alias.exists()) {
      return alias.data().email;
    }
  }

  const seededUser = seedUsers.find((user) => user.username === value);
  return seededUser?.email || value;
}

function findSeedUser(identifier) {
  const value = identifier.trim().toLowerCase();
  return seedUsers.find((user) => user.username === value || user.email === value);
}

function isInvalidCredential(error) {
  return ['auth/invalid-credential', 'auth/invalid-login-credentials', 'auth/user-not-found'].includes(
    error?.code
  );
}

function App() {
  const [session, setSession] = useState({ loading: true, user: null, profile: null });
  const [subjects, setSubjects] = useState([]);
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [userCount, setUserCount] = useState(seedUsers.length);
  const [dataLoading, setDataLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!auth || !db) {
      setSession({ loading: false, user: null, profile: null });
      return undefined;
    }

    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setSession({ loading: false, user: null, profile: null });
        return;
      }

      try {
        const profileSnap = await getDoc(doc(db, 'users', user.uid));
        const profile = profileSnap.exists() ? profileSnap.data() : null;
        setSession({
          loading: false,
          user,
          profile: normalizeProfile(profile, user)
        });
      } catch (error) {
        setMessage(error.message);
        setSession({ loading: false, user, profile: null });
      }
    });
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!db || !session.user) {
        setSubjects(seedSubjects);
        setResults(seedResultRecords);
        setStudents(studentProfilesFromSeed());
        return;
      }

      setDataLoading(true);

      try {
        const subjectSnapshot = await getDocs(collection(db, 'subjects'));
        const resultSnapshot = await getDocs(collection(db, 'results'));

        setSubjects(
          subjectSnapshot.docs.map((item) => ({
            id: item.id,
            code: item.id,
            ...item.data()
          }))
        );
        const firestoreResults = resultSnapshot.docs.map((item) => ({
            id: item.id,
            ...item.data()
          }));
        setResults(
          uniqueBy(
            [...seedResultRecords, ...firestoreResults],
            (result) => result.id || `${result.enrollmentNumber}-S${result.semester || 1}`
          )
        );

        if (['admin', 'exam_department', 'faculty'].includes(session.profile?.role)) {
          const userSnapshot =
            session.profile?.role === 'admin'
              ? await getDocs(collection(db, 'users'))
              : await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
          const userRows = userSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
          const completeStudents = userRows
            .filter((user) => user.role === 'student')
            .filter((user) => user.username && user.displayName && user.enrollmentNumber);
          setStudents(
            uniqueBy([...studentProfilesFromSeed(), ...completeStudents], (student) => student.username)
          );
          setUserCount(userRows.length);
        }
      } finally {
        setDataLoading(false);
      }
    }

    loadData().catch((error) => setMessage(error.message));
  }, [session.user, session.profile?.role]);

  if (session.loading) {
    return <main className="center-screen">Loading...</main>;
  }

  if (!firebaseReady) {
    return <SetupScreen />;
  }

  if (!session.user) {
    return <LoginScreen setMessage={setMessage} message={message} />;
  }

  return (
    <Dashboard
      profile={session.profile}
      results={results}
      students={students}
      subjects={subjects}
      userCount={userCount}
      dataLoading={dataLoading}
      message={message}
      setMessage={setMessage}
    />
  );
}

function SetupScreen() {
  return (
    <main className="center-screen setup-panel">
      <Shield size={42} />
      <h1>Result Processing System</h1>
      <p>
        Firebase is not configured yet. Add values to <code>.env</code>, then restart the dev
        server.
      </p>
      <pre>{`npm install
npm run dev`}</pre>
    </main>
  );
}

function LoginScreen({ message, setMessage }) {
  const [identifier, setIdentifier] = useState(seedUsers[0].username);
  const [password, setPassword] = useState(defaultPassword);
  const [busy, setBusy] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    try {
      const email = await resolveLoginIdentifier(identifier);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      const seedUser = findSeedUser(identifier);

      if (seedUser && password === seedUser.password && isInvalidCredential(error)) {
        try {
          setMessage(`Creating seeded account for ${seedUser.displayName}...`);
          await seedFirebase();
          await signInWithEmailAndPassword(auth, seedUser.email, password);
          setMessage('');
        } catch (seedError) {
          setMessage(
            `Could not create/login seeded account. First login as sumit1 and click "Seed Firebase Users, Subjects, and Results". Details: ${seedError.message}`
          );
        }
      } else if (seedUser && isInvalidCredential(error)) {
        setMessage(
          `Invalid password for ${seedUser.displayName}. Use the seeded password: ${seedUser.password}`
        );
      } else {
        setMessage(error.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSeed() {
    setBusy(true);
    setMessage('Seeding Firebase Auth and Firestore...');

    try {
      const result = await seedFirebase();
      setMessage(
        `Seed complete. Auth users created: ${result.createdUsers.length}. User profiles updated/skipped: ${result.updatedUsers.length + result.skippedUsers.length}. Subjects ready: ${result.subjects.created.length + result.subjects.updated.length}. Student can login with username "student".`
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-layout">
      <section className="login-hero">
        <div className="hero-copy">
          <Shield size={44} />
          <p className="eyebrow light">Firebase + Cloudinary</p>
          <h1>Result Processing System</h1>
          <p>
            A simple username and password portal for admins, exam staff, faculty, and students.
          </p>
        </div>
      </section>

      <section className="auth-panel">
        <div className="brand-row">
          <Shield size={24} />
          <strong>RPS Portal</strong>
        </div>
        <div className="auth-header">
          <h2>Sign in</h2>
          <span>No two-factor authentication</span>
        </div>
        <form onSubmit={handleLogin}>
          <label>
            Username or email
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="student"
            />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
            />
          </label>
          <button disabled={busy} type="submit">
            <Lock size={18} />
            Login
          </button>
        </form>

        <button className="secondary full-width" disabled={busy} onClick={handleSeed} type="button">
          Seed Firebase Users, Subjects, and Results
        </button>
        <p className="helper-text">
          New seeded students are created in Firebase Auth when you click seed. If a seeded student
          is missing, login will try to create it automatically.
        </p>

        {message && <p className="notice">{message}</p>}

        <div className="demo-users">
          <h3>Seed logins</h3>
          {seedUsers.map((user) => (
            <button key={user.email} type="button" onClick={() => setIdentifier(user.email)}>
              <span>{user.email}</span>
              <small>{roleLabels[user.role]}</small>
            </button>
          ))}
          <p>Password for all seeded users: {defaultPassword}</p>
        </div>
      </section>
    </main>
  );
}

function Dashboard({
  profile,
  subjects,
  results,
  students,
  userCount,
  dataLoading,
  message,
  setMessage
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [modalResult, setModalResult] = useState(null);
  const canViewStudents = ['admin', 'exam_department', 'faculty'].includes(profile?.role);
  const canUploadResults = ['admin', 'exam_department'].includes(profile?.role);
  const visibleResults =
    profile?.role === 'student'
      ? results.filter((result) => result.studentUsername === profile.username)
      : selectedStudent
        ? results.filter((result) => result.studentUsername === selectedStudent)
        : results;
  const availableSemesters = [
    ...new Set(visibleResults.map((result) => result.semester).filter(Boolean))
  ].sort((a, b) => Number(a) - Number(b));
  const activeSemester = selectedSemester || String(availableSemesters[0] || '');
  const semesterResult =
    visibleResults.find((result) => String(result.semester) === activeSemester) ||
    visibleResults[0] ||
    null;
  const stats = useMemo(
    () => [
      { label: 'Users', value: userCount, icon: Users },
      { label: 'Subjects', value: subjects.length, icon: BookOpen },
      { label: 'Results', value: visibleResults.length, icon: FileText },
      { label: 'Programs', value: 1, icon: GraduationCap }
    ],
    [subjects.length, userCount, visibleResults.length]
  );

  const studentResult = profile?.role === 'student' ? semesterResult : semesterResult || results[0];
  const openStudentResult = (student) => {
    setSelectedStudent(student.username);
    const studentResults = results.filter(
      (item) => item.studentUsername === student.username || item.enrollmentNumber === student.enrollmentNumber
    );
    const result =
      studentResults.find((item) => String(item.semester) === activeSemester) || studentResults[0];
    setSelectedSemester(result?.semester ? String(result.semester) : '');
    setModalResult(result || null);
  };

  return (
    <main className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Shield size={28} />
          <div>
            <strong>RPS</strong>
            <span>Result Portal</span>
          </div>
        </div>
        <nav className="tab-nav" aria-label="Dashboard sections">
          {dashboardTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                className={activeTab === tab.id ? 'active' : ''}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="app-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h1>{profile?.displayName || 'User'}</h1>
            <p>
              {roleLabels[profile?.role] || 'Profile pending'}{' '}
              {profile?.username ? `- ${profile.username}` : ''}
            </p>
          </div>
          <div className="topbar-actions">
            {dataLoading && <span className="sync-chip">Syncing...</span>}
            <button className="secondary" onClick={() => window.location.reload()} type="button">
              <RefreshCcw size={18} />
              Refresh
            </button>
            <button className="secondary" onClick={() => signOut(auth)} type="button">
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </header>

        <section className="stats-grid">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <article key={stat.label} className="stat-card">
                <Icon size={24} />
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            );
          })}
        </section>

        {message && <p className="notice">{message}</p>}

        {activeTab === 'overview' && (
          <section className="content-grid">
            <div className="main-column">
              <RolePanel role={profile?.role} />
              {canViewStudents && (
                <StudentDirectoryPanel
                  students={students}
                  selectedStudent={selectedStudent}
                  onSelectStudent={setSelectedStudent}
                  onViewResult={openStudentResult}
                />
              )}
              <SubjectPanel subjects={subjects} compact />
            </div>
            <aside className="side-column">
              <ResultPanel
                result={studentResult}
                results={visibleResults}
                students={students}
                selectedSemester={activeSemester}
                onSemesterChange={setSelectedSemester}
                onViewResult={setModalResult}
              />
              <EnvironmentPanel />
            </aside>
          </section>
        )}

        {activeTab === 'subjects' && <SubjectPanel subjects={subjects} />}
        {activeTab === 'results' && (
          <section className="content-grid">
            <div className="main-column">
              {canViewStudents && (
                <StudentDirectoryPanel
                  students={students}
                  selectedStudent={selectedStudent}
                  onSelectStudent={setSelectedStudent}
                  onViewResult={openStudentResult}
                />
              )}
              <ResultPanel
                result={studentResult}
                results={visibleResults}
                students={students}
                full
                selectedSemester={activeSemester}
                onSemesterChange={setSelectedSemester}
                onViewResult={setModalResult}
              />
            </div>
            {canUploadResults && (
              <aside className="side-column">
                <ResultUploadPanel
                  students={students}
                  subjects={subjects}
                  profile={profile}
                  setMessage={setMessage}
                />
              </aside>
            )}
          </section>
        )}
        {activeTab === 'media' && (
          <section className="content-grid">
            <MediaPanel setMessage={setMessage} />
            <EnvironmentPanel />
          </section>
        )}
        {modalResult && (
          <ResultModal
            result={modalResult}
            results={visibleResults}
            students={students}
            onClose={() => setModalResult(null)}
            selectedSemester={selectedSemester}
            onSemesterChange={setSelectedSemester}
          />
        )}
      </section>
    </main>
  );
}

function RolePanel({ role }) {
  const content = {
    admin: ['Manage users', 'Configure subjects', 'Publish results', 'Review activity logs'],
    exam_department: ['Enter marks', 'Verify marks', 'Lock entries', 'Generate semester results'],
    faculty: ['View assigned subjects', 'Enter internal marks', 'Submit practical marks'],
    student: ['View semester result', 'Download marksheet', 'Request revaluation']
  };

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{roleLabels[role] || 'Dashboard'} Workspace</h2>
        <BarChart3 size={22} />
      </div>
      <div className="action-grid">
        {(content[role] || content.student).map((item) => (
          <article key={item}>
            <CheckCircle2 size={18} />
            <span>{item}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function StudentDirectoryPanel({ students, selectedStudent, onSelectStudent, onViewResult }) {
  const [query, setQuery] = useState('');
  const studentRows = Array.isArray(students) ? students : [];
  const filteredStudents = studentRows.filter((student) => {
    const term = `${student.displayName || ''} ${student.email || ''} ${student.enrollmentNumber || ''}`.toLowerCase();
    return term.includes(query.trim().toLowerCase());
  });

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Student Data</h2>
        <span>{filteredStudents.length} students</span>
      </div>
      <div className="toolbar">
        <label className="search-control">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search student name, email, enrollment"
          />
        </label>
        <button className="secondary" type="button" onClick={() => onSelectStudent('')}>
          Show all
        </button>
      </div>
      <div className="student-list">
        {filteredStudents.length === 0 && (
          <div className="empty-state">
            <Users size={24} />
            <p>No student profiles found. Seed Firebase again after deploying rules.</p>
          </div>
        )}
        {filteredStudents.map((student) => (
          <article
            className={`student-row ${selectedStudent === student.username ? 'active' : ''}`}
            key={student.uid || student.id || student.email}
          >
            <div>
              <strong>{student.displayName}</strong>
              <span>{student.enrollmentNumber || 'Enrollment pending'}</span>
            </div>
            <div>
              <span>{student.email}</span>
              <span>Semester {student.semester || '-'}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onSelectStudent(student.username);
                onViewResult(student);
              }}
            >
              <Eye size={17} />
              View Result
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function SubjectPanel({ subjects, compact = false }) {
  const [query, setQuery] = useState('');
  const [semester, setSemester] = useState('all');
  const subjectRows = Array.isArray(subjects) ? subjects : [];
  const semesters = [...new Set(subjectRows.map((subject) => subject.semester).filter(Boolean))].sort(
    (a, b) => Number(a) - Number(b)
  );
  const filteredSubjects = subjectRows.filter((subject) => {
    const term = `${subject.code || ''} ${subject.name || ''} ${subject.type || ''}`.toLowerCase();
    const matchesSearch = term.includes(query.trim().toLowerCase());
    const matchesSemester = semester === 'all' || String(subject.semester) === semester;
    return matchesSearch && matchesSemester;
  });
  const visibleSubjects = compact ? filteredSubjects.slice(0, 5) : filteredSubjects;

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Subjects</h2>
        <span>{filteredSubjects.length} of {subjectRows.length} active</span>
      </div>
      <div className="toolbar">
        <label className="search-control">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search subjects"
          />
        </label>
        <select value={semester} onChange={(event) => setSemester(event.target.value)}>
          <option value="all">All semesters</option>
          {semesters.map((item) => (
            <option key={item} value={item}>
              Semester {item}
            </option>
          ))}
        </select>
      </div>
      <div className="subject-list">
        {visibleSubjects.length === 0 && (
          <div className="empty-state">
            <BookOpen size={24} />
            <p>No subjects match this filter.</p>
          </div>
        )}
        {visibleSubjects.map((subject) => (
          <article key={subject.code || subject.id} className="subject-row">
            <div>
              <strong>{subject.code}</strong>
              <span>{subject.name}</span>
            </div>
            <div>
              <span>Sem {subject.semester}</span>
              <span>{subject.credits} credits</span>
            </div>
            <div>
              <span>{subject.type}</span>
              <span>{subject.passingMarks}% pass</span>
            </div>
          </article>
        ))}
      </div>
      {compact && filteredSubjects.length > visibleSubjects.length && (
        <p className="muted compact-note">Showing first {visibleSubjects.length} subjects.</p>
      )}
    </section>
  );
}

function ResultPanel({
  result,
  results = [],
  students,
  full = false,
  selectedSemester = '',
  onSemesterChange,
  onViewResult
}) {
  const { marks, percentage } = resultStats(result);
  const student = resolveResultStudent(result, students);
  const semesters = [...new Set(results.map((item) => item.semester).filter(Boolean))].sort(
    (a, b) => Number(a) - Number(b)
  );
  const selectedValue = semesters.some((semester) => String(semester) === String(selectedSemester))
    ? selectedSemester
    : String(result?.semester || semesters[0] || '');

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Student Result</h2>
        <UserRound size={22} />
      </div>
      {semesters.length > 1 && (
        <label className="semester-control">
          Select semester
          <select
            value={selectedValue}
            onChange={(event) => onSemesterChange?.(event.target.value)}
          >
            {semesters.map((semester) => (
              <option key={semester} value={semester}>
                Semester {semester}
              </option>
            ))}
          </select>
        </label>
      )}
      {!result ? (
        <p className="muted">Seed Firebase to show the student result preview.</p>
      ) : (
        <>
          <p className="muted">
            {student.name} - Enrollment {student.enrollmentNumber} - Semester {student.semester}
          </p>
          <div className="result-summary">
            <div>
              <span>Average</span>
              <strong>{percentage}%</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{result.status || 'draft'}</strong>
            </div>
          </div>
          <div className="marks-list">
            {marks.length === 0 && <p className="muted">No marks found for this result yet.</p>}
            {(full ? marks : marks.slice(0, 4)).map((mark) => (
              <div key={mark.subjectCode}>
                <span>{mark.subjectCode}</span>
                <strong>{mark.total}</strong>
                <small>{mark.grade}</small>
              </div>
            ))}
          </div>
          <div className="button-row">
            {onViewResult && (
              <button className="secondary" type="button" onClick={() => onViewResult(result)}>
                <Eye size={18} />
                View Result
              </button>
            )}
            <button
              className="secondary"
              type="button"
              onClick={() => downloadMarksheet(result, students)}
            >
              <Download size={18} />
              Download Marksheet
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function ResultModal({
  result,
  results = [],
  students,
  selectedSemester = '',
  onSemesterChange,
  onClose
}) {
  const semesters = [...new Set(results.map((item) => item.semester).filter(Boolean))].sort(
    (a, b) => Number(a) - Number(b)
  );
  const activeResult =
    results.find((item) => String(item.semester) === String(selectedSemester || result?.semester)) ||
    result;
  const { marks, percentage } = resultStats(activeResult);
  const student = resolveResultStudent(activeResult, students);
  const selectedValue = semesters.some((semester) => String(semester) === String(selectedSemester))
    ? selectedSemester
    : String(activeResult?.semester || semesters[0] || '');

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="result-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="panel-heading">
          <div>
            <h2>{student.name}</h2>
            <span>{student.enrollmentNumber} - Semester {student.semester}</span>
          </div>
          <button className="secondary" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        {semesters.length > 1 && (
          <label className="semester-control">
            Select semester
            <select
              value={selectedValue}
              onChange={(event) => onSemesterChange?.(event.target.value)}
            >
              {semesters.map((semester) => (
                <option key={semester} value={semester}>
                  Semester {semester}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="result-summary">
          <div>
            <span>Average</span>
            <strong>{percentage}%</strong>
          </div>
          <div>
            <span>Status</span>
              <strong>{activeResult.status || 'draft'}</strong>
          </div>
        </div>
        <div className="marks-list">
          {marks.map((mark) => (
            <div key={mark.subjectCode}>
              <span>{mark.subjectCode}</span>
              <strong>{mark.total}</strong>
              <small>
                Internal {mark.internal} / External {mark.external} / Grade {mark.grade}
              </small>
            </div>
          ))}
        </div>
        <button className="full-width" type="button" onClick={() => downloadMarksheet(activeResult, students)}>
          <Download size={18} />
          Download Marksheet
        </button>
      </section>
    </div>
  );
}

function ResultUploadPanel({ students, subjects, profile, setMessage }) {
  const studentOptions = (Array.isArray(students) ? students : []).filter(
    (student) => student.username && student.displayName && student.enrollmentNumber
  );
  const subjectOptions = (Array.isArray(subjects) ? subjects : []).filter(
    (subject) => subject.code && subject.name
  );
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    studentUsername: studentOptions[0]?.username || '',
    subjectCode: subjectOptions[0]?.code || '',
    internal: '',
    external: '',
    semester: 1,
    status: 'draft'
  });

  useEffect(() => {
    if (!form.studentUsername && studentOptions[0]?.username) {
      setForm((current) => ({ ...current, studentUsername: studentOptions[0].username }));
    }
  }, [form.studentUsername, studentOptions]);

  useEffect(() => {
    if (!form.subjectCode && subjectOptions[0]?.code) {
      setForm((current) => ({ ...current, subjectCode: subjectOptions[0].code }));
    }
  }, [form.subjectCode, subjectOptions]);

  async function handleSubmit(event) {
    event.preventDefault();
    const student = studentOptions.find((item) => item.username === form.studentUsername);
    const internal = Number(form.internal);
    const external = Number(form.external);

    if (!student || !form.subjectCode || Number.isNaN(internal) || Number.isNaN(external)) {
      setMessage('Select a student, subject, and valid marks before uploading.');
      return;
    }

    setBusy(true);
    setMessage('Uploading result to Firestore...');

    try {
      const total = internal + external;
      const grade = total >= 85 ? 'A' : total >= 70 ? 'B+' : total >= 55 ? 'B' : total >= 40 ? 'C' : 'F';

      const resultId = `${student.enrollmentNumber}-S${Number(form.semester || student.semester || 1)}`;
      const resultRef = doc(db, 'results', resultId);
      const existingResult = await getDoc(resultRef);
      const existingMarks = Array.isArray(existingResult.data()?.marks)
        ? existingResult.data().marks
        : [];
      const nextMark = {
        subjectCode: form.subjectCode,
        internal,
        external,
        total,
        grade
      };
      const marks = existingMarks.some((mark) => mark.subjectCode === form.subjectCode)
        ? existingMarks.map((mark) => (mark.subjectCode === form.subjectCode ? nextMark : mark))
        : [...existingMarks, nextMark];

      await setDoc(
        resultRef,
        {
          enrollmentNumber: student.enrollmentNumber,
          id: resultId,
          studentUsername: student.username,
          studentName: student.displayName,
          semester: Number(form.semester || student.semester || 1),
          academicYear: 'AY2026',
          status: form.status,
          uploadedBy: profile?.email || profile?.username,
          updatedAt: serverTimestamp(),
          marks
        },
        { merge: true }
      );

      setMessage(`Result uploaded for ${student.displayName}. Refresh to see the updated result.`);
      setForm((current) => ({ ...current, internal: '', external: '' }));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Upload Result</h2>
        <Send size={22} />
      </div>
      <form className="result-form" onSubmit={handleSubmit}>
        <label>
          Student
          <select
            value={form.studentUsername}
            onChange={(event) => setForm({ ...form, studentUsername: event.target.value })}
          >
            <option value="">Select student</option>
            {studentOptions.map((student) => (
              <option key={student.username} value={student.username}>
                {student.displayName} - {student.enrollmentNumber}
              </option>
            ))}
          </select>
        </label>
        <label>
          Subject
          <select
            value={form.subjectCode}
            onChange={(event) => setForm({ ...form, subjectCode: event.target.value })}
          >
            <option value="">Select subject</option>
            {subjectOptions.map((subject) => (
              <option key={subject.code} value={subject.code}>
                {subject.code} - {subject.name}
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          <label>
            Semester
            <select
              value={form.semester}
              onChange={(event) => setForm({ ...form, semester: event.target.value })}
            >
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>
          </label>
          <label>
            Internal
            <input
              min="0"
              max="100"
              type="number"
              value={form.internal}
              onChange={(event) => setForm({ ...form, internal: event.target.value })}
            />
          </label>
          <label>
            External
            <input
              min="0"
              max="100"
              type="number"
              value={form.external}
              onChange={(event) => setForm({ ...form, external: event.target.value })}
            />
          </label>
        </div>
        <button disabled={busy} type="submit">
          <Send size={18} />
          {busy ? 'Uploading...' : 'Upload Result'}
        </button>
      </form>
    </section>
  );
}

function EnvironmentPanel() {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Environment</h2>
        <Shield size={22} />
      </div>
      <ul className="env-list">
        <li>
          <CheckCircle2 size={17} />
          Firebase connected
        </li>
        <li className={cloudName ? '' : 'muted'}>
          <CheckCircle2 size={17} />
          Cloudinary cloud name {cloudName ? 'set' : 'missing'}
        </li>
        <li className={uploadPreset ? '' : 'muted'}>
          <CheckCircle2 size={17} />
          Cloudinary unsigned preset {uploadPreset ? 'set' : 'missing'}
        </li>
      </ul>
    </section>
  );
}

function MediaPanel({ setMessage }) {
  const [busy, setBusy] = useState(false);
  const cloudReady =
    Boolean(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) &&
    Boolean(import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setMessage('Uploading media to Cloudinary...');

    try {
      const upload = await uploadToCloudinary(file);
      await setDoc(doc(collection(db, 'media')), {
        originalName: file.name,
        url: upload.secure_url,
        publicId: upload.public_id,
        resourceType: upload.resource_type,
        createdAt: serverTimestamp()
      });
      setMessage('Media uploaded and saved in Firestore.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  return (
    <section className="panel upload-panel">
      <div className="panel-heading">
        <h2>Media</h2>
        <CloudUpload size={22} />
      </div>
      <p>Use Cloudinary for marksheets, transcripts, photos, and verification assets.</p>
      <label className={`file-control ${!cloudReady ? 'disabled' : ''}`}>
        {busy ? 'Uploading...' : 'Choose file'}
        <input disabled={busy || !cloudReady} onChange={handleUpload} type="file" />
      </label>
    </section>
  );
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
