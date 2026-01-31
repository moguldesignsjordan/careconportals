// src/services/db.ts
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  orderBy, 
  arrayUnion,
  setDoc,
  getDoc,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from "../lib/firebase";
import { Project, ProjectStatus, User, UserRole, Document as ProjectDocument } from '../types';

// ============ PROJECTS ============

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
    const projects = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as Project));
    callback(projects);
  }, (error) => {
    console.error("Error fetching projects:", error);
    callback([]);
  });
};

export const createProject = async (projectData: Omit<Project, 'id' | 'updates' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'projects'), {
      ...projectData,
      createdAt: new Date().toISOString(),
      progress: projectData.progress || 0,
      status: projectData.status || ProjectStatus.PLANNING,
      updates: [],
      spent: projectData.spent || 0
    });
    return { id: docRef.id, ...projectData };
  } catch (error) {
    console.error("Error creating project:", error);
    throw error;
  }
};

export const updateProject = async (projectId: string, updates: Partial<Project>) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, updates);
  } catch (error) {
    console.error("Error updating project:", error);
    throw error;
  }
};

export const updateProjectStatus = async (projectId: string, status: ProjectStatus, progress: number) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, { status, progress });
  } catch (error) {
    console.error("Error updating project status:", error);
    throw error;
  }
};

export const addProjectUpdate = async (projectId: string, content: string, authorName: string, imageUrl?: string) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const newUpdate = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      author: authorName,
      content,
      imageUrl
    };
    await updateDoc(projectRef, {
      updates: arrayUnion(newUpdate)
    });
    return newUpdate;
  } catch (error) {
    console.error("Error adding project update:", error);
    throw error;
  }
};

export const deleteProject = async (projectId: string) => {
  try {
    await deleteDoc(doc(db, 'projects', projectId));
  } catch (error) {
    console.error("Error deleting project:", error);
    throw error;
  }
};

// ============ USERS ============

export const subscribeToUsers = (callback: (users: User[]) => void) => {
  return onSnapshot(collection(db, 'users'), (snapshot) => {
    const users = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as User));
    callback(users);
  }, (error) => {
    console.error("Error fetching users:", error);
    callback([]);
  });
};

export const createUser = async (userData: Omit<User, 'id'> & { id?: string }) => {
  try {
    if (userData.id) {
      // If ID is provided, use setDoc
      await setDoc(doc(db, 'users', userData.id), {
        ...userData,
        createdAt: new Date().toISOString()
      });
      return { ...userData };
    } else {
      // Otherwise, generate a new ID
      const docRef = await addDoc(collection(db, 'users'), {
        ...userData,
        createdAt: new Date().toISOString()
      });
      return { id: docRef.id, ...userData };
    }
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const updateUser = async (userId: string, updates: Partial<User>) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, updates);
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

export const deleteUser = async (userId: string) => {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

export const getUser = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() } as User;
    }
    return null;
  } catch (error) {
    console.error("Error getting user:", error);
    throw error;
  }
};

// ============ DOCUMENTS ============

export const subscribeToDocuments = (callback: (documents: ProjectDocument[]) => void, projectId?: string) => {
  let q;
  if (projectId) {
    q = query(collection(db, 'documents'), where('projectId', '==', projectId), orderBy('uploadedAt', 'desc'));
  } else {
    q = query(collection(db, 'documents'), orderBy('uploadedAt', 'desc'));
  }

  return onSnapshot(q, (snapshot) => {
    const documents = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as ProjectDocument));
    callback(documents);
  }, (error) => {
    console.error("Error fetching documents:", error);
    callback([]);
  });
};

export const uploadDocument = async (
  file: File, 
  metadata: Omit<ProjectDocument, 'id' | 'fileUrl' | 'uploadedAt' | 'fileSize'>
) => {
  try {
    // Upload file to Firebase Storage
    const storageRef = ref(storage, `documents/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const fileUrl = await getDownloadURL(snapshot.ref);

    // Create document record in Firestore
    const docData = {
      ...metadata,
      fileUrl,
      fileSize: formatFileSize(file.size),
      uploadedAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'documents'), docData);
    return { id: docRef.id, ...docData };
  } catch (error) {
    console.error("Error uploading document:", error);
    throw error;
  }
};

export const deleteDocument = async (documentId: string, fileUrl?: string) => {
  try {
    // Delete from Firestore
    await deleteDoc(doc(db, 'documents', documentId));
    
    // Delete from Storage if URL provided
    if (fileUrl) {
      try {
        const storageRef = ref(storage, fileUrl);
        await deleteObject(storageRef);
      } catch (e) {
        console.warn("Could not delete file from storage:", e);
      }
    }
  } catch (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
};

// ============ MESSAGES ============

export const subscribeToMessages = (
  userId: string, 
  callback: (messages: any[]) => void
) => {
  const q = query(
    collection(db, 'messages'),
    where('participants', 'array-contains', userId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    callback(messages);
  }, (error) => {
    console.error("Error fetching messages:", error);
    callback([]);
  });
};

export const sendMessage = async (
  senderId: string, 
  receiverId: string, 
  content: string,
  projectId?: string
) => {
  try {
    const messageData = {
      senderId,
      receiverId,
      content,
      projectId: projectId || null,
      timestamp: new Date().toISOString(),
      participants: [senderId, receiverId]
    };

    const docRef = await addDoc(collection(db, 'messages'), messageData);
    return { id: docRef.id, ...messageData };
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

// ============ PROFILE IMAGE ============

export const uploadProfileImage = async (userId: string, file: File): Promise<string> => {
  try {
    const storageRef = ref(storage, `avatars/${userId}_${Date.now()}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    
    // Update user's avatar in Firestore
    await updateUser(userId, { avatar: downloadUrl });
    
    return downloadUrl;
  } catch (error) {
    console.error("Error uploading profile image:", error);
    throw error;
  }
};

// ============ HELPERS ============

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
