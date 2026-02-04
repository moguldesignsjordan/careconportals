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
  arrayRemove,
  setDoc,
  getDoc,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from "../lib/firebase";
import { Project, ProjectStatus, User, UserRole, Document as ProjectDocument, Milestone, MilestoneComment } from '../types';

// ============ PROJECTS ============

/**
 * Subscribe to projects based on user role
 * - ADMIN: sees all projects
 * - CONTRACTOR: sees projects where they are in contractorIds array
 * - CLIENT: sees projects where they are in clientIds array
 */
export const subscribeToProjects = (user: User, callback: (projects: Project[]) => void) => {
  let q;
  
  if (user.role === UserRole.ADMIN) {
    // Admin sees all projects
    q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
  } else if (user.role === UserRole.CONTRACTOR) {
    // Contractor sees projects where they are assigned
    // Use array-contains to check if user.id is in contractorIds array
    q = query(
      collection(db, 'projects'), 
      where('contractorIds', 'array-contains', user.id)
    );
  } else {
    // Client sees projects where they are assigned
    // Use array-contains to check if user.id is in clientIds array
    q = query(
      collection(db, 'projects'), 
      where('clientIds', 'array-contains', user.id)
    );
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

/**
 * Create a new project with support for multiple clients and contractors
 * - If createdByRole === CONTRACTOR => status becomes PENDING_APPROVAL
 * - Otherwise, respects the provided status or defaults to PLANNING
 */
export const createProject = async (
  projectData: Omit<Project, 'id' | 'updates' | 'createdAt'>,
  createdByRole: UserRole = UserRole.ADMIN
) => {
  try {
    // Normalize client IDs
    const clientIds = projectData.clientIds?.length 
      ? projectData.clientIds 
      : projectData.clientId 
        ? [projectData.clientId] 
        : [];
    
    // Normalize contractor IDs
    const contractorIds = projectData.contractorIds?.length 
      ? projectData.contractorIds 
      : projectData.contractorId 
        ? [projectData.contractorId] 
        : [];
    
    // Determine initial status based on role
    const status = createdByRole === UserRole.CONTRACTOR
      ? ProjectStatus.PENDING_APPROVAL
      : (projectData.status || ProjectStatus.PLANNING);
    
    const docRef = await addDoc(collection(db, 'projects'), {
      ...projectData,
      clientId: projectData.clientId || clientIds[0] || '',
      contractorId: projectData.contractorId || contractorIds[0] || '',
      clientIds,
      contractorIds,
      createdAt: new Date().toISOString(),
      progress: projectData.progress || 0,
      status,
      updates: [],
      milestones: [],
      spent: projectData.spent || 0,
      approvedAt: null,
      approvedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null
    });
    
    return { 
      id: docRef.id, 
      ...projectData, 
      clientIds, 
      contractorIds, 
      status 
    };
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

/**
 * Approve a project that was created by a contractor
 */
export const approveProject = async (projectId: string, adminId: string = 'admin') => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      status: ProjectStatus.PLANNING,
      approvedAt: new Date().toISOString(),
      approvedBy: adminId,
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null
    });
  } catch (error) {
    console.error("Error approving project:", error);
    throw error;
  }
};

/**
 * Reject a project while keeping it in PENDING_APPROVAL state with a reason
 */
export const rejectProject = async (
  projectId: string, 
  reason: string, 
  adminId: string = 'admin'
) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      status: ProjectStatus.PENDING_APPROVAL,
      rejectedAt: new Date().toISOString(),
      rejectedBy: adminId,
      rejectionReason: reason
    });
  } catch (error) {
    console.error("Error rejecting project:", error);
    throw error;
  }
};

/**
 * Add a contractor to a project (multi-contractor support)
 */
export const addContractorToProject = async (projectId: string, contractorId: string) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      contractorIds: arrayUnion(contractorId)
    });
  } catch (error) {
    console.error("Error adding contractor to project:", error);
    throw error;
  }
};

/**
 * Remove a contractor from a project
 */
export const removeContractorFromProject = async (projectId: string, contractorId: string) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (!projectDoc.exists()) {
      throw new Error('Project not found');
    }
    
    const projectData = projectDoc.data();
    
    // Don't allow removing the primary contractor
    if (projectData.contractorId === contractorId) {
      throw new Error('Cannot remove the primary contractor. Assign a new primary contractor first.');
    }
    
    await updateDoc(projectRef, {
      contractorIds: arrayRemove(contractorId)
    });
  } catch (error) {
    console.error("Error removing contractor from project:", error);
    throw error;
  }
};

/**
 * Add a client to a project
 */
export const addClientToProject = async (projectId: string, clientId: string) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      clientIds: arrayUnion(clientId)
    });
  } catch (error) {
    console.error("Error adding client to project:", error);
    throw error;
  }
};

/**
 * Remove a client from a project
 */
export const removeClientFromProject = async (projectId: string, clientId: string) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (!projectDoc.exists()) {
      throw new Error('Project not found');
    }
    
    const projectData = projectDoc.data();
    
    // Don't allow removing the primary client
    if (projectData.clientId === clientId) {
      throw new Error('Cannot remove the primary client. Assign a new primary client first.');
    }
    
    await updateDoc(projectRef, {
      clientIds: arrayRemove(clientId)
    });
  } catch (error) {
    console.error("Error removing client from project:", error);
    throw error;
  }
};

/**
 * Set the primary contractor, ensuring they're in contractorIds
 */
export const setPrimaryContractor = async (projectId: string, contractorId: string) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (!projectDoc.exists()) {
      throw new Error('Project not found');
    }
    
    const projectData = projectDoc.data();
    const contractorIds = projectData.contractorIds || [];
    
    // Ensure the contractor is in the contractorIds list
    if (!contractorIds.includes(contractorId)) {
      contractorIds.push(contractorId);
    }
    
    await updateDoc(projectRef, {
      contractorId,
      contractorIds
    });
  } catch (error) {
    console.error("Error setting primary contractor:", error);
    throw error;
  }
};

/**
 * Set the primary client, ensuring they're in clientIds
 */
export const setPrimaryClient = async (projectId: string, clientId: string) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (!projectDoc.exists()) {
      throw new Error('Project not found');
    }
    
    const projectData = projectDoc.data();
    const clientIds = projectData.clientIds || [];
    
    // Ensure the client is in the clientIds list
    if (!clientIds.includes(clientId)) {
      clientIds.push(clientId);
    }
    
    await updateDoc(projectRef, {
      clientId,
      clientIds
    });
  } catch (error) {
    console.error("Error setting primary client:", error);
    throw error;
  }
};

/**
 * Update project status and progress
 */
export const updateProjectStatus = async (
  projectId: string, 
  status: ProjectStatus, 
  progress: number
) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, { status, progress });
  } catch (error) {
    console.error("Error updating project status:", error);
    throw error;
  }
};

/**
 * Add project update (timeline / activity log)
 */
export const addProjectUpdate = async (
  projectId: string,
  content: string,
  authorName: string,
  imageUrl?: string
) => {
  try {
    const projectRef = doc(db, 'projects', projectId);

    const newUpdate: any = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      author: authorName,
      content,
    };
    
    if (imageUrl) {
      newUpdate.imageUrl = imageUrl;
    }

    await updateDoc(projectRef, {
      updates: arrayUnion(newUpdate),
    });

    return newUpdate;
  } catch (error) {
    console.error('Error adding project update:', error);
    throw error;
  }
};

export const deleteProjectUpdate = async (
  projectId: string,
  updateId: string
) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (!projectDoc.exists()) {
      throw new Error('Project not found');
    }

    const projectData = projectDoc.data();
    const updates = (projectData.updates || []) as any[];

    const updatedUpdates = updates.filter(update => update.id !== updateId);

    await updateDoc(projectRef, { updates: updatedUpdates });
  } catch (error) {
    console.error('Error deleting project update:', error);
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

// ============ PROJECT UPDATE IMAGES ============

export const uploadProjectUpdateImage = async (projectId: string, file: File): Promise<string> => {
  try {
    const storageRef = ref(storage, `project-updates/${projectId}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading project update image:", error);
    throw error;
  }
};

// ============ MILESTONES ============

export const addMilestone = async (
  projectId: string, 
  milestone: Omit<Milestone, 'id' | 'comments'>
) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    
    const newMilestone: Milestone = {
      ...milestone,
      id: Math.random().toString(36).substr(2, 9),
      comments: [],
      imageUrls: milestone.imageUrls || []
    };
    
    await updateDoc(projectRef, {
      milestones: arrayUnion(newMilestone)
    });
    
    return newMilestone;
  } catch (error) {
    console.error("Error adding milestone:", error);
    throw error;
  }
};

export const updateMilestone = async (
  projectId: string,
  milestoneId: string,
  updates: Partial<Milestone>
) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (!projectDoc.exists()) {
      throw new Error('Project not found');
    }
    
    const projectData = projectDoc.data();
    const milestones = (projectData.milestones || []) as Milestone[];
    
    const updatedMilestones = milestones.map((milestone) =>
      milestone.id === milestoneId
        ? { ...milestone, ...updates }
        : milestone
    );
    
    await updateDoc(projectRef, { milestones: updatedMilestones });
  } catch (error) {
    console.error("Error updating milestone:", error);
    throw error;
  }
};

export const uploadMilestoneImage = async (
  projectId: string, 
  milestoneId: string, 
  file: File
): Promise<string> => {
  try {
    const storageRef = ref(storage, `milestones/${projectId}/${milestoneId}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading milestone image:", error);
    throw error;
  }
};

export const addMilestoneComment = async (
  projectId: string,
  milestoneId: string,
  authorId: string,
  authorName: string,
  content: string,
  imageUrl?: string
) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (!projectDoc.exists()) {
      throw new Error('Project not found');
    }
    
    const projectData = projectDoc.data();
    const milestones = (projectData.milestones || []) as Milestone[];
    
    const newComment: MilestoneComment = {
      id: Math.random().toString(36).substr(2, 9),
      author: authorName,
      authorId,
      content,
      timestamp: new Date().toISOString(),
      imageUrl
    };
    
    const updatedMilestones = milestones.map(milestone =>
      milestone.id === milestoneId
        ? { ...milestone, comments: [...(milestone.comments || []), newComment] }
        : milestone
    );
    
    await updateDoc(projectRef, { milestones: updatedMilestones });
    return newComment;
  } catch (error) {
    console.error("Error adding milestone comment:", error);
    throw error;
  }
};

// ============ USERS ============

export const subscribeToUsers = (callback: (users: User[]) => void) => {
  const q = query(collection(db, 'users'));
  
  return onSnapshot(q, (snapshot) => {
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
      await setDoc(doc(db, 'users', userData.id), {
        ...userData,
        createdAt: new Date().toISOString()
      });
      return { ...userData };
    } else {
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
    await updateDoc(doc(db, 'users', userId), updates);
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
    console.error("Error fetching user:", error);
    throw error;
  }
};

// ============ DOCUMENTS ============

/**
 * Subscribe to documents, with optional project filters
 */
export const subscribeToDocuments = (
  callback: (documents: ProjectDocument[]) => void, 
  options?: {
    projectId?: string;
    projectIds?: string[];
  }
) => {
  let q;
  
  if (options?.projectId) {
    // Filter by single project
    q = query(
      collection(db, 'documents'), 
      where('projectId', '==', options.projectId), 
      orderBy('uploadedAt', 'desc')
    );
  } else if (options?.projectIds && options.projectIds.length > 0) {
    // Filter by multiple projects - Firestore IN queries support up to 10 values in some SDKs,
    // to be safe we limit to 30 but you may adjust based on your requirements.
    const limitedProjectIds = options.projectIds.slice(0, 30);
    q = query(
      collection(db, 'documents'), 
      where('projectId', 'in', limitedProjectIds), 
      orderBy('uploadedAt', 'desc')
    );
  } else {
    // No filter - admin view or general list
    q = query(
      collection(db, 'documents'), 
      orderBy('uploadedAt', 'desc')
    );
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

/**
 * Subscribe to documents filtered by user's accessible projects
 */
export const subscribeToUserDocuments = (
  user: User,
  projects: Project[],
  callback: (documents: ProjectDocument[]) => void
) => {
  if (user.role === UserRole.ADMIN) {
    // Admin sees all documents
    return subscribeToDocuments(callback);
  }
  
  // Get project IDs the user has access to
  const accessibleProjectIds = projects.map(p => p.id);
  
  if (accessibleProjectIds.length === 0) {
    callback([]);
    return () => {}; // Return empty unsubscribe function
  }
  
  return subscribeToDocuments(callback, { projectIds: accessibleProjectIds });
};

/**
 * Subscribe to documents for a single project
 * (helper used by ProjectDocumentsPanel)
 */
export const subscribeToProjectDocuments = (
  projectId: string,
  callback: (documents: ProjectDocument[]) => void
) => {
  return subscribeToDocuments(callback, { projectId });
};

export const uploadDocument = async (
  file: File, 
  metadata: Omit<ProjectDocument, 'id' | 'fileUrl' | 'uploadedAt' | 'fileSize'>
) => {
  try {
    const storageRef = ref(storage, `documents/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const fileUrl = await getDownloadURL(snapshot.ref);

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

/**
 * Convenience helper to upload a document that is always attached
 * to a specific project. Used by the in-project documents panel.
 */
export const uploadProjectDocument = async (
  file: File,
  project: Project,
  uploader: User
) => {
  return uploadDocument(file, {
    title: file.name,
    fileName: file.name,
    uploadedBy: uploader.name || uploader.email,
    projectId: project.id,
    category: 'Other',
  });
};

export const deleteProjectDocument = async (
  projectId: string,
  docId: string
): Promise<void> => {
  try {
    const docRef = doc(db, 'documents', docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting project document', err);
    throw err;
  }
};

// ============ MESSAGES ============

/**
 * Subscribe to messages for a user
 */
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

/**
 * Subscribe to project-specific messages but still scoped by user access
 */
export const subscribeToProjectMessages = (
  userId: string,
  accessibleProjectIds: string[],
  callback: (messages: any[]) => void
) => {
  const q = query(
    collection(db, 'messages'),
    where('participants', 'array-contains', userId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const allMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filter messages client-side by accessible projects
    const filteredMessages = allMessages.filter(msg => {
      if (!msg.projectId) return true; // Non-project messages
      return accessibleProjectIds.includes(msg.projectId);
    });
    
    callback(filteredMessages);
  }, (error) => {
    console.error("Error fetching project messages:", error);
    callback([]);
  });
};

/**
 * Send a new message
 */
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
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    await updateUser(userId, { avatar: downloadURL });
    
    return downloadURL;
  } catch (error) {
    console.error("Error uploading profile image:", error);
    throw error;
  }
};

// ============ CALENDAR EVENTS ============

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime?: string;
  location?: string;
  type: 'inspection' | 'meeting' | 'delivery' | 'site-visit' | 'deadline' | 'other';
  projectId?: string;
  createdBy: string;
  attendees?: string[];
  createdAt?: string;
}

export const subscribeToCalendarEvents = (
  userId: string,
  userRole: UserRole,
  callback: (events: CalendarEvent[]) => void
) => {
  let q;
  
  if (userRole === UserRole.ADMIN) {
    // Admin sees all events
    q = query(collection(db, 'calendarEvents'), orderBy('date', 'asc'));
  } else {
    // Other users see events where they are an attendee
    q = query(
      collection(db, 'calendarEvents'),
      where('attendees', 'array-contains', userId),
      orderBy('date', 'asc')
    );
  }

  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as CalendarEvent));
    callback(events);
  }, (error) => {
    console.error("Error fetching calendar events:", error);
    callback([]);
  });
};

export const createCalendarEvent = async (
  eventData: Omit<CalendarEvent, 'id' | 'createdAt'>
) => {
  try {
    const docRef = await addDoc(collection(db, 'calendarEvents'), {
      ...eventData,
      createdAt: new Date().toISOString()
    });
    
    return { id: docRef.id, ...eventData };
  } catch (error) {
    console.error("Error creating calendar event:", error);
    throw error;
  }
};

export const updateCalendarEvent = async (
  eventId: string, 
  updates: Partial<CalendarEvent>
) => {
  try {
    const eventRef = doc(db, 'calendarEvents', eventId);
    await updateDoc(eventRef, updates);
  } catch (error) {
    console.error("Error updating calendar event:", error);
    throw error;
  }
};

export const deleteCalendarEvent = async (eventId: string) => {
  try {
    await deleteDoc(doc(db, 'calendarEvents', eventId));
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    throw error;
  }
};

// ============ HELPERS ============

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if user has access to a given project
 */
export const userHasProjectAccess = (user: User, project: Project): boolean => {
  if (user.role === UserRole.ADMIN) return true;
  
  if (user.role === UserRole.CONTRACTOR) {
    const contractorIds = project.contractorIds || [project.contractorId];
    return contractorIds.includes(user.id);
  }
  
  if (user.role === UserRole.CLIENT) {
    const clientIds = project.clientIds || [project.clientId];
    return clientIds.includes(user.id);
  }
  
  return false;
};

/**
 * Derive project team members from users list
 */
export const getProjectTeamMembers = (project: Project, users: User[]) => {
  const clientIds = project.clientIds || [project.clientId];
  const contractorIds = project.contractorIds || [project.contractorId];

  const clients = users.filter(u => clientIds.includes(u.id));
  const contractors = users.filter(u => contractorIds.includes(u.id));
  
  return {
    clients,
    contractors,
    primaryClient: users.find(u => u.id === project.clientId),
    primaryContractor: users.find(u => u.id === project.contractorId)
  };
};
