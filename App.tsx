
import React, { useState, useEffect } from 'react';
import { User, UserRole, Project, ProjectStatus, Document as ProjectDocument, Notification as NotificationItem } from './types';
import { MOCK_USERS, MOCK_PROJECTS, MOCK_DOCUMENTS, Logo } from './constants';
import Sidebar from './components/Sidebar';
import DashboardAdmin from './components/DashboardAdmin';
import DashboardContractor from './components/DashboardContractor';
import DashboardClient from './components/DashboardClient';
import ProjectDetails from './components/ProjectDetails';
import Messaging from './components/Messaging';
import ProjectCard from './components/ProjectCard';
import CreateProjectModal from './components/CreateProjectModal';
import DocumentsTab from './components/DocumentsTab';
import UsersDirectory from './components/UsersDirectory';
import SettingsPage from './components/SettingsPage';
import Notification from './components/Notification';
import CalendarModule from './components/CalendarModule';
import { 
  Menu, User as UserIcon, Bell, LayoutDashboard, Briefcase, 
  MessageSquare, ShieldCheck, HardHat, UserCircle, ArrowRight, X,
  CheckCheck, Info
} from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>(MOCK_USERS);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [documents, setDocuments] = useState<ProjectDocument[]>(MOCK_DOCUMENTS);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
  
  // Notification Management
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
  const [appNotifications, setAppNotifications] = useState<NotificationItem[]>([
    { id: '1', message: 'Welcome to Care Construction Portal!', type: 'info', timestamp: new Date().toISOString(), isRead: false, category: 'System' },
    { id: '2', message: 'Project "Kitchen Remodel" reached 45% completion.', type: 'success', timestamp: new Date(Date.now() - 3600000).toISOString(), isRead: false, category: 'Update' }
  ]);

  const unreadCount = appNotifications.filter(n => !n.isRead).length;

  const notify = (message: string, type: NotificationItem['type'] = 'info', persist = true) => {
    const id = Math.random().toString(36).substring(7);
    const newNotif: NotificationItem = { 
      id, 
      message, 
      type, 
      timestamp: new Date().toISOString(), 
      isRead: false,
      category: 'System'
    };
    
    setToasts(prev => [...prev, newNotif]);
    if (persist) {
      setAppNotifications(prev => [newNotif, ...prev]);
    }
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(n => n.id !== id));
  };

  const markAllAsRead = () => {
    setAppNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    notify("Notifications cleared", "info", false);
  };

  const simulateApi = async <T,>(action: () => T, errorMessage: string): Promise<T | null> => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const result = action();
      setLoading(false);
      return result;
    } catch (error) {
      notify(errorMessage, 'error', false);
      setLoading(false);
      return null;
    }
  };

  const handleLogin = async (role: UserRole) => {
    const mockUser = await simulateApi(() => allUsers.find(u => u.role === role), "Authentication error.");
    if (mockUser) {
      setUser(mockUser);
      notify(`Welcome back, ${mockUser.name}`, 'success');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedProject(null);
    setActiveTab('dashboard');
    setIsSidebarOpen(false);
    setActiveChatUser(null);
    notify("Logged out successfully", "info", false);
  };

  const handleMessageUser = (targetUser: User) => {
    setActiveChatUser(targetUser);
    setActiveTab('messages');
    setSelectedProject(null);
  };

  const updateProjectProgress = async (projectId: string, status: ProjectStatus, progress: number) => {
    await simulateApi(() => {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status, progress } : p));
      if (selectedProject?.id === projectId) {
        setSelectedProject(prev => prev ? { ...prev, status, progress } : null);
      }
    }, "Update failed.");
    notify(`Progress for ${projects.find(p => p.id === projectId)?.title} updated to ${progress}%`, "success");
  };

  const handleCreateProject = async (newProjectData: Omit<Project, 'id' | 'updates'>) => {
    const success = await simulateApi(() => {
      const newProject: Project = { ...newProjectData, id: `p-${Date.now()}`, updates: [] };
      setProjects(prev => [newProject, ...prev]);
      return true;
    }, "Failed to launch project.");
    if (success) notify(`New project "${newProjectData.title}" created.`, "success");
  };

  const addProjectUpdate = async (projectId: string, content: string) => {
    if (!content.trim()) return notify("Content required", "error", false);
    await simulateApi(() => {
      const newUpdate = { id: Math.random().toString(), timestamp: new Date().toISOString(), author: user?.name || 'Unknown', content };
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, updates: [newUpdate, ...p.updates] } : p));
      if (selectedProject?.id === projectId) {
        setSelectedProject(prev => prev ? { ...prev, updates: [newUpdate, ...prev.updates] } : null);
      }
    }, "Post failed.");
    notify(`Site update added to project.`, "success");
  };

  const NotificationCenter = () => (
    <div className={`fixed top-16 right-4 md:right-8 w-80 md:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 overflow-hidden transition-all duration-300 transform origin-top-right ${isNotificationCenterOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}>
      <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
        <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Activity Feed</h3>
        <button onClick={markAllAsRead} className="text-[10px] font-black uppercase tracking-widest text-care-orange hover:underline flex items-center gap-1">
          <CheckCheck size={12} /> Mark all read
        </button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {appNotifications.length > 0 ? (
          appNotifications.map(n => (
            <div key={n.id} className={`p-4 border-b border-gray-50 flex gap-4 hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-care-orange/5' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                n.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {n.type === 'success' ? <Briefcase size={16} /> : <Info size={16} />}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-800 leading-snug">{n.message}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {n.category}</p>
              </div>
              {!n.isRead && <div className="w-2 h-2 bg-care-orange rounded-full mt-1 shrink-0"></div>}
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-gray-400">
            <Bell size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm italic">All quiet for now...</p>
          </div>
        )}
      </div>
      <div className="p-4 bg-gray-50 text-center">
         <button onClick={() => setIsNotificationCenterOpen(false)} className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-gray-600 transition-colors">Close Feed</button>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col md:flex-row overflow-hidden font-inter">
        <div className="relative hidden md:flex md:w-1/2 bg-[#1A1A1A] p-12 flex-col justify-between overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#F15A2B_0%,transparent_70%)] opacity-30"></div>
            <img src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=2070" alt="Construction" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay grayscale" />
          </div>
          <div className="relative z-10"><Logo light /></div>
          <div className="relative z-10 max-w-lg">
            <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-6">Building <span className="text-care-orange">Excellence</span></h2>
            <p className="text-lg lg:text-xl text-white/60 font-light leading-relaxed">Modern construction management with absolute transparency.</p>
          </div>
          <div className="relative z-10 flex gap-8 text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">
            <span>Integrity</span><span>Quality</span><span>Safety</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center p-6 bg-gray-50 md:bg-white relative">
          <div className="md:hidden absolute top-8"><Logo /></div>
          <div className="max-w-md w-full">
            <div className="mb-10 text-center md:text-left">
               <h1 className="text-3xl font-black text-gray-900 mb-2">Portal Access</h1>
               <p className="text-gray-400 font-medium">Please sign in to your role-based workspace.</p>
            </div>
            <div className="space-y-4">
              {[UserRole.ADMIN, UserRole.CONTRACTOR, UserRole.CLIENT].map((role) => (
                <button key={role} onClick={() => handleLogin(role)} className="w-full group bg-white border border-gray-200 p-5 rounded-3xl flex items-center gap-5 hover:border-care-orange hover:shadow-2xl hover:shadow-care-orange/10 transition-all text-left">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-care-orange/10 group-hover:text-care-orange transition-colors">
                    {role === UserRole.ADMIN ? <ShieldCheck size={28} /> : role === UserRole.CONTRACTOR ? <HardHat size={28} /> : <UserCircle size={28} />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-gray-900 group-hover:text-care-orange transition-colors">{role === UserRole.ADMIN ? 'Management' : role === UserRole.CONTRACTOR ? 'Field Operations' : 'Client Access'}</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{role} Workspace</p>
                  </div>
                  <ArrowRight size={20} className="text-gray-200 group-hover:text-care-orange transition-all" />
                </button>
              ))}
            </div>
            <div className="mt-12">
               <button className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
                 <img src="https://www.svgrepo.com/show/475656/google_color.svg" className="w-5 h-5" alt="G" /> Sign in with Google
               </button>
               <div className="mt-8 text-center"><a href="https://caregencon.com" className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 hover:text-care-orange transition-colors">caregencon.com</a></div>
            </div>
          </div>
        </div>
        <Notification notifications={toasts} onDismiss={dismissToast} />
        {loading && <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center z-[200] animate-in fade-in duration-300"><div className="w-16 h-16 border-4 border-care-orange border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(241,90,43,0.3)]"></div></div>}
      </div>
    );
  }

  const renderContent = () => {
    if (selectedProject) return (
      <ProjectDetails 
        project={selectedProject} 
        user={user} 
        onBack={() => setSelectedProject(null)} 
        onUpdateStatus={updateProjectProgress} 
        onAddUpdate={addProjectUpdate} 
        onContactLead={(leadId) => {
          const lead = allUsers.find(u => u.id === leadId);
          if (lead) handleMessageUser(lead);
        }}
      />
    );
    
    switch (activeTab) {
      case 'dashboard':
        if (user.role === UserRole.ADMIN) return <DashboardAdmin projects={projects} users={allUsers} onSelectProject={setSelectedProject} onOpenCreateModal={() => setIsCreateModalOpen(true)} />;
        if (user.role === UserRole.CONTRACTOR) return <DashboardContractor projects={projects.filter(p => p.contractorId === user.id)} onSelectProject={setSelectedProject} onOpenCreateModal={() => setIsCreateModalOpen(true)} />;
        return <DashboardClient projects={projects.filter(p => p.clientId === user.id)} onSelectProject={setSelectedProject} />;
      case 'projects':
        const filtered = user.role === UserRole.ADMIN ? projects : projects.filter(p => p.clientId === user.id || p.contractorId === user.id);
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight">Active Portfolio</h1>
                <p className="text-sm font-medium text-gray-500">Managing all construction cycles.</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(true)} className="hidden md:flex bg-[#1A1A1A] text-white px-6 py-3 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] items-center gap-2 hover:bg-care-orange transition-all">Launch New</button>
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(p => <ProjectCard key={p.id} project={p} onClick={setSelectedProject} />)}
            </div>
          </div>
        );
      case 'calendar': return (
        <div className="space-y-8 animate-in fade-in duration-500">
          <header>
            <h1 className="text-2xl font-black uppercase tracking-tight">Project Calendar</h1>
            <p className="text-sm font-medium text-gray-500">Milestones, inspections, and meetings.</p>
          </header>
          <CalendarModule role={user.role} />
        </div>
      );
      case 'messages': return <Messaging currentUser={user} users={allUsers} initialChatUser={activeChatUser} onClearInitialChat={() => setActiveChatUser(null)} />;
      case 'users': return <UsersDirectory users={allUsers} currentUser={user} onMessageUser={handleMessageUser} />;
      case 'documents': return <DocumentsTab documents={documents} currentUser={user} onUpload={(d) => simulateApi(() => setDocuments(prev => [{...d, id: `d-${Date.now()}`, uploadedAt: new Date().toISOString()}, ...prev]), "Upload failed")} onDelete={(id) => simulateApi(() => setDocuments(prev => prev.filter(d => d.id !== id)), "Delete failed")} />;
      case 'settings': return <SettingsPage user={user} onUpdateUser={(u) => simulateApi(() => {setUser(u); setAllUsers(prev => prev.map(au => au.id === u.id ? u : au))}, "Update failed")} />;
      default: return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50/50 overflow-x-hidden font-inter">
      <Sidebar user={user} activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); setSelectedProject(null); setIsSidebarOpen(false); }} onLogout={handleLogout} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className={`flex-1 transition-all duration-300 ml-0 md:ml-64`}>
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 h-16 flex items-center px-4 md:px-8 justify-between">
          <div className="flex items-center gap-3">
             <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2.5 hover:bg-gray-100 rounded-2xl transition-colors"><Menu size={22} /></button>
             <div className="md:hidden"><Logo compact /></div>
             <span className="hidden md:block text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">{activeTab}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationCenterOpen(!isNotificationCenterOpen)} 
                className={`p-2.5 rounded-2xl transition-all relative ${isNotificationCenterOpen ? 'bg-care-orange text-white' : 'text-gray-400 hover:text-care-orange hover:bg-care-orange/5'}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                )}
              </button>
              <NotificationCenter />
            </div>
            <div className="h-8 w-px bg-gray-100 mx-1 hidden md:block"></div>
            <div className="hidden md:flex items-center gap-3 pl-2">
               <div className="text-right">
                  <p className="text-xs font-black uppercase text-gray-900 leading-none">{user.name.split(' ')[0]}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-care-orange mt-1">{user.role}</p>
               </div>
               <div className="h-10 w-10 rounded-2xl overflow-hidden border-2 border-white shadow-sm">
                  <img src={user.avatar} className="w-full h-full object-cover" />
               </div>
            </div>
          </div>
        </header>
        
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

      {isNotificationCenterOpen && <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsNotificationCenterOpen(false)}></div>}
      <Notification notifications={toasts} onDismiss={dismissToast} />
      <CreateProjectModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} clients={allUsers.filter(u => u.role === UserRole.CLIENT)} contractors={allUsers.filter(u => u.role === UserRole.CONTRACTOR)} currentUser={user} onCreate={handleCreateProject} />
      {loading && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center z-[200] animate-in fade-in duration-300"><div className="w-12 h-12 border-4 border-care-orange border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(241,90,43,0.5)]"></div><p className="text-white text-[10px] font-black uppercase tracking-[0.4em] mt-6 animate-pulse">Initializing Site...</p></div>}
    </div>
  );
};

export default App;
