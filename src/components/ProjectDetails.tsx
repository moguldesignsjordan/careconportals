import React, { useMemo, useState } from 'react';
import {
  Project,
  User,
  ProjectStatus,
  UserRole,
} from '../types';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  User as UserIcon,
  MessageSquare,
  Clock,
  Edit3,
} from 'lucide-react';

interface ProjectDetailsProps {
  project: Project;
  users: User[];
  currentUser: User;
  onBack: () => void;
  onUpdateStatus: (
    projectId: string,
    status: ProjectStatus,
    progress: number
  ) => Promise<void>;
  onAddUpdate: (projectId: string, content: string) => Promise<void>;
  onMessage: (user: User) => void;
}

const statusOptions: ProjectStatus[] = [
  ProjectStatus.PLANNING,
  ProjectStatus.DEMOLITION,
  ProjectStatus.ROUGH_IN,
  ProjectStatus.FINISHING,
  ProjectStatus.COMPLETED,
  ProjectStatus.ON_HOLD,
];

const getStatusBadgeClasses = (status: ProjectStatus) => {
  switch (status) {
    case ProjectStatus.COMPLETED:
      return 'bg-[#1A1A1A] text-white';
    case ProjectStatus.ON_HOLD:
      return 'bg-[#FDEEE9] text-[#1A1A1A] border border-dashed border-care-orange';
    default:
      return 'bg-care-orange/10 text-care-orange';
  }
};

const ProjectDetails: React.FC<ProjectDetailsProps> = ({
  project,
  users,
  currentUser,
  onBack,
  onUpdateStatus,
  onAddUpdate,
  onMessage,
}) => {
  const [tempStatus, setTempStatus] = useState<ProjectStatus>(project.status);
  const [tempProgress, setTempProgress] = useState<number>(project.progress);
  const [updateContent, setUpdateContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [postingUpdate, setPostingUpdate] = useState(false);

  const client = useMemo(
    () => users.find((u) => u.id === project.clientId),
    [users, project.clientId],
  );
  const contractor = useMemo(
    () => users.find((u) => u.id === project.contractorId),
    [users, project.contractorId],
  );

  const canEdit =
    currentUser.role === UserRole.ADMIN ||
    currentUser.id === project.contractorId;

  const handleSaveStatus = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      await onUpdateStatus(project.id, tempStatus, tempProgress);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitUpdate = async () => {
    if (!updateContent.trim()) return;
    setPostingUpdate(true);
    try {
      await onAddUpdate(project.id, updateContent.trim());
      setUpdateContent('');
    } finally {
      setPostingUpdate(false);
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return 'Not set';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
  };

  const updates = (project.updates || []).slice().sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-all hover:border-care-orange/50 hover:text-care-orange"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">
              Project
            </p>
            <h1 className="mt-1 text-xl font-black text-[#1A1A1A] md:text-2xl">
              {project.title}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={[
              'rounded-full px-3 py-1 text-xs font-semibold',
              getStatusBadgeClasses(project.status),
            ].join(' ')}
          >
            {project.status}
          </span>
          <span className="rounded-full bg-[#FDEEE9] px-3 py-1 text-xs font-semibold text-care-orange">
            {project.progress}% complete
          </span>
        </div>
      </div>

      {/* Top summary */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-gray-400">
              Overview
            </h2>
            {project.description && (
              <p className="mt-3 text-sm text-gray-600">
                {project.description}
              </p>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1 text-sm">
                <p className="text-xs font-semibold text-gray-500">
                  <Calendar className="mr-1 inline-block h-3 w-3" />
                  Start date
                </p>
                <p className="text-[#1A1A1A]">{formatDate(project.startDate)}</p>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-xs font-semibold text-gray-500">
                  <Calendar className="mr-1 inline-block h-3 w-3" />
                  Estimated completion
                </p>
                <p className="text-[#1A1A1A]">
                  {formatDate(project.estimatedEndDate)}
                </p>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-xs font-semibold text-gray-500">
                  <DollarSign className="mr-1 inline-block h-3 w-3" />
                  Budget
                </p>
                <p className="text-[#1A1A1A]">
                  ${project.budget.toLocaleString()}
                </p>
                <p className="text-[11px] text-gray-500">
                  Spent ${project.spent.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Updates */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.18em] text-gray-400">
                  Site updates
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Log progress notes and milestones.
                </p>
              </div>
            </div>

            {updates.length === 0 ? (
              <p className="text-sm text-gray-500">
                No updates yet. Be the first to post a progress note.
              </p>
            ) : (
              <ul className="space-y-3">
                {updates.map((update) => (
                  <li
                    key={update.id}
                    className="flex items-start gap-3 rounded-xl bg-[#FDEEE9]/40 px-3 py-3"
                  >
                    <div className="mt-1 h-2 w-2 rounded-full bg-care-orange" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500">
                        {update.author}{' '}
                        <span className="text-[10px] text-gray-400">
                          {new Date(update.timestamp).toLocaleString()}
                        </span>
                      </p>
                      <p className="text-sm text-[#1A1A1A]">
                        {update.content}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {canEdit && (
              <div className="mt-4 space-y-2 rounded-2xl border border-dashed border-gray-200 bg-[#FDEEE9]/30 p-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                  <Edit3 size={14} className="text-care-orange" />
                  Post an update
                </label>
                <textarea
                  value={updateContent}
                  onChange={(e) => setUpdateContent(e.target.value)}
                  rows={3}
                  placeholder="Add a quick note about today’s progress..."
                  className="w-full resize-none rounded-xl border border-gray-200 bg-white p-2 text-sm text-[#1A1A1A] outline-none focus:border-care-orange/70"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSubmitUpdate}
                    disabled={postingUpdate || !updateContent.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-care-orange px-3 py-1.5 text-xs font-semibold text-white transition-all hover:shadow-md hover:shadow-care-orange/30 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    {postingUpdate && (
                      <Clock size={12} className="animate-spin" />
                    )}
                    Post update
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-4">
          {/* Status & progress */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-gray-400">
              Status & progress
            </h2>

            <div className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">
                  Status
                </label>
                <select
                  value={tempStatus}
                  onChange={(e) =>
                    setTempStatus(e.target.value as ProjectStatus)
                  }
                  disabled={!canEdit}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-care-orange/70 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Completion</span>
                  <span className="font-semibold text-care-orange">
                    {tempProgress}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={tempProgress}
                  onChange={(e) => setTempProgress(Number(e.target.value))}
                  disabled={!canEdit}
                  className="w-full accent-care-orange disabled:cursor-not-allowed"
                />
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={handleSaveStatus}
                  disabled={saving}
                  className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-care-orange px-3 py-2 text-xs font-semibold text-white transition-all hover:shadow-md hover:shadow-care-orange/30 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                >
                  {saving && <Clock size={12} className="animate-spin" />}
                  Save changes
                </button>
              )}
            </div>
          </div>

          {/* People */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-gray-400">
              People
            </h2>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-care-orange/20 text-xs font-bold text-care-orange">
                    <UserIcon size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500">
                      Client
                    </p>
                    <p className="text-sm font-semibold text-[#1A1A1A]">
                      {client?.name || 'Not assigned'}
                    </p>
                  </div>
                </div>
                {client && (
                  <button
                    type="button"
                    onClick={() => onMessage(client)}
                    className="inline-flex items-center gap-1 rounded-xl bg-care-orange px-2.5 py-1.5 text-[11px] font-semibold text-white hover:shadow-md hover:shadow-care-orange/30"
                  >
                    <MessageSquare size={12} />
                    Message
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-care-orange/20 text-xs font-bold text-care-orange">
                    <UserIcon size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500">
                      Contractor
                    </p>
                    <p className="text-sm font-semibold text-[#1A1A1A]">
                      {contractor?.name || 'Not assigned'}
                    </p>
                  </div>
                </div>
                {contractor && (
                  <button
                    type="button"
                    onClick={() => onMessage(contractor)}
                    className="inline-flex items-center gap-1 rounded-xl bg-care-orange px-2.5 py-1.5 text-[11px] font-semibold text-white hover:shadow-md hover:shadow-care-orange/30"
                  >
                    <MessageSquare size={12} />
                    Message
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProjectDetails;
