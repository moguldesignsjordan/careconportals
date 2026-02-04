import React from 'react';
import { Project, User, ProjectStatus } from '../types';
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
  Hourglass,
  AlertCircle,
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

  // Handle status as string from Firebase
  const inProgressCount = myProjects.filter(
    (p) => String(p.status) === String(ProjectStatus.ROUGH_IN) || String(p.status) === String(ProjectStatus.DEMOLITION) || String(p.status) === String(ProjectStatus.FINISHING)
  ).length;
  const completedCount = myProjects.filter(
    (p) => String(p.status) === String(ProjectStatus.COMPLETED)
  ).length;

  const pendingCount = myProjects.filter(
    (p) => String(p.status) === String(ProjectStatus.PENDING_APPROVAL)
  ).length;

  // Projects the admin has rejected (still PENDING_APPROVAL but rejectionReason is set)
  const rejectedProjects = myProjects.filter(
    (p) => String(p.status) === String(ProjectStatus.PENDING_APPROVAL) && p.rejectionReason
  );

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
            See today's jobs, track progress, and keep clients up to date.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-care-orange text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-orange-600 transition-all shadow-lg shadow-care-orange/20"
          >
            <Plus size={16} />
            New Project
          </button>
          <button
            onClick={onOpenMessages}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider hover:border-care-orange/40 transition-all"
          >
            <MessageSquare size={16} />
            Messages
          </button>
        </div>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#1A1A1A]/95 flex items-center justify-center">
            <Hammer size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em]">
              My Projects
            </p>
            <p className="text-lg font-black text-[#111827]">
              {myProjects.length}
            </p>
          </div>
        </div>

        {/* ── Pending Approval (new) ── */}
        <div className={`rounded-2xl p-4 flex items-center gap-3 border ${pendingCount > 0 ? 'bg-violet-50 border-violet-200' : 'bg-white border-gray-100'}`}>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${pendingCount > 0 ? 'bg-violet-100' : 'bg-violet-50'}`}>
            <Hourglass size={18} className="text-violet-600" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em]">
              Awaiting Approval
            </p>
            <p className={`text-lg font-black ${pendingCount > 0 ? 'text-violet-700' : 'text-[#111827]'}`}>
              {pendingCount}
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

        {/* Rejection feedback banner – shown once per rejected project */}
        {rejectedProjects.map((p) => (
          <div key={p.id} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="font-black text-red-700">{p.name} – approval declined</p>
              <p className="text-red-600 mt-0.5">{p.rejectionReason}</p>
            </div>
          </div>
        ))}

        {myProjects.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center text-xs text-gray-500">
            No jobs assigned yet. When an admin assigns you projects, they'll appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {myProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => onSelectProject(project)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardContractor;