import React from 'react';
import { Project, User, UserRole } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, Briefcase, CheckCircle, Clock, Plus, UserPlus, HardHat, DollarSign, TrendingUp } from 'lucide-react';
import ProjectCard from './ProjectCard';

interface DashboardAdminProps {
  projects: Project[];
  users: User[];
  onSelectProject: (p: Project) => void;
  onOpenCreateModal: () => void;
  onOpenCreateClientModal: () => void;
  onOpenCreateContractorModal: () => void;
}

const DashboardAdmin: React.FC<DashboardAdminProps> = ({ 
  projects, 
  users, 
  onSelectProject,
  onOpenCreateModal,
  onOpenCreateClientModal,
  onOpenCreateContractorModal
}) => {
  const contractors = users.filter(u => u.role === UserRole.CONTRACTOR);
  const clients = users.filter(u => u.role === UserRole.CLIENT);
  const activeProjects = projects.filter(p => p.progress < 100);
  const completedProjects = projects.filter(p => p.progress === 100);
  
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalSpent = projects.reduce((sum, p) => sum + (p.spent || 0), 0);
  
  const stats = [
    { label: 'Total Projects', value: projects.length, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Contractors', value: contractors.length, icon: HardHat, color: 'text-care-orange', bg: 'bg-orange-50' },
    { label: 'Active Clients', value: clients.length, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Completed', value: completedProjects.length, icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const chartData = projects.slice(0, 6).map(p => ({
    name: p.title.length > 15 ? p.title.substring(0, 15) + '...' : p.title,
    progress: p.progress,
    budget: p.budget / 1000
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 font-medium">Global overview and management</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={onOpenCreateClientModal}
            className="bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:shadow-lg hover:shadow-green-600/20 transition-all active:scale-95"
          >
            <UserPlus size={16} />
            Add Client
          </button>
          <button 
            onClick={onOpenCreateContractorModal}
            className="bg-purple-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:shadow-lg hover:shadow-purple-600/20 transition-all active:scale-95"
          >
            <HardHat size={16} />
            Add Contractor
          </button>
          <button 
            onClick={onOpenCreateModal}
            className="bg-care-orange text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:shadow-lg hover:shadow-care-orange/20 transition-all active:scale-95"
          >
            <Plus size={16} />
            New Project
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-3xl font-black mt-2 text-gray-900">{stat.value}</p>
              </div>
              <div className={`${stat.bg} ${stat.color} p-3 rounded-xl`}>
                <stat.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-care-orange to-orange-600 p-6 rounded-2xl text-white">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={20} />
            <span className="text-xs font-black uppercase tracking-widest opacity-80">Total Budget</span>
          </div>
          <p className="text-3xl font-black">${totalBudget.toLocaleString()}</p>
          <p className="text-white/60 text-sm mt-1">Across {projects.length} projects</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl text-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={20} />
            <span className="text-xs font-black uppercase tracking-widest opacity-80">Total Spent</span>
          </div>
          <p className="text-3xl font-black">${totalSpent.toLocaleString()}</p>
          <p className="text-white/60 text-sm mt-1">{totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}% of budget used</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Chart & Projects */}
        <div className="lg:col-span-2 space-y-8">
          {/* Project Progress Chart */}
          {chartData.length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Project Progress Overview</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => [`${value}%`, 'Progress']}
                    />
                    <Bar dataKey="progress" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.progress === 100 ? '#22c55e' : '#F15A2B'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Active Projects */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Clock size={14} className="text-care-orange" />
                Active Projects ({activeProjects.length})
              </h2>
            </div>
            {activeProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeProjects.slice(0, 4).map(p => (
                  <ProjectCard key={p.id} project={p} onClick={onSelectProject} />
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
                <Briefcase size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No active projects</p>
                <button 
                  onClick={onOpenCreateModal}
                  className="mt-3 text-care-orange font-bold text-sm hover:underline"
                >
                  Create your first project →
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Right Column - Activity Feed */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Quick Actions</h2>
            <div className="space-y-3">
              <button 
                onClick={onOpenCreateModal}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-care-orange/5 transition-all text-left group"
              >
                <div className="w-10 h-10 bg-care-orange/10 rounded-xl flex items-center justify-center text-care-orange group-hover:bg-care-orange group-hover:text-white transition-all">
                  <Briefcase size={18} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">New Project</p>
                  <p className="text-xs text-gray-500">Start a construction project</p>
                </div>
              </button>
              <button 
                onClick={onOpenCreateClientModal}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 transition-all text-left group"
              >
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all">
                  <UserPlus size={18} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Add Client</p>
                  <p className="text-xs text-gray-500">Register a new client</p>
                </div>
              </button>
              <button 
                onClick={onOpenCreateContractorModal}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 transition-all text-left group"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                  <HardHat size={18} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Add Contractor</p>
                  <p className="text-xs text-gray-500">Add team member</p>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {projects.slice(0, 5).map(p => (
                <div 
                  key={p.id} 
                  onClick={() => onSelectProject(p)}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-all group"
                >
                  <div className="w-10 h-10 bg-care-orange/10 flex items-center justify-center rounded-xl text-care-orange group-hover:scale-110 transition-transform">
                    <Briefcase size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-gray-900">{p.title}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{p.status}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-care-orange">{p.progress}%</span>
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">No projects yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardAdmin;
