
import React from 'react';
import { Project, User, UserRole } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, Briefcase, CheckCircle, Clock, Plus } from 'lucide-react';
import CalendarModule from './CalendarModule';

interface DashboardAdminProps {
  projects: Project[];
  users: User[];
  onSelectProject: (p: Project) => void;
  onOpenCreateModal: () => void;
}

const DashboardAdmin: React.FC<DashboardAdminProps> = ({ 
  projects, 
  users, 
  onSelectProject,
  onOpenCreateModal
}) => {
  const contractors = users.filter(u => u.role === UserRole.CONTRACTOR);
  const clients = users.filter(u => u.role === UserRole.CLIENT);
  
  const stats = [
    { label: 'Total Projects', value: projects.length, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Contractors', value: contractors.length, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Active Clients', value: clients.length, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Completed', value: projects.filter(p => p.progress === 100).length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  const chartData = projects.map(p => ({
    name: p.title.split('-')[0].trim(),
    progress: p.progress
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Admin Overview</h1>
          <p className="text-gray-500">Global status and reporting</p>
        </div>
        <button 
          onClick={onOpenCreateModal}
          className="bg-care-orange text-white px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:shadow-lg hover:shadow-care-orange/20 transition-all active:scale-95"
        >
          <Plus size={18} />
          Create New Project
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-3xl font-black mt-2 text-gray-900">{stat.value}</p>
              </div>
              <div className={`${stat.bg} ${stat.color} p-3 rounded-xl`}>
                <stat.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-8">Project Portfolio Progress</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" fontSize={10} fontWeight="bold" tick={{ fill: '#999' }} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} fontWeight="bold" tick={{ fill: '#999' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#f8f8f8' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="progress" radius={[6, 6, 0, 0]} barSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.progress > 80 ? '#22c55e' : '#F15A2B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <section>
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Operations Calendar</h2>
            <CalendarModule role={UserRole.ADMIN} />
          </section>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit sticky top-24">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Recent Site Activity</h2>
          <div className="space-y-4">
            {projects.slice(0, 5).map(p => (
              <div 
                key={p.id} 
                onClick={() => onSelectProject(p)}
                className="group flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl cursor-pointer transition-all border-2 border-transparent hover:border-care-orange/10"
              >
                <div className="w-12 h-12 bg-care-orange/10 flex items-center justify-center rounded-xl text-care-orange group-hover:scale-110 transition-transform">
                  <Briefcase size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black truncate text-gray-900">{p.title}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{p.status}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-care-orange">{p.progress}%</span>
                  <div className="w-8 h-1 bg-gray-100 rounded-full mt-1">
                    <div className="h-full bg-care-orange rounded-full" style={{ width: `${p.progress}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardAdmin;
