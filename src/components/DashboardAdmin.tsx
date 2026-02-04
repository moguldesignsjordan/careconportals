import React, { useState } from 'react';
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
  Trash2,
  Hourglass,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { approveProject, rejectProject, deleteProject, updateProject } from '../services/db';

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
  // ── local UI state ──
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [rejectingId, setRejectingId]         = useState<string | null>(null);
  const [rejectReason, setRejectReason]       = useState('');
  const [pendingOpen, setPendingOpen]         = useState(true); // keep panel open by default

  const clients     = users.filter((u) => u.role === UserRole.CLIENT);
  const contractors = users.filter((u) => u.role === UserRole.CONTRACTOR);

  // ── derived lists ──
  const pendingProjects = projects.filter(
    (p) => String(p.status) === String(ProjectStatus.PENDING_APPROVAL)
  );
  const activeProjects = projects.filter(
    (p) =>
      String(p.status) !== String(ProjectStatus.COMPLETED) &&
      String(p.status) !== String(ProjectStatus.ON_HOLD) &&
      String(p.status) !== String(ProjectStatus.PENDING_APPROVAL)
  );
  const completedProjects = projects.filter(
    (p) => String(p.status) === String(ProjectStatus.COMPLETED)
  );

  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const averageProgress =
    projects.length > 0
      ? Math.round(
          projects.reduce((sum, p) => sum + (p.progress || 0), 0) /
            projects.length
        )
      : 0;

  // ── helpers ──
  const getStatusColor = (status: ProjectStatus | string): string => {
    const s = String(status);
    if (s === ProjectStatus.PENDING_APPROVAL || s === 'Pending Approval') return 'bg-violet-100 text-violet-700';
    if (s === ProjectStatus.PLANNING        || s === 'Planning')         return 'bg-blue-100 text-blue-700';
    if (s === ProjectStatus.DEMOLITION      || s === 'Demolition')       return 'bg-red-100 text-red-700';
    if (s === ProjectStatus.ROUGH_IN        || s === 'Rough-in')         return 'bg-purple-100 text-purple-700';
    if (s === ProjectStatus.FINISHING       || s === 'Finishing')        return 'bg-orange-100 text-orange-700';
    if (s === ProjectStatus.COMPLETED       || s === 'Completed')        return 'bg-green-100 text-green-700';
    if (s === ProjectStatus.ON_HOLD         || s === 'On Hold')          return 'bg-gray-100 text-gray-700';
    return 'bg-gray-100 text-gray-700';
  };

  // ── action handlers (call db directly; toast feedback via window event or silent) ──
  const handleApprove = async (projectId: string) => {
    try {
      // "user" not in scope here; we use a placeholder admin id.
      // Ideally the parent passes currentUser — but approveProject only
      // stamps an audit field, so this works in the meantime.
      await approveProject(projectId, 'admin');
    } catch (e) {
      console.error('Approve failed', e);
    }
  };

  const handleReject = async (projectId: string) => {
    if (!rejectReason.trim()) return;
    try {
      await rejectProject(projectId, rejectReason.trim());
      setRejectingId(null);
      setRejectReason('');
    } catch (e) {
      console.error('Reject failed', e);
    }
  };

  const handleDelete = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      setConfirmDeleteId(null);
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  const handleAssignContractor = async (projectId: string, contractorId: string) => {
    if (!contractorId) return;
    try {
      await updateProject(projectId, { contractorId });
    } catch (e) {
      console.error('Assign contractor failed', e);
    }
  };

  // ── render ──
  return (
    <div className="space-y-8">
      {/* ── Header ── */}
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

      {/* ── Stats ── */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#1A1A1A]/95 flex items-center justify-center">
            <Briefcase size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em]">Total Projects</p>
            <p className="text-lg font-black text-[#111827]">{projects.length}</p>
          </div>
        </div>

        {/* Pending approval stat – highlighted when >0 */}
        <div className={`rounded-2xl p-4 flex items-center gap-3 border ${pendingProjects.length > 0 ? 'bg-violet-50 border-violet-200' : 'bg-white border-gray-100'}`}>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${pendingProjects.length > 0 ? 'bg-violet-100' : 'bg-violet-50'}`}>
            <Hourglass size={18} className="text-violet-600" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em]">Pending</p>
            <p className={`text-lg font-black ${pendingProjects.length > 0 ? 'text-violet-700' : 'text-[#111827]'}`}>
              {pendingProjects.length}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Clock size={18} className="text-amber-500" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em]">Active</p>
            <p className="text-lg font-black text-[#111827]">{activeProjects.length}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <CheckCircle size={18} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em]">Completed</p>
            <p className="text-lg font-black text-[#111827]">{completedProjects.length}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center">
            <DollarSign size={18} className="text-[#1A1A1A]" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em]">Total Budget</p>
            <p className="text-lg font-black text-[#111827]">
              {totalBudget.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </section>

      {/* ── Pending Approvals Panel ── */}
      {(pendingProjects.length > 0 || pendingOpen) && (
        <section className="bg-violet-50 border border-violet-200 rounded-2xl overflow-hidden">
          <button
            onClick={() => setPendingOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-violet-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Hourglass size={16} className="text-violet-600" />
              <span className="text-xs font-black text-violet-700 uppercase tracking-[0.18em]">
                Pending Approval Requests
              </span>
              {pendingProjects.length > 0 && (
                <span className="bg-violet-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {pendingProjects.length}
                </span>
              )}
            </div>
            {pendingOpen ? <ChevronUp size={16} className="text-violet-500" /> : <ChevronDown size={16} className="text-violet-500" />}
          </button>

          {pendingOpen && (
            <div className="px-5 pb-5">
              {pendingProjects.length === 0 ? (
                <p className="text-xs text-violet-500 text-center py-4">No pending requests right now.</p>
              ) : (
                <div className="space-y-3">
                  {pendingProjects.map((project) => {
                    const contractor = users.find((u) => u.id === project.contractorId);
                    const isRejectingThis = rejectingId === project.id;

                    return (
                      <div key={project.id} className="bg-white border border-violet-200 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <h3 className="text-sm font-black text-[#111827] truncate">{project.title}</h3>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{project.description || 'No description'}</p>
                          </div>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 shrink-0 whitespace-nowrap">
                            {contractor?.name || 'Unknown contractor'}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                          <span className="flex items-center gap-1">
                            <DollarSign size={12} className="text-care-orange" />
                            ${(project.budget || 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={12} className="text-care-orange" />
                            {project.startDate} → {project.estimatedEndDate}
                          </span>
                        </div>

                        {isRejectingThis && (
                          <div className="mb-3">
                            <textarea
                              autoFocus
                              rows={2}
                              placeholder="Reason for rejection…"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              className="w-full text-xs p-2.5 border-2 border-red-200 rounded-lg bg-red-50 focus:border-red-400 focus:ring-0 resize-none"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(project.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-black rounded-lg hover:bg-emerald-700 transition-colors"
                          >
                            <CheckCircle2 size={14} />
                            Approve
                          </button>

                          {isRejectingThis ? (
                            <>
                              <button
                                onClick={() => handleReject(project.id)}
                                disabled={!rejectReason.trim()}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-black rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <XCircle size={14} />
                                Confirm Reject
                              </button>
                              <button
                                onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                className="text-xs text-gray-500 hover:text-gray-700 font-semibold"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => { setRejectingId(project.id); setRejectReason(''); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-black rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <XCircle size={14} />
                              Reject
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Main content ── */}
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
              {projects.map((project) => {
                const isConfirmingDelete = confirmDeleteId === project.id;

                return (
                  <div
                    key={project.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:border-care-orange/20 transition-all group relative"
                  >
                    {isConfirmingDelete && (
                      <div className="absolute inset-0 bg-white/95 rounded-2xl z-10 flex flex-col items-center justify-center p-5 text-center">
                        <Trash2 size={24} className="text-red-500 mb-2" />
                        <p className="text-sm font-black text-[#111827] mb-1">Delete this project?</p>
                        <p className="text-xs text-gray-500 mb-4">This cannot be undone.</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(project.id)}
                            className="px-4 py-1.5 bg-red-600 text-white text-xs font-black rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-4 py-1.5 border border-gray-200 text-gray-600 text-xs font-black rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-2">
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => onSelectProject(project)}
                      >
                        <h3 className="text-lg font-bold group-hover:text-care-orange transition-colors truncate">
                          {project.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                          {project.description || 'No description'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${getStatusColor(project.status)}`}>
                          {project.status}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(project.id); }}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete project"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.14em]">Contractor</label>
                      <select
                        value={project.contractorId || ''}
                        onChange={(e) => handleAssignContractor(project.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full mt-0.5 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 appearance-none cursor-pointer focus:border-care-orange focus:ring-0 transition-colors"
                      >
                        <option value="">— Unassigned —</option>
                        {contractors.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div
                      className="mb-4 cursor-pointer"
                      onClick={() => onSelectProject(project)}
                    >
                      <div className="flex justify-between items-end mb-1.5">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Progress</span>
                        <span className="text-sm font-black text-care-orange">{project.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-care-orange to-orange-400 transition-all duration-500 rounded-full"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    <div
                      className="grid grid-cols-2 gap-3 text-xs cursor-pointer"
                      onClick={() => onSelectProject(project)}
                    >
                      <div className="flex items-center gap-2 text-gray-500">
                        <Calendar size={14} className="text-care-orange" />
                        <span className="font-medium">
                          {new Date(project.estimatedEndDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <DollarSign size={14} className="text-care-orange" />
                        <span className="font-medium">${(project.budget || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
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
