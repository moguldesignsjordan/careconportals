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
  TrendingDown,
  MessageSquare,
  Calendar,
  Trash2,
  Hourglass,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Building2,
  FileText,
  ClipboardList,
  UserCheck,
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
  onNavigate?: (tab: string) => void;
}

// Stat Card Component matching BuilderMate style
interface StatCardProps {
  title: string;
  subtitle: string;
  value: string | number;
  secondaryValue?: string;
  percentChange?: number;
  percentLabel?: string;
  icon: React.ReactNode;
  onViewDetails?: () => void;
  highlight?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  subtitle,
  value,
  secondaryValue,
  percentChange,
  percentLabel,
  icon,
  onViewDetails,
  highlight = false,
}) => {
  const isPositive = percentChange !== undefined && percentChange >= 0;

  return (
    <div className={`bg-white rounded-2xl border p-5 ${highlight ? 'border-violet-200 bg-violet-50/30' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
          {icon}
        </div>
      </div>

      <div className="mb-3">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {secondaryValue && (
          <p className="text-sm text-gray-500 mt-1">{secondaryValue}</p>
        )}
      </div>

      {percentChange !== undefined && (
        <div className="flex items-center gap-1.5 mb-3">
          {isPositive ? (
            <TrendingUp size={14} className="text-emerald-500" />
          ) : (
            <TrendingDown size={14} className="text-red-500" />
          )}
          <span className={`text-sm font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{percentChange}%
          </span>
          <span className="text-sm text-gray-400">{percentLabel || 'vs last month'}</span>
        </div>
      )}

      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-care-orange transition-colors group"
        >
          <span>View details</span>
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
};

const DashboardAdmin: React.FC<DashboardAdminProps> = ({
  projects,
  users,
  onSelectProject,
  onOpenCreateModal,
  onOpenCreateClientModal,
  onOpenCreateContractorModal,
  onOpenMessages,
  onNavigate,
}) => {
  // ── local UI state ──
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [pendingOpen, setPendingOpen] = useState(true);

  const clients = users.filter((u) => u.role === UserRole.CLIENT);
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
  const totalSpent = projects.reduce((sum, p) => sum + (p.spent || 0), 0);
  const averageProgress =
    projects.length > 0
      ? Math.round(
        projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length
      )
      : 0;

  // ── helpers ──
  const getStatusColor = (status: ProjectStatus | string): string => {
    const s = String(status);
    if (s === ProjectStatus.PENDING_APPROVAL || s === 'Pending Approval') return 'bg-violet-100 text-violet-700';
    if (s === ProjectStatus.PLANNING || s === 'Planning') return 'bg-blue-100 text-blue-700';
    if (s === ProjectStatus.DEMOLITION || s === 'Demolition') return 'bg-red-100 text-red-700';
    if (s === ProjectStatus.ROUGH_IN || s === 'Rough-in') return 'bg-purple-100 text-purple-700';
    if (s === ProjectStatus.FINISHING || s === 'Finishing') return 'bg-orange-100 text-orange-700';
    if (s === ProjectStatus.COMPLETED || s === 'Completed') return 'bg-green-100 text-green-700';
    if (s === ProjectStatus.ON_HOLD || s === 'On Hold') return 'bg-gray-100 text-gray-700';
    return 'bg-gray-100 text-gray-700';
  };

  // ── action handlers ──
  const handleApprove = async (projectId: string) => {
    try {
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
      const project = projects.find((p) => p.id === projectId);
      const existing =
        project?.contractorIds && project.contractorIds.length > 0
          ? project.contractorIds
          : project?.contractorId
            ? [project.contractorId]
            : [];
      const updatedContractorIds = existing.includes(contractorId)
        ? existing
        : [...existing, contractorId];

      await updateProject(projectId, {
        contractorId: contractorId,
        contractorIds: updatedContractorIds,
      });
    } catch (e) {
      console.error('Assign contractor failed', e);
    }
  };

  const handleAssignClient = async (projectId: string, clientId: string) => {
    if (!clientId) return;
    try {
      const project = projects.find((p) => p.id === projectId);
      const existing =
        project?.clientIds && project.clientIds.length > 0
          ? project.clientIds
          : project?.clientId
            ? [project.clientId]
            : [];
      const updatedClientIds = existing.includes(clientId)
        ? existing
        : [...existing, clientId];

      await updateProject(projectId, {
        clientId: clientId,
        clientIds: updatedClientIds,
      });
    } catch (e) {
      console.error('Assign client failed', e);
    }
  };

  // ── render ──
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back! Here's what's happening with your projects.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-care-orange text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-all shadow-sm"
          >
            <Plus size={16} />
            New Project
          </button>
          <button
            onClick={onOpenCreateClientModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:border-gray-300 transition-all"
          >
            <UserPlus size={16} />
            Add Client
          </button>
          <button
            onClick={onOpenCreateContractorModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:border-gray-300 transition-all"
          >
            <HardHat size={16} />
            Add Contractor
          </button>
        </div>
      </header>

      {/* ── Stats Grid (BuilderMate Style) ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Projects"
          subtitle="Projects in progress"
          value={activeProjects.length}
          secondaryValue={`$${totalBudget.toLocaleString()}`}
          icon={<Building2 size={20} />}
          onViewDetails={() => onNavigate?.('projects')}
        />

        <StatCard
          title="Pipeline Value"
          subtitle="Last 30 days"
          value={`$${totalBudget.toLocaleString()}`}
          secondaryValue={`${projects.length} total projects`}
          percentChange={12}
          percentLabel="vs last month"
          icon={<FileText size={20} />}
          onViewDetails={() => onNavigate?.('budget')}
        />

        <StatCard
          title="Pending Approval"
          subtitle="Awaiting review"
          value={pendingProjects.length}
          secondaryValue={pendingProjects.length > 0 ? 'Requires attention' : 'All caught up'}
          icon={<Hourglass size={20} />}
          highlight={pendingProjects.length > 0}
        />

        <StatCard
          title="Team Members"
          subtitle="Active this week"
          value={clients.length + contractors.length}
          secondaryValue={`${clients.length} clients · ${contractors.length} contractors`}
          icon={<UserCheck size={20} />}
          onViewDetails={() => onNavigate?.('directory')}
        />
      </section>

      {/* ── Secondary Stats Row ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Completed"
          subtitle="Finished projects"
          value={completedProjects.length}
          secondaryValue={`${averageProgress}% avg progress`}
          percentChange={8}
          percentLabel="vs last quarter"
          icon={<CheckCircle size={20} />}
        />

        <StatCard
          title="Messages"
          subtitle="Unread conversations"
          value={0}
          secondaryValue="All caught up"
          icon={<MessageSquare size={20} />}
          onViewDetails={onOpenMessages}
        />

        <StatCard
          title="Action Items"
          subtitle="This week"
          value={pendingProjects.length}
          secondaryValue={`${pendingProjects.length} items need attention`}
          icon={<ClipboardList size={20} />}
        />
      </section>

      {/* ── Pending Approvals Panel ── */}
      {(pendingProjects.length > 0 || pendingOpen) && (
        <section className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <button
            onClick={() => setPendingOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-violet-100 flex items-center justify-center">
                <Hourglass size={16} className="text-violet-600" />
              </div>
              <div className="text-left">
                <span className="text-sm font-semibold text-gray-900">
                  Pending Approval Requests
                </span>
                {pendingProjects.length > 0 && (
                  <span className="ml-2 bg-violet-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    {pendingProjects.length}
                  </span>
                )}
                <p className="text-xs text-gray-400">Review and approve project requests</p>
              </div>
            </div>
            {pendingOpen ? (
              <ChevronUp size={18} className="text-gray-400" />
            ) : (
              <ChevronDown size={18} className="text-gray-400" />
            )}
          </button>

          {pendingOpen && (
            <div className="px-5 pb-5 border-t border-gray-100">
              {pendingProjects.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  No pending requests right now. All caught up! 🎉
                </p>
              ) : (
                <div className="space-y-3 mt-4">
                  {pendingProjects.map((project) => {
                    const contractor = users.find((u) => u.id === project.contractorId);
                    const isRejectingThis = rejectingId === project.id;

                    return (
                      <div
                        key={project.id}
                        className="bg-gray-50 border border-gray-100 rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">
                              {project.title}
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                              {project.description || 'No description'}
                            </p>
                          </div>
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 shrink-0 whitespace-nowrap">
                            {contractor?.name || 'Unknown contractor'}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                          <span className="flex items-center gap-1.5">
                            <DollarSign size={14} className="text-gray-400" />
                            ${(project.budget || 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-gray-400" />
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
                              className="w-full text-sm p-3 border border-red-200 rounded-xl bg-red-50 focus:border-red-400 focus:ring-0 resize-none"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(project.id)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
                          >
                            <CheckCircle2 size={14} />
                            Approve
                          </button>

                          {isRejectingThis ? (
                            <>
                              <button
                                onClick={() => handleReject(project.id)}
                                disabled={!rejectReason.trim()}
                                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <XCircle size={14} />
                                Confirm Reject
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingId(null);
                                  setRejectReason('');
                                }}
                                className="text-sm text-gray-500 hover:text-gray-700 font-medium px-3"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setRejectingId(project.id);
                                setRejectReason('');
                              }}
                              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
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

      {/* ── Recent Projects ── */}
      <section className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Recent Projects</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {projects.length} projects · {averageProgress}% average progress
            </p>
          </div>
          <button
            onClick={() => onNavigate?.('projects')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-care-orange transition-colors"
          >
            <span>View all</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="p-8 text-center">
            <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Briefcase size={20} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No projects yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Create your first project to get started
            </p>
            <button
              onClick={onOpenCreateModal}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-care-orange text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors"
            >
              <Plus size={14} />
              New Project
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {projects.slice(0, 5).map((project) => {
              const isConfirmingDelete = confirmDeleteId === project.id;
              const client = clients.find((c) => c.id === project.clientId);

              return (
                <div
                  key={project.id}
                  className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer relative group"
                  onClick={() => onSelectProject(project)}
                >
                  {isConfirmingDelete && (
                    <div className="absolute inset-0 bg-white/95 z-10 flex items-center justify-center gap-3 px-5">
                      <p className="text-sm font-medium text-gray-700">Delete this project?</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project.id);
                        }}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                        }}
                        className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                        <Building2 size={18} className="text-gray-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {project.title}
                          </h3>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${getStatusColor(
                              project.status
                            )}`}
                          >
                            {project.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          {client && <span>{client.name}</span>}
                          <span>${(project.budget || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-gray-900">{project.progress}%</p>
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-care-orange rounded-full transition-all duration-500"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(project.id);
                        }}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                      <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Quick Actions Grid ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={onOpenMessages}
          className="bg-white border border-gray-100 rounded-2xl p-4 text-left hover:border-care-orange/30 hover:shadow-sm transition-all group"
        >
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
            <MessageSquare size={18} className="text-blue-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Messages</h3>
          <p className="text-xs text-gray-400 mt-0.5">View conversations</p>
        </button>

        <button
          onClick={() => onNavigate?.('calendar')}
          className="bg-white border border-gray-100 rounded-2xl p-4 text-left hover:border-care-orange/30 hover:shadow-sm transition-all group"
        >
          <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3 group-hover:bg-purple-100 transition-colors">
            <Calendar size={18} className="text-purple-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Calendar</h3>
          <p className="text-xs text-gray-400 mt-0.5">View schedule</p>
        </button>

        <button
          onClick={() => onNavigate?.('invoices')}
          className="bg-white border border-gray-100 rounded-2xl p-4 text-left hover:border-care-orange/30 hover:shadow-sm transition-all group"
        >
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3 group-hover:bg-emerald-100 transition-colors">
            <DollarSign size={18} className="text-emerald-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Invoices</h3>
          <p className="text-xs text-gray-400 mt-0.5">Manage billing</p>
        </button>

        <button
          onClick={() => onNavigate?.('directory')}
          className="bg-white border border-gray-100 rounded-2xl p-4 text-left hover:border-care-orange/30 hover:shadow-sm transition-all group"
        >
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3 group-hover:bg-amber-100 transition-colors">
            <Users size={18} className="text-amber-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Directory</h3>
          <p className="text-xs text-gray-400 mt-0.5">View team members</p>
        </button>
      </section>
    </div>
  );
};

export default DashboardAdmin;