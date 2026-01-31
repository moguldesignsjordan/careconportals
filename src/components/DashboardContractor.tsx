import React from 'react';
import { Project, User } from '../types';
import ProjectCard from './ProjectCard';
import {
  MapPin,
  Hammer,
  Calendar,
  TrendingUp,
  Plus,
  Clock,
  CheckCircle,
  DollarSign,
} from 'lucide-react';

interface DashboardContractorProps {
  projects: Project[];
  users: User[];
  currentUser: User;
  onSelectProject: (p: Project) => void;
  onOpenCreateModal: () => void;
}

const DashboardContractor: React.FC<DashboardContractorProps> = ({
  projects,
  users,
  currentUser,
  onSelectProject,
  onOpenCreateModal,
}) => {
  const activeProjects = projects.filter((p) => p.progress < 100);
  const completedProjects = projects.filter((p) => p.progress === 100);
  const totalEarnings = projects.reduce(
    (sum, p) => sum + (p.budget || 0),
    0
  );
  const avgProgress =
    projects.length > 0
      ? Math.round(
          projects.reduce((sum, p) => sum + (p.progress || 0), 0) /
            projects.length
        )
      : 0;

  const getClientName = (clientId: string) => {
    const client = users.find((u) => u.id === clientId);
    return client?.name || 'Unknown Client';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A]">Field Dashboard</h1>
          <p className="text-sm text-gray-500 font-medium">
            Managing {activeProjects.length} active site
            {activeProjects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-[0.18em]">
            <Calendar size={18} className="text-care-orange" />
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </div>
          <button
            onClick={onOpenCreateModal}
            className="bg-care-orange text-white px-5 py-2.5 rounded-xl font-black text-xs tracking-[0.18em] flex items-center gap-2 hover:shadow-lg hover:shadow-care-orange/20 transition-all active:scale-95"
          >
            <Plus size={18} />
            New Project
          </button>
        </div>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-care-orange mb-2">
            <Hammer size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
              Active
            </span>
          </div>
          <p className="text-2xl font-black text-[#1A1A1A]">
            {activeProjects.length}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-care-orange mb-2">
            <CheckCircle size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
              Completed
            </span>
          </div>
          <p className="text-2xl font-black text-[#1A1A1A]">
            {completedProjects.length}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-care-orange mb-2">
            <DollarSign size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
              Total Value
            </span>
          </div>
          <p className="text-2xl font-black text-[#1A1A1A]">
            ${totalEarnings.toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-care-orange mb-2">
            <TrendingUp size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
              Avg Progress
            </span>
          </div>
          <p className="text-2xl font-black text-[#1A1A1A]">
            {avgProgress}%
          </p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-8 items-start">
        {/* Left side */}
        <div className="space-y-6">
          {/* Active sites */}
          <section>
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.18em] mb-3 flex items-center gap-2">
              <Hammer size={16} className="text-care-orange" />
              Active Sites
            </h2>

            {activeProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeProjects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onClick={onSelectProject}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white border-2 border-dashed border-gray-100 rounded-3xl p-12 text-center">
                <Hammer
                  size={48}
                  className="mx-auto text-gray-200 mb-4"
                />
                <p className="text-gray-400 font-bold">
                  No active projects assigned
                </p>
                <button
                  onClick={onOpenCreateModal}
                  className="mt-4 text-care-orange font-black uppercase text-xs tracking-[0.18em] hover:underline"
                >
                  Launch your first project →
                </button>
              </div>
            )}
          </section>

          {/* Recently completed (optional second row) */}
          {completedProjects.length > 0 && (
            <section>
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.18em] mb-3">
                Recently Completed
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedProjects.slice(0, 2).map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onClick={onSelectProject}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right side */}
        <div className="space-y-6">
          {/* Today's priorities */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.18em] mb-4">
              Today&apos;s Priorities
            </h2>
            <div className="space-y-4">
              {activeProjects.slice(0, 3).map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectProject(p)}
                  className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-all w-full text-left"
                >
                  <div className="w-10 h-10 bg-care-orange/10 rounded-xl flex items-center justify-center text-care-orange shrink-0">
                    <MapPin size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#1A1A1A] text-sm truncate">
                      {p.title}
                    </p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.16em] mt-0.5">
                      {getClientName(p.clientId)} • {p.progress}% complete
                    </p>
                  </div>
                </button>
              ))}
              {activeProjects.length === 0 && (
                <p className="text-sm text-gray-400">
                  No tasks for today.
                </p>
              )}
            </div>
          </div>

          {/* Safety card */}
          <div className="bg-[#1A1A1A] text-white rounded-3xl p-6 relative overflow-hidden shadow-lg">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/5" />
            <div className="absolute -bottom-16 -right-6 w-32 h-32 rounded-full bg-white/5" />

            <h3 className="text-xs font-black uppercase tracking-[0.18em] text-care-orange mb-3 relative z-10">
              Safety First
            </h3>
            <p className="text-sm text-gray-300 italic relative z-10 leading-relaxed">
              &quot;Quality is never an accident; it is always the result of
              high intention.&quot;
            </p>
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-[11px] text-white/70 font-bold uppercase tracking-[0.18em] relative z-10">
              ✓ Check all safety gear before work
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardContractor;
