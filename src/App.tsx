import React, { useState, useEffect } from 'react';
// Consolidated imports from local files
import { User, UserRole, Project, ProjectStatus, Document as ProjectDocument, Notification as NotificationItem } from './types';
import { Logo } from './constants';

// --- FIREBASE IMPORTS ---
import { useAuth } from './context/AuthContext';
import * as DB from './services/db';

// --- COMPONENT IMPORTS ---
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

import { 
  Menu, Bell, ArrowRight, Loader2, Briefcase, Info, CheckCheck, 
  ShieldCheck, HardHat, UserCircle, ChevronLeft, Lock, Mail
} from 'lucide-react';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.52 12.29C23.52 11.43 23.44 10.71 23.3 10H12V14.51H18.5C18.23 15.99 17.38 17.29 16.09 18.17V21.17H19.95C22.22 19.09 23.52 16.01 23.52 12.29Z" fill="#4285F4"/>
    <path d="M12 24C15.24 24 17.96 22.92 19.95 21.17L16.09 18.17C15.02 18.91 13.63 19.34 12 19.34C8.86 19.34 6.2 17.24 5.25 14.41H1.27V17.5C3.25 21.41 7.33 24 12 24Z" fill="#34A853"/>
    <path d="M5.25 14.41C5 13.68 4.86 12.87 4.86 12C4.86 11.13 5 10.32 5.25 9.59V6.5H1.27C0.46 8.13 0 9.99 0 12C0 14.01 0.46 15.87 1.27 17.5L5.25 14.41Z" fill="#FBBC05"/>
    <path d="M12 4.66C13.76 4.66 15.34 5.27 16.59 6.45L19.99 3.06C17.96 1.15 15.24 0 12 0C7.33 0 3.25 2.59 1.27 6.5L5.25 9.59C6.2 12.76 8.86 4.66 12 4.66Z" fill="#EA4335"/>
  </svg>
);

const CalendarModule: React.FC<{ role: UserRole }> = ({ role }) => (
  <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
    <h3 className="text-lg font-bold text-gray-800">Calendar Module</h3>
    <p className="text-gray-500">Coming soon for {role}.</p>
  </div>
);

const App: React.FC = () => {
  // --- REAL AUTH ---
  const { user, loading: authLoading, loginWithGoogle, loginWithEmail, signupWithEmail, logout } = useAuth();
  
  // --- LIVE DATA STATES ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [documents, setDocuments] = useState<ProjectDocument[]>([]); // Need a separate hook for this later
  
  // --- UI STATES ---
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [toasts, setToasts] = useState<NotificationItem[]>([]);

  // --- REALTIME SUBSCRIPTIONS ---
  useEffect(() => {
    if (!user) return;
    
    // Subscribe to Projects
    const unsubProjects = DB.subscribeToProjects(user, (data) => {
      setProjects(data);
    });

    // Subscribe to Users (For Directory & Assigning)
    const unsubUsers = DB.subscribeToUsers((data) => {
      setAllUsers(data);
    });

    return () => {
      unsubProjects();
      unsubUsers();
    };
  }, [user]);

  // --- NOTIFICATION SYSTEM ---
  const notify = (message: string, type: NotificationItem['type'] = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, type, timestamp: new Date().toISOString(), isRead: false, category: 'System' }]);
  };

  // --- HANDLERS ---
  const handleAuthSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedRole && !isSignUpMode) return notify("Please select a role first", "error");

    try {
      if (e) {
        // Form Submission (Email/Pass)
        const formData = new FormData(e.target as HTMLFormElement);
        const email = formData.get('email') as string;
        const pass = formData.get('password') as string;
        
        if (isSignUpMode) {
            const name = formData.get('name') as string;
            await signupWithEmail(email, pass, name, selectedRole!);
        } else {
            await loginWithEmail(email, pass);
        }
      } else {
        // Google Submission
        await loginWithGoogle(selectedRole || UserRole.CLIENT);
      }
      notify("Authenticated successfully", "success");
    } catch (error: any) {
      notify(error.message, "error");
    }
  };

  const handleCreateProject = async (data: any) => {
    try {
      await DB.createProject(data);
      notify("Project launched successfully", "success");
      setIsCreateModalOpen(false);
    } catch (e) { notify("Failed to create project", "error"); }
  };

  const handleUpdateStatus = async (id: string, status: ProjectStatus, progress: number) => {
    await DB.updateProjectStatus(id, status, progress);
    notify("Status updated", "success");
  };

  const handleAddUpdate = async (id: string, content: string) => {
    await DB.addProjectUpdate(id, content, user?.name || 'Admin');
    notify("Update posted", "success");
  };

  // --- RENDER CONTENT ---
  const renderContent = () => {
    // If selected project, ensure we have the latest version from the live 'projects' array
    const liveSelectedProject = selectedProject ? projects.find(p => p.id === selectedProject.id) || selectedProject : null;

    if (liveSelectedProject) return (
      <ProjectDetails 
        project={liveSelectedProject} 
        user={user!} 
        onBack={() => setSelectedProject(null)} 
        onUpdateStatus={handleUpdateStatus} 
        onAddUpdate={handleAddUpdate} 
        onContactLead={(leadId) => {
            const lead = allUsers.find(u => u.id === leadId);
            if (lead) { setActiveChatUser(lead); setActiveTab('messages'); setSelectedProject(null); }
        }} 
      />
    );

    switch (activeTab) {
      case 'dashboard':
        if (user!.role === UserRole.ADMIN) return <DashboardAdmin projects={projects} users={allUsers} onSelectProject={setSelectedProject} onOpenCreateModal={() => setIsCreateModalOpen(true)} />;
        if (user!.role === UserRole.CONTRACTOR) return <DashboardContractor projects={projects} onSelectProject={setSelectedProject} onOpenCreateModal={() => setIsCreateModalOpen(true)} />;
        return <DashboardClient projects={projects} onSelectProject={setSelectedProject} />;
      case 'projects':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
               <div><h1 className="text-2xl font-black uppercase tracking-tight">Active Portfolio</h1></div>
               <button onClick={() => setIsCreateModalOpen(true)} className="hidden md:flex bg-[#1A1A1A] text-white px-6 py-3 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] items-center gap-2 hover:bg-care-orange transition-all">Launch New</button>
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{projects.map(p => <ProjectCard key={p.id} project={p} onClick={setSelectedProject} />)}</div>
          </div>
        );
      case 'calendar': return <CalendarModule role={user!.role} />;
      case 'messages': return <Messaging currentUser={user!} users={allUsers} initialChatUser={activeChatUser} onClearInitialChat={() => setActiveChatUser(null)} />;
      case 'users': return <UsersDirectory users={allUsers} currentUser={user!} onMessageUser={(u) => { setActiveChatUser(u); setActiveTab('messages'); }} />;
      case 'documents': return <DocumentsTab documents={documents} currentUser={user!} onUpload={() => notify("Uploads coming in Phase 2", "info")} onDelete={() => {}} />;
      case 'settings': return <SettingsPage user={user!} onUpdateUser={() => notify("Settings coming in Phase 2", "info")} />;
      default: return null;
    }
  };

  // --- LOADING ---
  if (authLoading) return <div className="h-screen w-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-care-orange" size={48} /></div>;

  // --- LOGIN SCREEN ---
  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col md:flex-row overflow-hidden font-inter">
        {/* BRANDING SIDE */}
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
          <div className="relative z-10 flex gap-8 text-white/30 text-[10px] font-black uppercase tracking-[0.3em]"><span>Integrity</span><span>Quality</span><span>Safety</span></div>
        </div>
        
        {/* INTERACTION SIDE */}
        <div className="flex-1 flex flex-col justify-center items-center p-6 bg-gray-50 md:bg-white relative">
          <div className="md:hidden absolute top-8"><Logo /></div>
          <div className="max-w-md w-full">
            {!selectedRole ? (
               <div className="animate-in fade-in slide-in-from-left-8 duration-300">
                  <div className="mb-10 text-center md:text-left"><h1 className="text-3xl font-black text-gray-900 mb-2">Portal Access</h1><p className="text-gray-400 font-medium">Select your role to continue.</p></div>
                  <div className="space-y-4">
                    {[UserRole.ADMIN, UserRole.CONTRACTOR, UserRole.CLIENT].map((role) => (
                      <button key={role} onClick={() => setSelectedRole(role)} className="w-full group bg-white border border-gray-200 p-5 rounded-3xl flex items-center gap-5 hover:border-care-orange hover:shadow-2xl hover:shadow-care-orange/10 transition-all text-left">
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
               </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                <button onClick={() => { setSelectedRole(null); setIsSignUpMode(false); }} className="mb-8 text-gray-400 hover:text-gray-600 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors"><ChevronLeft size={14} /> Back to Roles</button>
                <div className="mb-8"><h1 className="text-3xl font-black text-gray-900 mb-2">{selectedRole} Login</h1><p className="text-gray-400 font-medium">{isSignUpMode ? 'Create your account below.' : 'Sign in to access your dashboard.'}</p></div>
                
                {isSignUpMode ? (
                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                     <div className="space-y-2"><div className="relative"><UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} /><input name="name" type="text" placeholder="Full Name" required className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-care-orange transition-colors font-medium" /></div></div>
                     <div className="space-y-2"><div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} /><input name="email" type="email" placeholder="Email Address" required className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-care-orange transition-colors font-medium" /></div></div>
                     <div className="space-y-2"><div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} /><input name="password" type="password" placeholder="Create Password" required className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-care-orange transition-colors font-medium" /></div></div>
                     <button type="submit" className="w-full bg-care-orange text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-care-orange/20 transition-all">Create Account</button>
                     <p className="text-center text-xs text-gray-400 mt-4">Already have an account? <button type="button" onClick={() => setIsSignUpMode(false)} className="text-care-orange font-bold hover:underline">Sign In</button></p>
                  </form>
                ) : (
                  <div className="space-y-4">
                     <form onSubmit={handleAuthSubmit} className="space-y-4">
                        <div className="space-y-2"><div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} /><input name="email" type="email" placeholder="Email Address" className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-care-orange transition-colors font-medium" /></div></div>
                        <div className="space-y-2"><div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} /><input name="password" type="password" placeholder="Password" className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-care-orange transition-colors font-medium" /></div></div>
                        <button type="submit" className="w-full bg-[#1A1A1A] text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:shadow-lg hover:bg-black transition-all">Sign In</button>
                     </form>
                     <div className="relative py-4"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div><div className="relative flex justify-center text-xs"><span className="px-2 bg-gray-50 md:bg-white text-gray-400">Or continue with</span></div></div>
                     <button onClick={() => handleAuthSubmit()} className="w-full bg-white border border-gray-200 p-4 rounded-2xl flex items-center justify-center gap-3 hover:border-care-orange hover:shadow-lg hover:shadow-care-orange/5 transition-all"><GoogleIcon /><span className="font-bold text-gray-700 text-sm">Google</span></button>
                     <p className="text-center text-xs text-gray-400 mt-6">Don't have an account? <button type="button" onClick={() => setIsSignUpMode(true)} className="text-care-orange font-bold hover:underline">Sign Up</button></p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <Notification notifications={toasts} onDismiss={(id) => setToasts(p => p.filter(t => t.id !== id))} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50/50 overflow-x-hidden font-inter">
      <Sidebar user={user} activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); setSelectedProject(null); setIsSidebarOpen(false); }} onLogout={logout} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className={`flex-1 transition-all duration-300 ml-0 md:ml-64`}>
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 h-16 flex items-center px-4 md:px-8 justify-between">
          <div className="flex items-center gap-3"><button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2.5 hover:bg-gray-100 rounded-2xl transition-colors"><Menu size={22} /></button><div className="md:hidden"><Logo compact /></div><span className="hidden md:block text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">{activeTab}</span></div>
          <div className="flex items-center gap-4">
            <div className="relative"><button onClick={() => setIsNotificationCenterOpen(!isNotificationCenterOpen)} className={`p-2.5 rounded-2xl transition-all relative ${isNotificationCenterOpen ? 'bg-care-orange text-white' : 'text-gray-400 hover:text-care-orange hover:bg-care-orange/5'}`}><Bell size={20} /></button></div>
            <div className="h-8 w-px bg-gray-100 mx-1 hidden md:block"></div>
            <div className="hidden md:flex items-center gap-3 pl-2"><div className="text-right"><p className="text-xs font-black uppercase text-gray-900 leading-none">{user.name.split(' ')[0]}</p><p className="text-[9px] font-black uppercase tracking-widest text-care-orange mt-1">{user.role}</p></div><div className="h-10 w-10 rounded-2xl overflow-hidden border-2 border-white shadow-sm"><img src={user.avatar} className="w-full h-full object-cover" /></div></div>
          </div>
        </header>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{renderContent()}</div>
      </main>
      {isNotificationCenterOpen && <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsNotificationCenterOpen(false)}></div>}
      <Notification notifications={toasts} onDismiss={(id) => setToasts(p => p.filter(t => t.id !== id))} />
      <CreateProjectModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} clients={allUsers.filter(u => u.role === UserRole.CLIENT)} contractors={allUsers.filter(u => u.role === UserRole.CONTRACTOR)} currentUser={user} onCreate={handleCreateProject} />
    </div>
  );
};

export default App;