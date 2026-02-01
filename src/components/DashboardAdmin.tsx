import React from 'react';
import { Project, User, UserRole, ProjectStatus } from '../types';
import {
  Users,
  Briefcase,
  CheckCircle,
  Clock,
  Plus,
  UserPlus,
  HardHat,
  DollarSign,
  TrendingUp,
  MessageSquare,
  Calendar,
} from 'lucide-react';

interface DashboardAdminProps {
  projects: Project[];
  users: User[];
  onSelectProject: (p: Project) => void;
  onOpenCreateModal: () => void;
  onOpenCreateClientModal: () => void;
  onOpenCreateContractorModal: () => void;
  onOpenMessages: () => void;
}

const DashboardAdmin: React.FC<DashboardAdminProps> = ({
  projects,
  users,
  onSelectProject,
  onOpenCreateModal,
  onOpenCreateClientModal,
  onOpenCreateContractorModal,
  onOpenMessages,
}) => {
  const clients = users.filter((u) => u.role === UserRole.CLIENT);
  const contractors = users.filter((u) => u.role === UserRole.CONTRACTOR);

  // Use enum values instead of string literals for status comparisons
  const activeProjects = projects.filter(
    (p) => p.status !== ProjectStatus.COMPLETED && p.status !== ProjectStatus.ON_HOLD
  );
  const completedProjects = projects.filter(
    (p) => p.status === ProjectStatus.COMPLETED
  );

  const totalBudget = projects.reduce(
    (sum, p) => sum + (p.budget || 0),
    0
  );
  const averageProgress =
    projects.length > 0
      ? Math.round(
          projects.reduce((sum, p) => sum + (p.progress || 0), 0) /
            projects.length
        )
      : 0;

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.PLANNING: return 'bg-blue-100 text-blue-700';
      case ProjectStatus.DEMOLITION: return 'bg-red-100 text-red-700';
      case ProjectStatus.ROUGH_IN: return 'bg-purple-100 text-purple-700';
      case ProjectStatus.FINISHING: return 'bg-orange-100 text-orange-700';
      case ProjectStatus.COMPLETED: return 'bg-green-100 text-green-700';
      case ProjectStatus.ON_HOLD: return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1">
            Admin Command Center
          </p>
          <h1 className="text-2xl font-black text-[#111827]">
            Oversee every project in one view.
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage clients, contractors, and projects from a single secure dashboard.
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
            onClick={onOpenCreateClientModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider hover:border-care-orange/40 transition-all"
          >
            <UserPlus size={16} />
            Add Client
          </button>
          <button
            onClick={onOpenCreateContractorModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider hover:border-care-orange/40 transition-all"
          >
            <HardHat size={16} />
            Add Contractor
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
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#1A1A1A]/95 flex items-center justify-center">
            <Briefcase size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em]">
              Total Projects
            </p>
            <p className="text-lg font-black text-[#111827]">
              {projects.length}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Clock size={18} className="text-amber-500" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em]">
              Active
            </p>
            <p className="text-lg font-black text-[#111827]">
              {activeProjects.length}
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
              {completedProjects.length}
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

      {/* Main content */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Team overview */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <h2 className="text-xs font-black text-[#111827] uppercase tracking-[0.18em] mb-4">
            Team Overview
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Users size={16} className="text-[#1A1A1A]" />
                </div>
                <div>
                  <p className="font-semibold text-[#111827]">Clients</p>
                  <p className="text-gray-500">{clients.length} active</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <HardHat size={16} className="text-[#1A1A1A]" />
                </div>
                <div>
                  <p className="font-semibold text-[#111827]">Contractors</p>
                  <p className="text-gray-500">{contractors.length} active</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Project list */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black text-[#111827] uppercase tracking-[0.18em]">
              Projects
            </h2>
            <p className="text-[11px] text-gray-500 flex items-center gap-1">
              <TrendingUp size={14} className="text-care-orange" />
              {averageProgress}% average progress
            </p>
          </div>
          {projects.length === 0 ? (
            <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center text-xs text-gray-500">
              No projects yet. Use "New Project" to create your first one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => onSelectProject(project)}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:border-care-orange/20 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold group-hover:text-care-orange transition-colors truncate">
                        {project.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {project.description || 'No description'}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ml-2 shrink-0 ${getStatusColor(
                        project.status
                      )}`}
                    >
                      {project.status}
                    </span>
                  </div>

                  <div className="mb-5">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Progress
                      </span>
                      <span className="text-sm font-black text-care-orange">
                        {project.progress}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-care-orange to-orange-400 transition-all duration-500 rounded-full"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Calendar size={14} className="text-care-orange" />
                      <span className="font-medium">
                        {new Date(project.estimatedEndDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <DollarSign size={14} className="text-care-orange" />
                      <span className="font-medium">
                        ${(project.budget || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DashboardAdmin;