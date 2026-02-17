import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { User, UserRole, Project, Document as ProjectDocument, Message, Milestone } from './types';
import { Invoice, InvoiceStatus, CreateInvoiceData } from './types/invoice';
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
  deleteMilestone,
  addMilestoneComment,
  uploadMilestoneImage,
  subscribeToCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  CalendarEvent,
} from './services/db';

// Invoice service imports
import {
  subscribeToInvoices,
  createInvoice,
  publishInvoice,
  cancelInvoice,
  deleteInvoice,
  updateOverdueInvoices,
} from './services/invoices';

// Notification imports
import { AppNotification } from './types/notification';
import {
  subscribeToNotifications,
  notifyProjectCreated,
  notifyProjectStatusChanged,
  notifyProjectUpdate,
  notifyMessageReceived,
  notifyInvoiceSent,
  notifyDocumentUploaded,
  notifyMilestoneCompleted,
  notifyEventCreated,
} from './services/notifications';
import NotificationBell from './components/NotificationBell';

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
import InvoicesPage from './components/InvoicesPage';
import CreateInvoiceModal from './components/CreateInvoiceModal';
import InvoicePaymentPage from './components/InvoicePaymentPage';
import BudgetCalculator from './components/BudgetCalculator';

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
  | 'calendar'
  | 'invoices'
  | 'invoice-payment'
  | 'budget';

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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
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
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ✅ prevents duplicate subscription setup (StrictMode + rerenders)
  const didSetupSubsForUid = useRef<string | null>(null);

  // Subscribe to data when user is authenticated
  useEffect(() => {
    if (!user) {
      setDataLoading(false);
      didSetupSubsForUid.current = null;
      return;
    }

    // ✅ do not re-subscribe repeatedly for same user
    if (didSetupSubsForUid.current === user.id) return;
    didSetupSubsForUid.current = user.id;

    setDataLoading(true);

    let projectsLoaded = false;
    let usersLoaded = false;

    let timeoutId: number | null = null;

    const clearLoadTimeout = () => {
      if (timeoutId != null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const checkIfReady = () => {
      if (projectsLoaded && usersLoaded) {
        clearLoadTimeout();
        setDataLoading(false);
      }
    };

    timeoutId = window.setTimeout(() => {
      console.warn('⚠️ Loading timeout reached - forcing data load completion');
      setDataLoading(false);
    }, 5000);

    console.log('=== Setting up subscriptions ===');

    const unsubProjects = subscribeToProjects(user, (data: any) => {
      const arr = Array.isArray(data) ? data : [];
      console.log('Projects subscription fired:', arr.length, 'projects');
      setProjects(arr);
      projectsLoaded = true;
      checkIfReady();
    });

    const unsubUsers = subscribeToUsers((data: any) => {
      const arr = Array.isArray(data) ? data : [];
      setUsers(arr);
      usersLoaded = true;
      checkIfReady();
    });

    const unsubDocs = subscribeToDocuments((data: any) => {
      setDocuments(Array.isArray(data) ? data : []);
    });

    const unsubMessages = subscribeToMessages(user.id, (data: any) => {
      setMessages(Array.isArray(data) ? (data as Message[]) : []);
    });

    const unsubCalendar = subscribeToCalendarEvents(user.id, user.role, (data: any) => {
      setCalendarEvents(Array.isArray(data) ? data : []);
    });

    // Subscribe to invoices
    const unsubInvoices = subscribeToInvoices(user, (data: any) => {
      console.log('Invoices subscription fired:', data?.length || 0, 'invoices');
      setInvoices(Array.isArray(data) ? data : []);
    });

    // Subscribe to notifications
    const unsubNotifications = subscribeToNotifications(user.id, (data) => {
      setNotifications(Array.isArray(data) ? data : []);
    });

    // Check for overdue invoices on load
    updateOverdueInvoices().catch(console.error);

    return () => {
      clearLoadTimeout();
      unsubProjects?.();
      unsubUsers?.();
      unsubDocs?.();
      unsubMessages?.();
      unsubCalendar?.();
      unsubInvoices?.();
      unsubNotifications?.();

      if (didSetupSubsForUid.current === user.id) {
        didSetupSubsForUid.current = null;
      }
    };
  }, [user?.id]);

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
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

  const handleCreateProject = async (projectData: Omit<Project, 'id' | 'updates' | 'createdAt'>) => {
    if (!user) return;
    try {
      const docRef = await createProject(projectData, user.role);
      const msg = user.role === UserRole.CONTRACTOR
        ? 'Project submitted for approval!'
        : 'Project created successfully!';
      showToast(msg, 'success');
      setShowCreateProject(false);

      // Notify assigned users
      notifyProjectCreated(
        { ...projectData, id: typeof docRef === 'object' && docRef?.id ? docRef.id : '', updates: [] } as Project,
        user,
        users
      ).catch(console.error);
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
    metadata: Omit<ProjectDocument, 'id' | 'fileUrl' | 'uploadedAt' | 'fileSize'>
  ) => {
    try {
      await uploadDocument(file, metadata);
      showToast('Document uploaded successfully!', 'success');

      // Notify project members about the new document
      if (metadata.projectId && user) {
        const project = projects.find((p) => p.id === metadata.projectId);
        if (project) {
          const recipientIds = [
            ...(project.clientIds || [project.clientId]),
            ...(project.contractorIds || [project.contractorId]),
          ].filter(Boolean);
          notifyDocumentUploaded(
            metadata.title,
            project.title,
            project.id,
            user,
            recipientIds
          ).catch(console.error);
        }
      }
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

  const handleSendMessage = async (receiverId: string, content: string, projectId?: string) => {
    if (!user) return;
    try {
      await sendMessage(user.id, receiverId, content, projectId);

      // Notify the recipient
      notifyMessageReceived(receiverId, user, content, projectId).catch(console.error);
    } catch (error: any) {
      showToast(error.message || 'Failed to send message', 'error');
      throw error;
    }
  };

  const handleUpdateProjectStatus = async (projectId: string, status: any, progress: number) => {
    try {
      await updateProjectStatus(projectId, status, progress);
      showToast('Project updated!', 'success');

      // Notify project stakeholders
      const project = projects.find((p) => p.id === projectId);
      if (project && user) {
        notifyProjectStatusChanged(project, status, user, users).catch(console.error);
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to update project', 'error');
      throw error;
    }
  };

  const handleAddProjectUpdate = async (projectId: string, content: string, imageFile?: File | null) => {
    if (!user) return;
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadProjectUpdateImage(projectId, imageFile);
      }
      await addProjectUpdate(projectId, content, user.name, imageUrl);
      showToast('Update posted!', 'success');

      // Notify project stakeholders
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        notifyProjectUpdate(project, content, user, users).catch(console.error);
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to post update', 'error');
      throw error;
    }
  };

  // Milestone handlers
  const handleAddMilestone = async (projectId: string, milestone: Omit<Milestone, 'id' | 'comments'>) => {
    try {
      await addMilestone(projectId, milestone);
      showToast('Milestone added!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to add milestone', 'error');
      throw error;
    }
  };

  const handleUpdateMilestone = async (projectId: string, milestoneId: string, updates: Partial<Milestone>) => {
    try {
      await updateMilestone(projectId, milestoneId, updates);
      showToast('Milestone updated!', 'success');

      // Notify when a milestone is marked completed
      if (updates.status === 'completed' && user) {
        const project = projects.find((p) => p.id === projectId);
        const milestone = project?.milestones?.find((m) => m.id === milestoneId);
        if (project && milestone) {
          notifyMilestoneCompleted(project, milestone.title, user).catch(console.error);
        }
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to update milestone', 'error');
      throw error;
    }
  };

  const handleDeleteMilestone = async (projectId: string, milestoneId: string) => {
    try {
      await deleteMilestone(projectId, milestoneId);
      showToast('Milestone deleted!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete milestone', 'error');
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
      const project = projects.find((p) => p.id === projectId);
      const milestone = project?.milestones?.find((m) => m.id === milestoneId);
      if (milestone) {
        const currentImages = milestone.imageUrls || [];
        await updateMilestone(projectId, milestoneId, {
          imageUrls: [...currentImages, url],
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
    setSelectedInvoice(null);
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
  const handleCreateCalendarEvent = async (eventData: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
    try {
      await createCalendarEvent(eventData);
      showToast('Event created!', 'success');

      // Notify attendees
      if (user && eventData.attendeeIds?.length) {
        notifyEventCreated(
          eventData.title,
          eventData.date || '',
          user,
          eventData.attendeeIds
        ).catch(console.error);
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to create event', 'error');
      throw error;
    }
  };

  const handleUpdateCalendarEvent = async (eventId: string, updates: Partial<CalendarEvent>) => {
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

  // ============ INVOICE HANDLERS ============

  const handleCreateInvoice = async (data: CreateInvoiceData, publish: boolean) => {
    if (!user) return;
    try {
      await createInvoice(data, user.id, publish);
      showToast(publish ? 'Invoice sent!' : 'Invoice saved as draft', 'success');
      setShowCreateInvoice(false);
    } catch (error: any) {
      showToast(error.message || 'Failed to create invoice', 'error');
      throw error;
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setCurrentView('invoice-payment');
  };

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      await publishInvoice(invoiceId);
      showToast('Invoice sent!', 'success');

      // Notify the client about the invoice
      if (user) {
        const invoice = invoices.find((inv) => inv.id === invoiceId);
        if (invoice) {
          const clientId = invoice.clientId || (invoice.clientIds?.[0]);
          if (clientId) {
            const { formatCurrency } = await import('./services/invoices');
            notifyInvoiceSent(
              invoice.invoiceNumber || invoiceId,
              invoiceId,
              formatCurrency(invoice.totalAmount || 0),
              clientId,
              user
            ).catch(console.error);
          }
        }
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to send invoice', 'error');
    }
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    try {
      await cancelInvoice(invoiceId);
      showToast('Invoice cancelled', 'info');
    } catch (error: any) {
      showToast(error.message || 'Failed to cancel invoice', 'error');
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      await deleteInvoice(invoiceId);
      showToast('Invoice deleted', 'info');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete invoice', 'error');
    }
  };

  const handleRefreshOverdue = async () => {
    try {
      const count = await updateOverdueInvoices();
      if (count > 0) {
        showToast(`Updated ${count} overdue invoices`, 'info');
      } else {
        showToast('All invoices are up to date', 'success');
      }
    } catch (error: any) {
      showToast('Failed to update overdue invoices', 'error');
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-care-orange mx-auto mb-4" />
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
      case 'invoice-payment': {
        // Get the latest invoice data from state
        const currentInvoice = selectedInvoice
          ? invoices.find((inv) => inv.id === selectedInvoice.id) || selectedInvoice
          : null;

        if (!currentInvoice) {
          setCurrentView('invoices');
          return null;
        }

        return (
          <InvoicePaymentPage
            invoice={currentInvoice}
            currentUser={user}
            users={users}
            projects={projects}
            onBack={() => {
              setSelectedInvoice(null);
              setCurrentView('invoices');
            }}
            onPaymentSuccess={() => {
              showToast('Payment successful!', 'success');
            }}
          />
        );
      }

      case 'project-details':
      case 'project-timeline': {
        if (!selectedProject) {
          setCurrentView('dashboard');
          return null;
        }
        const currentProject = projects.find((p) => p.id === selectedProject.id) || selectedProject;

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handleBackToProjects}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-care-orange transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Projects
              </button>

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

            {projectViewMode === 'timeline' ? (
              <ProjectTimeline
                project={currentProject}
                currentUser={user}
                milestones={currentProject.milestones || []}
                onAddMilestone={(milestone) => handleAddMilestone(currentProject.id, milestone)}
                onUpdateMilestone={(milestoneId, updates) =>
                  handleUpdateMilestone(currentProject.id, milestoneId, updates)
                }
                onDeleteMilestone={(milestoneId) => handleDeleteMilestone(currentProject.id, milestoneId)}
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
            projects={projects}
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
            projects={projects}
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

      case 'invoices':
        return (
          <InvoicesPage
            invoices={invoices}
            currentUser={user}
            users={users}
            projects={projects}
            onCreateInvoice={() => setShowCreateInvoice(true)}
            onViewInvoice={handleViewInvoice}
            onSendInvoice={handleSendInvoice}
            onCancelInvoice={handleCancelInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onRefreshOverdue={handleRefreshOverdue}
          />
        );

      case 'budget':
        return (
          <BudgetCalculator
            projects={projects}
            users={users}
            currentUser={user}
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
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 z-30">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl hover:bg-care-orange/10 transition-colors"
        >
          <Menu size={24} />
        </button>
        <img src="/care.png" alt="Care Construction" className="h-8" />
        <NotificationBell
          notifications={notifications}
          currentUserId={user.id}
          onNavigate={(view, entityId) => {
            if (view === 'project-details' && entityId) {
              const project = projects.find((p) => p.id === entityId);
              if (project) handleSelectProject(project);
            } else {
              handleNavigate(view);
            }
          }}
        />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        currentUser={user}
        activeTab={currentView}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 pt-16 lg:pt-0 overflow-y-auto">
        {/* Desktop top bar with notification bell */}
        <div className="hidden lg:flex items-center justify-end gap-2 px-8 py-3 border-b border-gray-100 bg-white sticky top-0 z-20">
          <NotificationBell
            notifications={notifications}
            currentUserId={user.id}
            onNavigate={(view, entityId) => {
              if (view === 'project-details' && entityId) {
                const project = projects.find((p) => p.id === entityId);
                if (project) handleSelectProject(project);
              } else {
                handleNavigate(view);
              }
            }}
          />
          <div className="flex items-center gap-2 pl-3 ml-3 border-l border-gray-100">
            <div className="h-8 w-8 rounded-full bg-care-orange/10 flex items-center justify-center">
              <span className="text-xs font-semibold text-care-orange">
                {user.name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <span className="text-xs font-medium text-gray-700">{user.name}</span>
          </div>
        </div>

        <main className="flex-1 px-4 lg:px-8 py-8">
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

      {/* Create Invoice Modal */}
      {showCreateInvoice && (
        <CreateInvoiceModal
          isOpen={showCreateInvoice}
          onClose={() => setShowCreateInvoice(false)}
          currentUser={user}
          users={users}
          projects={projects}
          onCreateInvoice={handleCreateInvoice}
        />
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-[200] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg
              animate-in slide-in-from-right duration-300
              ${toast.type === 'success' ? 'bg-care-orange text-white' : ''}
              ${toast.type === 'error' ? 'bg-[#1A1A1A] text-white' : ''}
              ${toast.type === 'info' ? 'bg-white text-[#1A1A1A] border border-care-orange' : ''}
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