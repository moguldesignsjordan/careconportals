import React from 'react';
import { Project, User, UserRole } from '../types';
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
} from 'lucide-react';
import ProjectCard from './ProjectCard';

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

  const activeProjects = projects.filter(
    (p) => p.status === 'in-progress' || p.status === 'planned'
  );
  const completedProjects = projects.filter(
    (p) => p.status === 'completed'
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
            onClick={onOpenMessages}
            className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold text-[#1A1A1A] flex items-center gap-2 hover:border-care-orange/60 hover:bg-care-orange/5 transition-all"
          >
            <MessageSquare size={16} className="text-care-orange" />
            Messages
          </button>

          <button
            onClick={onOpenCreateClientModal}
            className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold text-[#1A1A1A] flex items-center gap-2 hover:border-care-orange/60 hover:bg-care-orange/5 transition-all"
          >
            <UserPlus size={16} className="text-care-orange" />
            Add Client
          </button>

          <button
            onClick={onOpenCreateContractorModal}
            className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold text-[#1A1A1A] flex items-center gap-2 hover:border-care-orange/60 hover:bg-care-orange/5 transition-all"
          >
            <HardHat size={16} className="text-care-orange" />
            Add Contractor
          </button>

          <button
            onClick={onOpenCreateModal}
            className="bg-care-orange text-white px-4 py-2 rounded-xl text-xs font-black tracking-widest uppercase flex items-center gap-2 shadow-sm hover:bg-[#e14f22] transition-all active:scale-95"
          >
            <Plus size={16} />
            New Project
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

      {/* People & activity */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Clients & Contractors */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black text-[#111827] uppercase tracking-[0.18em]">
              People
            </h2>
          </div>
          <div className="space-y-3 text-xs">
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
              No projects yet. Use “New Project” to create your first one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => {
                const client = users.find((u) => u.id === project.clientId);
                const contractor = users.find(
                  (u) => u.id === project.contractorId
                );
                return (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    client={client || null}
                    contractor={contractor || null}
                    onClick={() => onSelectProject(project)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DashboardAdmin;
