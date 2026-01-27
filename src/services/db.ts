// src/services/db.ts
import { 
  collection, onSnapshot, query, where, addDoc, updateDoc, doc, 
  orderBy, Timestamp, arrayUnion 
} from 'firebase/firestore';
import { db } from "../lib/firebase";
import { Project, ProjectStatus, User, UserRole, Notification as NotificationItem } from '../types';

// --- PROJECTS ---
export const subscribeToProjects = (user: User, callback: (projects: Project[]) => void) => {
  let q;
  
  if (user.role === UserRole.ADMIN) {
    q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
  } else if (user.role === UserRole.CONTRACTOR) {
    q = query(collection(db, 'projects'), where('contractorId', '==', user.id));
  } else {
    q = query(collection(db, 'projects'), where('clientId', '==', user.id));
  }

  return onSnapshot(q, (snapshot) => {
    const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
    callback(projects);
  });
};

export const createProject = async (projectData: any) => {
  await addDoc(collection(db, 'projects'), {
    ...projectData,
    createdAt: new Date().toISOString(),
    progress: 0,
    status: ProjectStatus.PLANNING,
    updates: []
  });
};

export const updateProjectStatus = async (projectId: string, status: ProjectStatus, progress: number) => {
  const projectRef = doc(db, 'projects', projectId);
  await updateDoc(projectRef, { status, progress });
};

export const addProjectUpdate = async (projectId: string, content: string, authorName: string) => {
  const projectRef = doc(db, 'projects', projectId);
  const newUpdate = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    author: authorName,
    content
  };
  await updateDoc(projectRef, {
    updates: arrayUnion(newUpdate)
  });
};

// --- USERS ---
export const subscribeToUsers = (callback: (users: User[]) => void) => {
  return onSnapshot(collection(db, 'users'), (snapshot) => {
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    callback(users);
  });
};