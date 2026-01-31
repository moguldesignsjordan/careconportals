import React from 'react';
import { Project, User } from '../types';
import {
  MapPin,
  Hammer,
  Calendar,
  TrendingUp,
  Plus,
  Clock,
  CheckCircle,
  DollarSign,
  MessageSquare,
} from 'lucide-react';
import ProjectCard from './ProjectCard';

interface DashboardContractorProps {
  projects: Project[];
  users: User[];
  currentUser: User;
  onSelectProject: (p: Project) => void;
  onOpenCreateModal: () => void;
  onOpenMessages: () => void;
}

const DashboardContractor: React.FC<DashboardContractorProps> = ({
  projects,
  users,
  currentUser,
  onSelectProject,
  onOpenCreateModal,
  onOpenMessages,
}) => {
  const myProjects = projects.filter(
    (p) => p.contractorId === currentUser.id
  );

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const inProgressCount = myProjects.filter(
    (p) => p.status === 'in-progress'
  ).length;
  const completedCount = myProjects.filter(
    (p) => p.status === 'completed'
  ).length;

  const totalBudget = myProjects.reduce(
    (sum, p) => sum + (p.budget || 0),
    0
  );
  const averageProgress =
    myProjects.length > 0
      ? Math.round(
          myProjects.reduce((sum, p) => sum + (p.progress || 0), 0) /
            myProjects.length
        )
      : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1">
            Contractor View
          </p>
          <h1 className="text-2xl font-black text-[#111827]">
            Jobs on your board today.
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            See today’s jobs, track progress, and keep clients up to date.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenMessages}
            className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold text-[#1A1A1A] flex items-center gap-2 hover:border-care-orange/60 hover:bg-care-orange/5 transition-all"
          >
            <MessageSquare size={16} className="text-care-orange" />
            Messages
          </button>

          <button
            onClick={onOpenCreateModal}
            className="bg-care-orange text-white px-5 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase flex items-center gap-2 shadow-sm hover:bg-[#e14f22] transition-all active:scale-95"
          >
            <Plus size={16} />
            New Project
          </button>
        </div>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#1A1A1A]/90 flex items-center justify-center">
            <Hammer size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em]">
              Assigned Jobs
            </p>
            <p className="text-lg font-black text-[#111827]">
              {myProjects.length}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Clock size={18} className="text-amber-500" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em]">
              In Progress
            </p>
            <p className="text-lg font-black text-[#111827]">
              {inProgressCount}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <CheckCircle size={18} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em]">
              Completed
            </p>
            <p className="text-lg font-black text-[#111827]">
              {completedCount}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center">
            <DollarSign size={18} className="text-[#1A1A1A]" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em]">
              Total Budget
            </p>
            <p className="text-lg font-black text-[#111827]">
              {totalBudget.toLocaleString(undefined, {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0,
              })}
            </p>
          </div>
        </div>
      </section>

      {/* Today + jobs */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-care-orange" />
            <p className="text-xs font-semibold text-gray-600">{today}</p>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-gray-500">
            <TrendingUp size={14} className="text-care-orange" />
            <span>{averageProgress}% average progress</span>
          </div>
        </div>

        {myProjects.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center text-xs text-gray-500">
            No jobs assigned yet. When an admin assigns you projects, they’ll appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {myProjects.map((project) => {
              const client = users.find((u) => u.id === project.clientId);
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  client={client || null}
                  onClick={() => onSelectProject(project)}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardContractor;
