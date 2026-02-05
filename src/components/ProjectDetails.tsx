import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  CheckCircle,
  Clock,
  MessageSquare,
  FileText,
  Users as UsersIcon,
  X as XIcon,
} from 'lucide-react';
import {
  Project,
  User,
  ProjectStatus,
  UserRole,
  ProjectUpdate,
} from '../types';
import {
  updateProject,
  addContractorToProject,
  removeContractorFromProject,
  setPrimaryContractor,
} from '../services/db';
import ProjectDocumentsPanel from './ProjectDocumentsPanel';

/* ────────────────────────────────────────────────────────────── */
/* Inline editable helpers (no boxes, click-to-edit, auto-save) */
/* ────────────────────────────────────────────────────────────── */

interface InlineEditableProps {
  value?: string | number;
  placeholder?: string;
  canEdit: boolean;
  className?: string;
  onSave: (next: string) => Promise<void> | void;
}

const InlineEditableText: React.FC<
  InlineEditableProps & { multiline?: boolean }
> = ({ value, placeholder, canEdit, className, onSave, multiline }) => {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value ? String(value) : '');

  useEffect(() => {
    setLocal(value ? String(value) : '');
  }, [value]);

  const handleBlur = async () => {
    setEditing(false);
    const clean = local.trim();
    const current = value ? String(value) : '';
    if (clean === current) return;
    await onSave(clean);
  };

  const common =
    'bg-transparent border-none outline-none focus:ring-0 text-sm text-gray-900 w-full';

  if (!editing || !canEdit) {
    return (
      <div
        className={
          'inline-flex min-h-[1.5rem] items-center ' +
          (canEdit
            ? 'cursor-text hover:bg-gray-50 rounded-md px-1 -mx-1 transition-colors'
            : '') +
          (className ? ` ${className}` : '')
        }
        onClick={() => canEdit && setEditing(true)}
      >
        {value && String(value).trim()
          ? String(value)
          : placeholder || (canEdit ? 'Click to add' : '—')}
      </div>
    );
  }

  if (multiline) {
    return (
      <textarea
        autoFocus
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={handleBlur}
        className={`${common} resize-none leading-relaxed`}
        rows={4}
      />
    );
  }

  return (
    <input
      autoFocus
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
      className={common}
    />
  );
};

const InlineEditableCurrency: React.FC<InlineEditableProps> = ({
  value,
  placeholder,
  canEdit,
  className,
  onSave,
}) => {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value ? String(value) : '');

  useEffect(() => {
    setLocal(value ? String(value) : '');
  }, [value]);

  const handleBlur = async () => {
    setEditing(false);
    const clean = local.trim();
    const current = value ? Number(value) : 0;

    if (!clean) {
      if (current === 0) return;
      await onSave('0');
      return;
    }

    const parsed = Number(clean);
    if (Number.isNaN(parsed) || parsed === current) return;
    await onSave(String(parsed));
  };

  if (!editing || !canEdit) {
    const display =
      typeof value === 'number'
        ? `$${value.toLocaleString()}`
        : value
        ? `$${Number(value).toLocaleString()}`
        : placeholder || 'Click to set budget';

    return (
      <div
        className={
          'inline-flex items-center min-h-[1.5rem] cursor-text hover:bg-gray-50 rounded-md px-1 -mx-1 transition-colors ' +
          (className || '')
        }
        onClick={() => canEdit && setEditing(true)}
      >
        {display}
      </div>
    );
  }

  return (
    <input
      autoFocus
      type="number"
      min={0}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      className="bg-transparent border-none outline-none focus:ring-0 text-2xl font-black text-[#111827] w-full"
    />
  );
};

const InlineEditableDate: React.FC<InlineEditableProps> = ({
  value,
  placeholder,
  canEdit,
  className,
  onSave,
}) => {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value ? String(value).slice(0, 10) : '');

  useEffect(() => {
    setLocal(value ? String(value).slice(0, 10) : '');
  }, [value]);

  const formatLabel = (v?: string) => {
    if (!v) return placeholder || 'Click to set';
    try {
      return new Date(v).toLocaleDateString();
    } catch {
      return v;
    }
  };

  const handleBlur = async () => {
    setEditing(false);
    const clean = local;
    const current = value ? String(value).slice(0, 10) : '';
    if (clean === current) return;
    await onSave(clean);
  };

  if (!editing || !canEdit) {
    return (
      <button
        type="button"
        onClick={() => canEdit && setEditing(true)}
        className={
          'text-xs text-gray-700 inline-flex items-center min-h-[1.25rem] cursor-text hover:bg-gray-50 rounded-md px-1 -mx-1 transition-colors ' +
          (className || '')
        }
      >
        {formatLabel(local || (value ? String(value) : undefined))}
      </button>
    );
  }

  return (
    <input
      autoFocus
      type="date"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={handleBlur}
      className="bg-transparent border-none outline-none focus:ring-0 text-xs text-gray-700"
    />
  );
};

/* ────────────────────────────────────────────────────────────── */

interface ProjectDetailsProps {
  project: Project;
  currentUser: User;
  users: User[];
  onBack: () => void;
  onUpdateStatus: (
    projectId: string,
    status: ProjectStatus,
    progress: number
  ) => void | Promise<void>;
  onAddUpdate: (
    projectId: string,
    content: string,
    imageFile?: File | null
  ) => void | Promise<void>;
  onMessage: (user: User, projectId?: string) => void;
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({
  project,
  currentUser,
  users,
  onBack,
  onUpdateStatus,
  onAddUpdate,
  onMessage,
}) => {
  const canEditCore =
    currentUser.role === UserRole.ADMIN;

  const [savingDetails, setSavingDetails] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [updating, setUpdating] = useState(false);
  const [teamSaving, setTeamSaving] = useState(false);

  const savePatch = async (patch: Partial<Project>) => {
    if (!canEditCore) return;
    setSavingDetails(true);
    try {
      await updateProject(project.id, patch);
    } catch (err) {
      console.error('Failed to update project', err);
    } finally {
      setSavingDetails(false);
    }
  };

  // ── team / contractors ────────────────────────
  const clientIds =
    project.clientIds && project.clientIds.length > 0
      ? project.clientIds
      : project.clientId
      ? [project.clientId]
      : [];

  const contractorIds =
    project.contractorIds && project.contractorIds.length > 0
      ? project.contractorIds
      : project.contractorId
      ? [project.contractorId]
      : [];

  const allClients = users.filter((u) => u.role === UserRole.CLIENT);
  const allContractors = users.filter((u) => u.role === UserRole.CONTRACTOR);

  const projectClients = allClients.filter((u) => clientIds.includes(u.id));
  const projectContractors = allContractors.filter((u) =>
    contractorIds.includes(u.id)
  );

  const primaryClient =
    projectClients.find((u) => u.id === project.clientId) ||
    projectClients[0] ||
    null;

  const primaryContractor =
    projectContractors.find((u) => u.id === project.contractorId) ||
    projectContractors[0] ||
    null;

  const availableContractors = allContractors.filter(
    (u) => !contractorIds.includes(u.id)
  );

  // Debug logging to help identify team visibility issues
  console.log('Team Debug Info:', {
    projectId: project.id,
    projectName: project.name,
    clientIds,
    contractorIds,
    totalUsers: users.length,
    allClients: allClients.length,
    allContractors: allContractors.length,
    projectClients: projectClients.map(c => c.name),
    projectContractors: projectContractors.map(c => c.name),
    primaryClient: primaryClient?.name || 'none',
    primaryContractor: primaryContractor?.name || 'none',
    currentUserRole: currentUser.role,
    currentUserName: currentUser.name,
  });

  const handleAddContractor = async (contractorId: string) => {
    if (!contractorId) return;
    setTeamSaving(true);
    try {
      await addContractorToProject(project.id, contractorId);
    } catch (err) {
      console.error('Failed to add contractor', err);
    } finally {
      setTeamSaving(false);
    }
  };

  const handleRemoveContractor = async (contractorId: string) => {
    setTeamSaving(true);
    try {
      await removeContractorFromProject(project.id, contractorId);
    } catch (err: any) {
      console.error('Failed to remove contractor', err);
      if (err?.message) {
        alert(err.message);
      }
    } finally {
      setTeamSaving(false);
    }
  };

  const handleMakePrimary = async (contractorId: string) => {
    setTeamSaving(true);
    try {
      await setPrimaryContractor(project.id, contractorId);
    } catch (err) {
      console.error('Failed to set primary contractor', err);
    } finally {
      setTeamSaving(false);
    }
  };

  // ── status / updates ──────────────────────────
  const updates: ProjectUpdate[] = Array.isArray(project.updates)
    ? (project.updates as ProjectUpdate[])
    : [];

  const availableStatuses: ProjectStatus[] = [
    ProjectStatus.PLANNING,
    ProjectStatus.ROUGH_IN,
    ProjectStatus.ON_HOLD,
    ProjectStatus.COMPLETED,
  ];

  const getStatusLabel = (status: ProjectStatus): string => {
    switch (status) {
      case ProjectStatus.PLANNING:
        return 'Planning';
      case ProjectStatus.DEMOLITION:
        return 'Demolition';
      case ProjectStatus.ROUGH_IN:
        return 'In Progress';
      case ProjectStatus.FINISHING:
        return 'Finishing';
      case ProjectStatus.COMPLETED:
        return 'Completed';
      case ProjectStatus.ON_HOLD:
        return 'On Hold';
      default:
        return String(status);
    }
  };

  const handleQuickStatus = async (status: ProjectStatus) => {
    const progress =
      status === ProjectStatus.COMPLETED
        ? 100
        : status === ProjectStatus.PLANNING
        ? 5
        : status === ProjectStatus.ON_HOLD
        ? project.progress || 0
        : Math.max(project.progress || 0, 25);

    await onUpdateStatus(project.id, status, progress);
  };

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateText.trim()) return;

    setUpdating(true);
    try {
      await onAddUpdate(project.id, updateText.trim());
      setUpdateText('');
    } catch (err) {
      console.error('Failed to add update', err);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return 'Not set';
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  };

  const progress = project.progress || 0;

  // ── render ────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header – single back button, mobile-first */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-2">

          <div className="space-y-1">
            <InlineEditableText
              value={project.title}
              canEdit={canEditCore}
              placeholder="Project name"
              className="text-2xl sm:text-2xl font-black text-[#111827]"
              onSave={(next) => savePatch({ title: next })}
            />

            <div className="flex items-start gap-1.5 text-xs text-gray-500">
              <MapPin size={12} className="mt-[2px] text-care-orange" />
              <InlineEditableText
                value={project.location}
                canEdit={canEditCore}
                placeholder="Site address"
                className="text-xs text-gray-600"
                onSave={(next) => savePatch({ location: next })}
              />
            </div>
          </div>
        </div>

        <div className="flex items-end sm:items-center gap-3 justify-between sm:justify-end">
          <div className="flex flex-col items-end gap-1">
            <div className="flex flex-wrap justify-end gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] bg-gray-100 text-gray-700">
                <Clock size={12} />
                <InlineEditableDate
                  value={project.startDate}
                  canEdit={canEditCore}
                  placeholder="Start date"
                  onSave={(next) => savePatch({ startDate: next || undefined })}
                />
                <span>–</span>
                <InlineEditableDate
                  value={project.estimatedEndDate}
                  canEdit={canEditCore}
                  placeholder="Target date"
                  onSave={(next) =>
                    savePatch({ estimatedEndDate: next || undefined })
                  }
                />
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] bg-care-orange/10 text-care-orange font-semibold">
                <CheckCircle size={12} />
                {typeof project.status === 'string'
                  ? project.status
                  : getStatusLabel(project.status)}
              </span>
            </div>

            <div className="text-right">
              <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em]">
                Progress
              </p>
              <p className="text-lg font-black text-[#111827]">
                {progress}%
              </p>
              {savingDetails && (
                <p className="text-[10px] text-care-orange mt-0.5">
                  Saving…
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Summary cards – mobile-first grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Progress + quick status */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em] mb-1">
            Progress
          </p>
          <p className="text-2xl font-black text-[#111827]">
            {progress}%
          </p>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-care-orange rounded-full transition-all"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {availableStatuses.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => handleQuickStatus(status)}
                className={`px-3 py-1 rounded-full text-[11px] border transition-colors ${
                  project.status === status
                    ? 'bg-care-orange text-white border-care-orange'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-care-orange/60 hover:text-care-orange'
                }`}
              >
                {getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em] mb-1">
            Budget
          </p>

          <InlineEditableCurrency
            value={project.budget || 0}
            canEdit={canEditCore}
            placeholder="Click to set budget"
            onSave={(next) => savePatch({ budget: Number(next || 0) })}
          />

          <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
            <FileText size={12} className="text-care-orange" />
            Spent:{' '}
            <span className="font-semibold text-gray-800">
              {project.spent ? `$${project.spent.toLocaleString()}` : '$0'}
            </span>
          </p>
        </div>

        {/* Key dates (readable labels; editable via header pills) */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em] mb-1">
            Key Dates
          </p>
          <div className="space-y-1 text-xs text-gray-600">
            <p>
              <span className="font-semibold">Start:</span>{' '}
              {formatDate(project.startDate)}
            </p>
            <p>
              <span className="font-semibold">Target completion:</span>{' '}
              {formatDate(project.estimatedEndDate)}
            </p>
            {project.createdAt && (
              <p className="text-[11px] text-gray-400">
                Created {formatDate(project.createdAt)}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Main layout – mobile-first: stack; lg: 2 + 1 columns */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* LEFT: overview + updates */}
        <div className="lg:col-span-2 space-y-4">
          {/* Project details / scope */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em] mb-2">
              Project Details
            </p>
            <InlineEditableText
              value={project.description}
              canEdit={canEditCore}
              multiline
              placeholder="Describe the scope, key tasks, phases, notes…"
              onSave={(next) => savePatch({ description: next })}
            />
          </div>

          {/* Updates */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em] mb-4">
              Project Updates
            </p>

            <form onSubmit={handleSubmitUpdate} className="mb-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                  placeholder="Add a project update..."
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-care-orange"
                />
                <button
                  type="submit"
                  disabled={updating || !updateText.trim()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-care-orange text-white text-xs font-semibold shadow-sm hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updating ? (
                    'Posting...'
                  ) : (
                    <>
                      <MessageSquare size={14} />
                      Post
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {updates.length > 0 ? (
                updates
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.timestamp).getTime() -
                      new Date(a.timestamp).getTime()
                  )
                  .map((update) => (
                    <div
                      key={update.id}
                      className="border border-gray-100 rounded-xl px-3 py-2.5 text-sm flex gap-3"
                    >
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-700">
                          {update.author?.charAt(0) || 'U'}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-xs font-semibold text-gray-800">
                            {update.author || 'Unknown'}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {formatDate(update.timestamp)}
                          </p>
                        </div>
                        <p className="text-xs text-gray-700">
                          {update.content}
                        </p>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-xs text-gray-500 text-center py-4">
                  No updates yet. Be the first to post an update!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: team + documents */}
        <div className="space-y-4">
          {/* Team */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UsersIcon size={18} className="text-care-orange" />
                <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em]">
                  Project Team
                </p>
              </div>
            </div>

            {/* Client */}
            {primaryClient ? (
              <div className="mb-4 pb-4 border-b border-dashed border-gray-100">
                <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em] mb-2">
                  Client
                </p>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">
                      {primaryClient.name?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {primaryClient.name}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {primaryClient.email}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onMessage(primaryClient, project.id)}
                    className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <MessageSquare
                      size={16}
                      className="text-care-orange"
                    />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-4 pb-4 border-b border-dashed border-gray-100">
                <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em] mb-2">
                  Client
                </p>
                <p className="text-xs text-gray-500">
                  No client assigned yet.
                  {currentUser.role === UserRole.CONTRACTOR && (
                    <span className="block mt-1 text-[10px]">
                      (Contact admin to assign a client)
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Contractors */}
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em] mb-2">
                Contractors
              </p>

              {projectContractors.length === 0 ? (
                <p className="text-xs text-gray-500 mb-2">
                  No contractors assigned.
                  {currentUser.role === UserRole.CONTRACTOR && (
                    <span className="block mt-1 text-[10px]">
                      (Contact admin to add contractors to this project)
                    </span>
                  )}
                </p>
              ) : (
                <div className="space-y-2 mb-3">
                  {projectContractors.map((c) => {
                    const isPrimary = c.id === primaryContractor?.id;
                    const isCurrentUser = c.id === currentUser.id;
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-2 border border-gray-100 rounded-xl px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-bold">
                            {c.name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-900">
                              {c.name}
                              {isCurrentUser && (
                                <span className="ml-1 text-[10px] text-gray-400">(You)</span>
                              )}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {c.specialty || c.email}
                            </p>
                            {isPrimary && (
                              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-care-orange/10 text-care-orange text-[10px] px-2 py-0.5 font-semibold uppercase tracking-[0.18em]">
                                Primary
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!isCurrentUser && (
                            <button
                              type="button"
                              onClick={() => onMessage(c, project.id)}
                              className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                              <MessageSquare
                                size={14}
                                className="text-care-orange"
                              />
                            </button>
                          )}
                          {currentUser.role === UserRole.ADMIN && (
                            <>
                              {!isPrimary && (
                                <button
                                  type="button"
                                  onClick={() => handleMakePrimary(c.id)}
                                  disabled={teamSaving}
                                  className="px-2 py-1 rounded-lg text-[10px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                                >
                                  Make primary
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveContractor(c.id)}
                                disabled={teamSaving}
                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              >
                                <XIcon
                                  size={14}
                                  className="text-red-500"
                                />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add contractor */}
              {currentUser.role === UserRole.ADMIN && (
                <div className="mt-2">
                  <label className="block text-[11px] text-gray-400 uppercase tracking-[0.18em] mb-1">
                    Add contractor
                  </label>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-700 focus:outline-none focus:border-care-orange"
                      defaultValue=""
                      disabled={teamSaving || availableContractors.length === 0}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) return;
                        handleAddContractor(id);
                        e.target.value = '';
                      }}
                    >
                      <option value="">
                        {availableContractors.length === 0
                          ? 'All contractors already assigned'
                          : 'Select contractor to add'}
                      </option>
                      {availableContractors.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Documents upload / list – lives with project */}
          <ProjectDocumentsPanel
            project={project}
            currentUser={currentUser}
          />
        </div>
      </section>
    </div>
  );
};

export default ProjectDetails;