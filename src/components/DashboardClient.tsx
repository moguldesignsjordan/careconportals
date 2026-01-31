import React from 'react';
import { Project, User, UserRole } from '../types';
import ProjectCard from './ProjectCard';
import { Sparkles, MessageSquare, FileText, CheckCircle, Clock, DollarSign, TrendingUp } from 'lucide-react';

interface DashboardClientProps {
  projects: Project[];
  users: User[];
  currentUser: User;
  onSelectProject: (p: Project) => void;
  onOpenMessages: () => void;
  onOpenDocuments: () => void;
}

const DashboardClient: React.FC<DashboardClientProps> = ({ 
  projects, 
  users,
  currentUser,
  onSelectProject,
  onOpenMessages,
  onOpenDocuments
}) => {
  const activeProjects = projects.filter(p => p.progress < 100);
  const completedProjects = projects.filter(p => p.progress === 100);
  
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalSpent = projects.reduce((sum, p) => sum + (p.spent || 0), 0);

  // Get contractor name
  const getContractorName = (contractorId: string) => {
    const contractor = users.find(u => u.id === contractorId);
    return contractor?.name || 'Unassigned';
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Welcome Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2">
            Welcome Home! <Sparkles className="text-yellow-400" size={28} />
          </h1>
          <p className="text-gray-500 text-lg mt-1">Track your construction projects in real-time</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onOpenMessages}
            className="bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-50 hover:border-care-orange/20 transition-all"
          >
            <MessageSquare size={18} className="text-care-orange" />
            Messages
          </button>
          <button 
            onClick={onOpenDocuments}
            className="bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-50 hover:border-care-orange/20 transition-all"
          >
            <FileText size={18} className="text-care-orange" />
            Documents
          </button>
        </div>
      </header>

      {/* Stats Overview */}
      {projects.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Clock size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">In Progress</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{activeProjects.length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <CheckCircle size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Completed</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{completedProjects.length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-care-orange mb-2">
              <DollarSign size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Budget</span>
            </div>
            <p className="text-2xl font-black text-gray-900">${totalBudget.toLocaleString()}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <TrendingUp size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Spent</span>
            </div>
            <p className="text-2xl font-black text-gray-900">${totalSpent.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Active Projects */}
      {activeProjects.length > 0 ? (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black flex items-center gap-2">
              Active Construction
              <span className="bg-care-orange text-white text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-black">
                Live
              </span>
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeProjects.map(p => (
              <div key={p.id} className="relative">
                <ProjectCard project={p} onClick={onSelectProject} />
                <div className="mt-2 px-2">
                  <p className="text-xs text-gray-500">
                    <span className="font-bold">Contractor:</span> {getContractorName(p.contractorId)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="bg-gradient-to-br from-care-orange/5 to-orange-50 border-2 border-dashed border-care-orange/20 rounded-3xl p-12 text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg text-care-orange">
            <Sparkles size={36} />
          </div>
          <h3 className="text-2xl font-black mb-3">Ready to Transform Your Home?</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6 leading-relaxed">
            Connect with our team to start planning your next renovation project. We'll guide you every step of the way.
          </p>
          <button 
            onClick={onOpenMessages}
            className="bg-care-orange text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-care-orange/30 transition-all"
          >
            Contact Us
          </button>
        </div>
      )}

      {/* Completed Projects */}
      {completedProjects.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-xl font-black flex items-center gap-2">
            Past Masterpieces
            <CheckCircle className="text-green-500" size={20} />
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-80 hover:opacity-100 transition-opacity">
            {completedProjects.map(p => (
              <ProjectCard key={p.id} project={p} onClick={onSelectProject} />
            ))}
          </div>
        </section>
      )}

      {/* Quick Help */}
      <div className="bg-[#1A1A1A] rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-care-orange/10 rounded-full -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <h3 className="text-xs font-black uppercase tracking-widest text-care-orange mb-3">Need Assistance?</h3>
          <p className="text-2xl font-black mb-2">We're Here to Help</p>
          <p className="text-gray-400 mb-6 max-w-lg">
            Have questions about your project? Our team is ready to assist you with any concerns.
          </p>
          <button 
            onClick={onOpenMessages}
            className="bg-care-orange text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-all flex items-center gap-2"
          >
            <MessageSquare size={16} />
            Start a Conversation
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardClient;
