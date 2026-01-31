import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  CheckCircle,
  Clock,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { Project, User, ProjectStatus } from '../types';

interface ProjectDetailsProps {
  project: Project;
  currentUser: User;
  users: User[];
  onBack: () => void;
  onUpdateStatus: (
    projectId: string,
    status: ProjectStatus,
    progress: number
  ) => Promise<void>;
  onAddUpdate: (projectId: string, content: string) => Promise<void>;
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
  const [updateText, setUpdateText] = useState('');
  const [updating, setUpdating] = useState(false);

  const client = users.find((u) => u.id === project.clientId) || null;
  const contractor =
    users.find((u) => u.id === project.contractorId) || null;

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateText.trim()) return;
    setUpdating(true);
    try {
      await onAddUpdate(project.id, updateText.trim());
      setUpdateText('');
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = async (status: ProjectStatus) => {
    let progress = project.progress || 0;
    if (status === 'completed') progress = 100;
    if (status === 'planned') progress = 0;
    await onUpdateStatus(project.id, status, progress);
  };

  const formatDate = (value?: string) => {
    if (!value) return 'TBD';
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="h-9 w-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1">
              Project Details
            </p>
            <h1 className="text-xl md:text-2xl font-black text-[#111827]">
              {project.title}
            </h1>
            {project.location && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <MapPin size={12} className="text-care-orange" />
                {project.location}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] bg-gray-100 text-gray-700">
            <Calendar size={12} />
            {formatDate(project.startDate)} – {formatDate(project.endDate)}
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] bg-care-orange/10 text-care-orange font-semibold">
            {project.status}
          </span>
        </div>
      </header>

      {/* Top data cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em] mb-1">
            Progress
          </p>
          <p className="text-2xl font-black text-[#111827]">
            {project.progress || 0}%
          </p>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-care-orange rounded-full transition-all"
              style={{ width: `${project.progress || 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em] mb-1">
            Status
          </p>
          <div className="flex flex-wrap gap-2 mt-1">
            {(['planned', 'in-progress', 'completed'] as ProjectStatus[]).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                    project.status === status
                      ? 'bg-care-orange text-white border-care-orange'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-care-orange/60'
                  }`}
                >
                  {status === 'planned' && 'Planned'}
                  {status === 'in-progress' && 'In Progress'}
                  {status === 'completed' && 'Completed'}
                </button>
              )
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em] mb-1">
            Budget
          </p>
          <p className="text-2xl font-black text-[#111827]">
            {project.budget
              ? project.budget.toLocaleString(undefined, {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0,
                })
              : 'TBD'}
          </p>
        </div>
      </section>

      {/* Layout: left = team/updates, right = notes/docs */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Left: Team + updates */}
        <div className="space-y-4 lg:col-span-2">
          {/* Team */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
            <h2 className="text-xs font-black text-[#111827] uppercase tracking-[0.18em]">
              Project Team
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {client && (
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center text-xs font-semibold text-gray-700">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {client.name}
                      </p>
                      <p className="text-[11px] text-gray-500">Client</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onMessage(client, project.id)}
                    className="p-2 text-care-orange hover:bg-care-orange/10 rounded-lg transition-all"
                  >
                    <MessageSquare size={18} />
                  </button>
                </div>
              )}

              {contractor && (
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center text-xs font-semibold text-gray-700">
                      {contractor.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {contractor.name}
                      </p>
                      <p className="text-[11px] text-gray-500">Contractor</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onMessage(contractor, project.id)}
                    className="p-2 text-care-orange hover:bg-care-orange/10 rounded-lg transition-all"
                  >
                    <MessageSquare size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Updates */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-[#111827] uppercase tracking-[0.18em]">
                Site Updates
              </h2>
            </div>

            <form onSubmit={handleSubmitUpdate} className="space-y-2">
              <textarea
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                rows={3}
                className="w-full text-xs rounded-xl border border-gray-200 bg-white py-2 px-3 focus:border-care-orange focus:ring-0"
                placeholder="Log a progress update, material delivery, or inspection note..."
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!updateText.trim() || updating}
                  className="bg-[#1A1A1A] text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle size={14} />
                  {updating ? 'Posting...' : 'Post Update'}
                </button>
              </div>
            </form>

            {project.updates && project.updates.length > 0 ? (
              <div className="space-y-3 mt-2 max-h-64 overflow-y-auto">
                {project.updates
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime()
                  )
                  .map((u) => (
                    <div
                      key={u.id}
                      className="rounded-xl bg-gray-50 px-3 py-2 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">
                          {u.author}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {formatDate(u.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {u.content}
                      </p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-[11px] text-gray-400">
                No updates yet. Use the box above to post your first site update.
              </p>
            )}
          </div>
        </div>

        {/* Right: Notes / Docs hint */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-black text-[#111827] uppercase tracking-[0.18em]">
            Project Files
          </h2>
          <p className="text-xs text-gray-500">
            Upload contracts, permits, and photos in the Documents tab so your team and client can
            reference them anytime.
          </p>
          <div className="mt-2 rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-xs text-gray-400">
            <FileText size={18} className="mx-auto mb-2 text-care-orange" />
            Manage files from the global Documents section.
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProjectDetails;
