import { deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, firebaseConfig } from './firebase';
import {
  seedAcademicYears,
  seedPrograms,
  seedResultRecords,
  seedRoles,
  seedSubjects,
  seedUsers
} from './seedData';

function userProfile(user, uid) {
  return {
    uid,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    department: user.department,
    employeeId: user.employeeId || null,
    enrollmentNumber: user.enrollmentNumber || null,
    semester: user.semester || null,
    status: user.status,
    updatedAt: serverTimestamp()
  };
}

async function writeUserProfile(user, uid) {
  await setDoc(
    doc(db, 'users', uid),
    {
      ...userProfile(user, uid),
      createdAt: serverTimestamp()
    },
    { merge: true }
  );

  await setDoc(
    doc(db, 'usernameAliases', user.username),
    {
      username: user.username,
      email: user.email,
      uid,
      role: user.role
    },
    { merge: true }
  );
}

async function seedCollection(collectionName, items, idKey = 'id') {
  const created = [];
  const updated = [];

  for (const item of items) {
    const id = item[idKey];
    const ref = doc(db, collectionName, id);
    const existing = await getDoc(ref);

    await setDoc(
      ref,
      {
        ...item,
        isActive: item.status ? item.status === 'active' : item.isActive !== false,
        updatedAt: serverTimestamp(),
        createdAt: existing.exists() ? existing.data().createdAt || serverTimestamp() : serverTimestamp()
      },
      { merge: true }
    );

    if (existing.exists()) {
      updated.push(id);
    } else {
      created.push(id);
    }
  }

  return { created, updated };
}

async function ensurePrimaryAdmin() {
  const adminUser = seedUsers[0];

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      adminUser.email,
      adminUser.password
    );
    await updateProfile(credential.user, { displayName: adminUser.displayName });
    await writeUserProfile(adminUser, credential.user.uid);
    return { status: 'created', uid: credential.user.uid, email: adminUser.email };
  } catch (error) {
    if (error.code !== 'auth/email-already-in-use') {
      throw error;
    }

    const credential = await signInWithEmailAndPassword(auth, adminUser.email, adminUser.password);
    await writeUserProfile(adminUser, credential.user.uid);
    return { status: 'updated', uid: credential.user.uid, email: adminUser.email };
  }
}

export async function seedFirebase() {
  if (!auth || !db) {
    throw new Error('Firebase is not configured. Fill .env first.');
  }

  const primaryAdmin = await ensurePrimaryAdmin();
  const createdUsers = primaryAdmin.status === 'created' ? [primaryAdmin.email] : [];
  const updatedUsers = primaryAdmin.status === 'updated' ? [primaryAdmin.email] : [];
  const skippedUsers = [];

  const seedApp = initializeApp(firebaseConfig, `seed-worker-${Date.now()}`);
  const seedAuth = getAuth(seedApp);

  try {
    for (const user of seedUsers.slice(1)) {
      try {
        const credential = await createUserWithEmailAndPassword(seedAuth, user.email, user.password);
        await updateProfile(credential.user, { displayName: user.displayName });
        await writeUserProfile(user, credential.user.uid);
        createdUsers.push(user.email);
      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          const credential = await signInWithEmailAndPassword(seedAuth, user.email, user.password);
          await updateProfile(credential.user, { displayName: user.displayName });
          await writeUserProfile(user, credential.user.uid);
          updatedUsers.push(user.email);
        } else {
          throw error;
        }
      }
    }

    const roles = await seedCollection('roles', seedRoles);
    const programs = await seedCollection('programs', seedPrograms, 'code');
    const academicYears = await seedCollection('academicYears', seedAcademicYears, 'code');
    const subjects = await seedCollection('subjects', seedSubjects, 'code');
    const results = await seedCollection('results', seedResultRecords, 'id');

    return {
      createdUsers,
      updatedUsers,
      skippedUsers,
      roles,
      programs,
      academicYears,
      subjects,
      results
    };
  } finally {
    await signOut(seedAuth).catch(() => {});
    await deleteApp(seedApp);
  }
}
