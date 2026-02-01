import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { User, UserRole, Project, Document as ProjectDocument, Message, Milestone } from './types';
import {
  subscribeToProjects,
  subscribeToUsers,
  subscribeToDocuments,
  subscribeToMessages,
  createProject,
  createUser,
  uploadDocument,
  deleteDocument,
  sendMessage,
  updateProjectStatus,
  addProjectUpdate,
  uploadProjectUpdateImage,
  addMilestone,
  updateMilestone,
  addMilestoneComment,
  uploadMilestoneImage,
  subscribeToCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  CalendarEvent,
} from './services/db';

// Components
import Sidebar from './components/Sidebar';
import DashboardAdmin from './components/DashboardAdmin';
import DashboardContractor from './components/DashboardContractor';
import DashboardClient from './components/DashboardClient';
import ProjectDetails from './components/ProjectDetails';
import ProjectsHub from './components/ProjectsHub';
import ProjectTimeline from './components/ProjectTimeline';
import CalendarPage from './components/CalendarPage';
import CreateProjectModal from './components/CreateProjectModal';
import CreateClientModal from './components/CreateClientModal';
import CreateContractorModal from './components/CreateContractorModal';
import Messaging from './components/Messaging';
import DocumentsTab from './components/DocumentsTab';
import UsersDirectory from './components/UsersDirectory';
import SettingsPage from './components/SettingsPage';
import LoginPage from './components/LoginPage';

// Icons
import { Loader2, Menu, CheckCircle, XCircle, Info, ArrowLeft, LayoutGrid, Clock } from 'lucide-react';

type ViewType =
  | 'dashboard'
  | 'projects'
  | 'project-details'
  | 'project-timeline'
  | 'messages'
  | 'documents'
  | 'directory'
  | 'settings'
  | 'calendar';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const App: React.FC = () => {
  const { user, loading: authLoading, logout } = useAuth();

  // Data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // UI state
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatUser, setChatUser] = useState<User | null>(null);
  const [projectViewMode, setProjectViewMode] = useState<'details' | 'timeline'>('details');

  // Modal state
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showCreateContractor, setShowCreateContractor] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Subscribe to data when user is authenticated
  useEffect(() => {
    if (!user) {
      setDataLoading(false);
      return;
    }

    setDataLoading(true);

    const unsubProjects = subscribeToProjects(user, (data) => {
      setProjects(data);
      setDataLoading(false);
    });

    const unsubUsers = subscribeToUsers((data) => {
      setUsers(data);
    });

    const unsubDocs = subscribeToDocuments((data) => {
      setDocuments(data);
    });

    const unsubMessages = subscribeToMessages(user.id, (data) => {
      setMessages(data as Message[]);
    });

    const unsubCalendar = subscribeToCalendarEvents(user.id, user.role, (data) => {
      setCalendarEvents(data);
    });

    return () => {
      unsubProjects();
      unsubUsers();
      unsubDocs();
      unsubMessages();
      unsubCalendar();
    };
  }, [user]);

  // Toast helper
  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Filter users by role
  const clients = users.filter((u) => u.role === UserRole.CLIENT);
  const contractors = users.filter((u) => u.role === UserRole.CONTRACTOR);

  // Handlers
  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setCurrentView('project-details');
    setProjectViewMode('details');
    setSidebarOpen(false);
  };

  const handleBackToDashboard = () => {
    setSelectedProject(null);
    setCurrentView('dashboard');
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
    setCurrentView('projects');
  };

  const handleCreateProject = async (
    projectData: Omit<Project, 'id' | 'updates' | 'createdAt'>,
  ) => {
    try {
      await createProject(projectData);
      showToast('Project created successfully!', 'success');
      setShowCreateProject(false);
    } catch (error: any) {
      showToast(error.message || 'Failed to create project', 'error');
      throw error;
    }
  };

  const handleCreateClient = async (clientData: Omit<User, 'id'>) => {
    try {
      await createUser(clientData);
      showToast('Client added successfully!', 'success');
      setShowCreateClient(false);
    } catch (error: any) {
      showToast(error.message || 'Failed to add client', 'error');
      throw error;
    }
  };

  const handleCreateContractor = async (contractorData: Omit<User, 'id'>) => {
    try {
      await createUser(contractorData);
      showToast('Contractor added successfully!', 'success');
      setShowCreateContractor(false);
    } catch (error: any) {
      showToast(error.message || 'Failed to add contractor', 'error');
      throw error;
    }
  };

  const handleUploadDocument = async (
    file: File,
    metadata: Omit<ProjectDocument, 'id' | 'fileUrl' | 'uploadedAt' | 'fileSize'>,
  ) => {
    try {
      await uploadDocument(file, metadata);
      showToast('Document uploaded successfully!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to upload document', 'error');
      throw error;
    }
  };

  const handleDeleteDocument = async (docId: string, fileUrl?: string) => {
    try {
      await deleteDocument(docId, fileUrl);
      showToast('Document deleted', 'info');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete document', 'error');
      throw error;
    }
  };

  const handleSendMessage = async (
    receiverId: string,
    content: string,
    projectId?: string,
  ) => {
    if (!user) return;
    try {
      await sendMessage(user.id, receiverId, content, projectId);
    } catch (error: any) {
      showToast(error.message || 'Failed to send message', 'error');
      throw error;
    }
  };

  const handleUpdateProjectStatus = async (
    projectId: string,
    status: any,
    progress: number,
  ) => {
    try {
      await updateProjectStatus(projectId, status, progress);
      showToast('Project updated!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to update project', 'error');
      throw error;
    }
  };

  const handleAddProjectUpdate = async (
    projectId: string,
    content: string,
    imageFile?: File | null
  ) => {
    if (!user) return;
    try {
      let imageUrl: string | undefined;

      if (imageFile) {
        imageUrl = await uploadProjectUpdateImage(projectId, imageFile);
      }

      await addProjectUpdate(projectId, content, user.name, imageUrl);
      showToast('Update posted!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to post update', 'error');
      throw error;
    }
  };

  // Milestone handlers
  const handleAddMilestone = async (
    projectId: string,
    milestone: Omit<Milestone, 'id' | 'comments'>
  ) => {
    try {
      await addMilestone(projectId, milestone);
      showToast('Milestone added!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to add milestone', 'error');
      throw error;
    }
  };

  const handleUpdateMilestone = async (
    projectId: string,
    milestoneId: string,
    updates: Partial<Milestone>
  ) => {
    try {
      await updateMilestone(projectId, milestoneId, updates);
      showToast('Milestone updated!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to update milestone', 'error');
      throw error;
    }
  };

  const handleAddMilestoneComment = async (
    projectId: string,
    milestoneId: string,
    content: string,
    imageFile?: File | null
  ) => {
    if (!user) return;
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadMilestoneImage(projectId, milestoneId, imageFile);
      }
      await addMilestoneComment(projectId, milestoneId, user.id, user.name, content, imageUrl);
      showToast('Comment added!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to add comment', 'error');
      throw error;
    }
  };

  const handleUploadMilestoneImage = async (
    projectId: string,
    milestoneId: string,
    file: File
  ): Promise<string> => {
    try {
      const url = await uploadMilestoneImage(projectId, milestoneId, file);
      // Also add the image to the milestone's imageUrls array
      const project = projects.find(p => p.id === projectId);
      const milestone = project?.milestones?.find(m => m.id === milestoneId);
      if (milestone) {
        const currentImages = milestone.imageUrls || [];
        await updateMilestone(projectId, milestoneId, {
          imageUrls: [...currentImages, url]
        });
      }
      showToast('Image uploaded!', 'success');
      return url;
    } catch (error: any) {
      showToast(error.message || 'Failed to upload image', 'error');
      throw error;
    }
  };

  const handleNavigate = (view: string) => {
    if (view === 'logout') {
      logout();
      return;
    }
    setCurrentView(view as ViewType);
    setSelectedProject(null);
    setSidebarOpen(false);
  };

  const handleOpenMessages = (targetUser?: User) => {
    if (targetUser) {
      setChatUser(targetUser);
    }
    setCurrentView('messages');
    setSidebarOpen(false);
  };

  // Calendar event handlers
  const handleCreateCalendarEvent = async (
    eventData: Omit<CalendarEvent, 'id' | 'createdAt'>
  ) => {
    try {
      await createCalendarEvent(eventData);
      showToast('Event created!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to create event', 'error');
      throw error;
    }
  };

  const handleUpdateCalendarEvent = async (
    eventId: string,
    updates: Partial<CalendarEvent>
  ) => {
    try {
      await updateCalendarEvent(eventId, updates);
      showToast('Event updated!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to update event', 'error');
      throw error;
    }
  };

  const handleDeleteCalendarEvent = async (eventId: string) => {
    try {
      await deleteCalendarEvent(eventId);
      showToast('Event deleted', 'info');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete event', 'error');
      throw error;
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2
            size={48}
            className="animate-spin text-care-orange mx-auto mb-4"
          />
          <p className="text-[#1A1A1A]/60 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!user) {
    return <LoginPage />;
  }

  // Render current view
  const renderView = () => {
    switch (currentView) {
      case 'project-details':
      case 'project-timeline': {
        if (!selectedProject) {
          setCurrentView('dashboard');
          return null;
        }
        const currentProject =
          projects.find((p) => p.id === selectedProject.id) || selectedProject;
        
        return (
          <div className="space-y-4">
            {/* View Toggle Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleBackToProjects}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-care-orange transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Projects
              </button>
              
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setProjectViewMode('details')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    projectViewMode === 'details'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <LayoutGrid size={14} />
                  Details
                </button>
                <button
                  onClick={() => setProjectViewMode('timeline')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    projectViewMode === 'timeline'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Clock size={14} />
                  Timeline
                </button>
              </div>
            </div>

            {/* Render based on view mode */}
            {projectViewMode === 'timeline' ? (
              <ProjectTimeline
                project={currentProject}
                currentUser={user}
                milestones={currentProject.milestones || []}
                onAddMilestone={(milestone) => handleAddMilestone(currentProject.id, milestone)}
                onUpdateMilestone={(milestoneId, updates) => 
                  handleUpdateMilestone(currentProject.id, milestoneId, updates)
                }
                onAddComment={(milestoneId, content, imageFile) =>
                  handleAddMilestoneComment(currentProject.id, milestoneId, content, imageFile)
                }
                onUploadMilestoneImage={(milestoneId, file) =>
                  handleUploadMilestoneImage(currentProject.id, milestoneId, file)
                }
              />
            ) : (
              <ProjectDetails
                project={currentProject}
                users={users}
                currentUser={user}
                onBack={handleBackToProjects}
                onUpdateStatus={handleUpdateProjectStatus}
                onAddUpdate={handleAddProjectUpdate}
                onMessage={handleOpenMessages}
              />
            )}
          </div>
        );
      }

      case 'messages':
        return (
          <Messaging
            currentUser={user}
            users={users}
            messages={messages}
            onSendMessage={handleSendMessage}
            initialChatUser={chatUser}
          />
        );

      case 'documents':
        return (
          <DocumentsTab
            documents={documents}
            currentUser={user}
            users={users}
            onUpload={handleUploadDocument}
            onDelete={handleDeleteDocument}
          />
        );

      case 'directory':
        return (
          <UsersDirectory
            users={users}
            currentUser={user}
            onOpenCreateClientModal={() => setShowCreateClient(true)}
            onOpenCreateContractorModal={() => setShowCreateContractor(true)}
            onMessageUser={handleOpenMessages}
          />
        );

      case 'settings':
        return <SettingsPage />;

      case 'calendar':
        return (
          <CalendarPage
            events={calendarEvents}
            projects={projects}
            users={users}
            currentUser={user}
            onCreateEvent={handleCreateCalendarEvent}
            onUpdateEvent={handleUpdateCalendarEvent}
            onDeleteEvent={handleDeleteCalendarEvent}
          />
        );

      case 'projects':
        return (
          <ProjectsHub
            projects={projects}
            users={users}
            currentUser={user}
            onProjectClick={handleSelectProject}
            onCreateProject={() => setShowCreateProject(true)}
          />
        );

      case 'dashboard':
      default:
        if (user.role === UserRole.ADMIN) {
          return (
            <DashboardAdmin
              projects={projects}
              users={users}
              onSelectProject={handleSelectProject}
              onOpenCreateModal={() => setShowCreateProject(true)}
              onOpenCreateClientModal={() => setShowCreateClient(true)}
              onOpenCreateContractorModal={() => setShowCreateContractor(true)}
              onOpenMessages={() => handleOpenMessages()}
            />
          );
        } else if (user.role === UserRole.CONTRACTOR) {
          return (
            <DashboardContractor
              projects={projects}
              users={users}
              currentUser={user}
              onSelectProject={handleSelectProject}
              onOpenCreateModal={() => setShowCreateProject(true)}
              onOpenMessages={() => handleOpenMessages()}
            />
          );
        } else {
          return (
            <DashboardClient
              projects={projects}
              users={users}
              currentUser={user}
              onSelectProject={handleSelectProject}
              onOpenMessages={() => handleOpenMessages()}
              onOpenDocuments={() => setCurrentView('documents')}
            />
          );
        }
    }
  };

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 z-40">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl hover:bg-care-orange/10 transition-colors"
        >
          <Menu size={24} />
        </button>
        <img src="/care.png" alt="Care Construction" className="h-8" />
        <div className="w-10" />
      </div>

      {/* Sidebar */}
      <Sidebar
        currentUser={user}
        activeTab={currentView}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 pt-16 lg:pt-8 overflow-y-auto">
        <main className="flex-1 px-4 lg:px-8 pb-8">
          {dataLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-care-orange" />
            </div>
          ) : (
            renderView()
          )}
        </main>
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        clients={clients}
        contractors={contractors}
        currentUser={user}
        onCreate={handleCreateProject}
      />

      <CreateClientModal
        isOpen={showCreateClient}
        onClose={() => setShowCreateClient(false)}
        onCreate={handleCreateClient}
      />

      <CreateContractorModal
        isOpen={showCreateContractor}
        onClose={() => setShowCreateContractor(false)}
        onCreate={handleCreateContractor}
      />

      {/* Toast notifications – brand colors only */}
      <div className="fixed bottom-4 right-4 z-[200] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg
              animate-in slide-in-from-right duration-300
              ${
                toast.type === 'success'
                  ? 'bg-care-orange text-white'
                  : ''
              }
              ${
                toast.type === 'error'
                  ? 'bg-[#1A1A1A] text-white'
                  : ''
              }
              ${
                toast.type === 'info'
                  ? 'bg-white text-[#1A1A1A] border border-care-orange'
                  : ''
              }
            `}
          >
            {toast.type === 'success' && <CheckCircle size={18} />}
            {toast.type === 'error' && <XCircle size={18} />}
            {toast.type === 'info' && <Info size={18} />}
            <span className="font-medium text-sm">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;