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
  MessageSquare,
} from 'lucide-react';
import ProjectCard from './EnhancedProjectCard';

interface DashboardAdminProps {
  projects: Project[];
  users: User[];
  onSelectProject: (p: Project) => void;
  onOpenCreateModal: () => void;
  onOpenCreateClientModal: () => void;
  onOpenCreateContractorModal: () => void;
  onOpenMessages: () => void; // 👈 NEW
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
  const contractors = users.filter((u) => u.role === UserRole.CONTRACTOR);
  const clients = users.filter((u) => u.role === UserRole.CLIENT);
  const activeProjects = projects.filter((p) => p.progress < 100);
  const completedProjects = projects.filter((p) => p.progress === 100);

  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalSpent = projects.reduce((sum, p) => sum + (p.spent || 0), 0);
  const remaining = Math.max(totalBudget - totalSpent, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-[0.25em]">
            Care Construction · Admin
          </p>
          <h1 className="mt-2 text-2xl md:text-3xl font-black text-gray-900">
            Project Control Center
          </h1>
          <p className="mt-2 text-sm text-gray-500 max-w-xl">
            Track every job, manage your team, and keep homeowners updated in one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-care-orange text-white text-xs font-bold shadow-sm hover:shadow-md hover:bg-care-orange/90 transition-all active:scale-95"
          >
            <Plus size={16} />
            New Project
          </button>
          <button
            onClick={onOpenCreateClientModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FDEEE9] text-gray-900 text-xs font-bold border border-care-orange/40 hover:bg-care-orange/10 transition-all"
          >
            <UserPlus size={16} className="text-care-orange" />
            New Client
          </button>
          <button
            onClick={onOpenCreateContractorModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FDEEE9] text-gray-900 text-xs font-bold border border-care-orange/40 hover:bg-care-orange/10 transition-all"
          >
            <HardHat size={16} className="text-care-orange" />
            New Contractor
          </button>
          <button
            onClick={onOpenMessages}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:border-care-orange hover:bg-care-orange/5 transition-all"
          >
            <MessageSquare size={16} className="text-care-orange" />
            Messages
          </button>
        </div>
      </header>

      {/* Stat cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Active Projects
            </p>
            <p className="mt-2 text-2xl font-black text-gray-900">
              {activeProjects.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Currently in progress</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-care-orange/10 flex items-center justify-center text-care-orange">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Completed
            </p>
            <p className="mt-2 text-2xl font-black text-gray-900">
              {completedProjects.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Jobs wrapped up</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FDEEE9] flex items-center justify-center text-care-orange">
            <CheckCircle size={18} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Clients
            </p>
            <p className="mt-2 text-2xl font-black text-gray-900">
              {clients.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Homeowners on the platform
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FDEEE9] flex items-center justify-center text-care-orange">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Contractors
            </p>
            <p className="mt-2 text-2xl font-black text-gray-900">
              {contractors.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Field crews and subs
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FDEEE9] flex items-center justify-center text-care-orange">
            <HardHat size={18} />
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">
              Projects
            </h2>
            {projects.length > 0 && (
              <span className="text-xs font-medium text-gray-500">
                Showing {Math.min(projects.length, 6)} of {projects.length}
              </span>
            )}
          </div>

          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.slice(0, 6).map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => onSelectProject(project)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FDEEE9] text-care-orange mb-4">
                <Briefcase size={22} />
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">
                No projects yet
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Start by creating your first project and inviting your client and
                contractor.
              </p>
              <button
                onClick={onOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-care-orange text-white text-xs font-bold shadow-sm hover:shadow-md hover:bg-care-orange/90 transition-all active:scale-95"
              >
                <Plus size={16} />
                Create project
              </button>
            </div>
          )}
        </div>

        {/* Side column */}
        <div className="space-y-4">
          {/* Budget summary */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">
              Budget Overview
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">
                  Total Budgeted
                </span>
                <span className="text-sm font-black text-gray-900">
                  ${totalBudget.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">
                  Spent So Far
                </span>
                <span className="text-sm font-black text-care-orange">
                  ${totalSpent.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">
                  Remaining
                </span>
                <span className="text-sm font-black text-gray-900">
                  ${remaining.toLocaleString()}
                </span>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Overall Spend</span>
                  <span>
                    {totalBudget > 0
                      ? `${Math.round((totalSpent / totalBudget) * 100)}% of budget`
                      : 'No budgets set'}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-care-orange rounded-full transition-all"
                    style={{
                      width:
                        totalBudget > 0
                          ? `${Math.min(
                              100,
                              Math.round((totalSpent / totalBudget) * 100),
                            )}%`
                          : '0%',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">
              Quick Actions
            </h2>
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
                  <p className="text-xs text-gray-500">
                    Create a new project and assign a client and contractor.
                  </p>
                </div>
              </button>

              <button
                onClick={onOpenCreateClientModal}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-care-orange/5 transition-all text-left group"
              >
                <div className="w-10 h-10 bg-[#FDEEE9] rounded-xl flex items-center justify-center text-care-orange group-hover:bg-care-orange group-hover:text-white transition-all">
                  <Users size={18} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Add Client</p>
                  <p className="text-xs text-gray-500">
                    Create a new homeowner profile for upcoming work.
                  </p>
                </div>
              </button>

              <button
                onClick={onOpenCreateContractorModal}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-care-orange/5 transition-all text-left group"
              >
                <div className="w-10 h-10 bg-[#FDEEE9] rounded-xl flex items-center justify-center text-care-orange group-hover:bg-care-orange group-hover:text-white transition-all">
                  <HardHat size={18} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">
                    Add Contractor
                  </p>
                  <p className="text-xs text-gray-500">
                    Invite a new contractor or subcontractor onto your team.
                  </p>
                </div>
              </button>

              <button
                onClick={onOpenMessages}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-care-orange/5 transition-all text-left group"
              >
                <div className="w-10 h-10 bg-care-orange/10 rounded-xl flex items-center justify-center text-care-orange group-hover:bg-care-orange group-hover:text-white transition-all">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Open Messages</p>
                  <p className="text-xs text-gray-500">
                    Chat with clients and contractors about project details.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardAdmin;
