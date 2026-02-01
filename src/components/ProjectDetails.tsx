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
    // Use enum values for comparison
    if (status === ProjectStatus.COMPLETED) progress = 100;
    if (status === ProjectStatus.PLANNING) progress = 0;
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

  // Define available statuses for the quick-change buttons
  const availableStatuses: ProjectStatus[] = [
    ProjectStatus.PLANNING,
    ProjectStatus.ROUGH_IN,
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
            {(project as any).location && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <MapPin size={12} className="text-care-orange" />
                {(project as any).location}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] bg-gray-100 text-gray-700">
            <Calendar size={12} />
            {formatDate(project.startDate)} – {formatDate(project.estimatedEndDate)}
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
            {availableStatuses.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                  project.status === status
                    ? 'bg-care-orange text-white border-care-orange'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-care-orange/60'
                }`}
              >
                {getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em] mb-1">
            Budget
          </p>
          <p className="text-2xl font-black text-[#111827]">
            {project.budget
              ? `$${project.budget.toLocaleString()}`
              : 'Not set'}
          </p>
          {project.spent !== undefined && project.budget ? (
            <p className="text-xs text-gray-500 mt-1">
              ${project.spent.toLocaleString()} spent ({Math.round((project.spent / project.budget) * 100)}%)
            </p>
          ) : null}
        </div>
      </section>

      {/* Description */}
      {project.description && (
        <section className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em] mb-2">
            Description
          </p>
          <p className="text-sm text-gray-700">{project.description}</p>
        </section>
      )}

      {/* Team */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {client && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em] mb-3">
              Client
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold">
                  {client.name?.charAt(0) || 'C'}
                </div>
                <div>
                  <p className="font-bold text-sm">{client.name}</p>
                  <p className="text-xs text-gray-500">{client.email}</p>
                </div>
              </div>
              <button
                onClick={() => onMessage(client, project.id)}
                className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <MessageSquare size={18} className="text-care-orange" />
              </button>
            </div>
          </div>
        )}

        {contractor && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em] mb-3">
              Contractor
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold">
                  {contractor.name?.charAt(0) || 'C'}
                </div>
                <div>
                  <p className="font-bold text-sm">{contractor.name}</p>
                  <p className="text-xs text-gray-500">{contractor.specialty || contractor.email}</p>
                </div>
              </div>
              <button
                onClick={() => onMessage(contractor, project.id)}
                className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <MessageSquare size={18} className="text-care-orange" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Updates */}
      <section className="bg-white border border-gray-100 rounded-2xl p-4">
        <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em] mb-4">
          Project Updates
        </p>

        {/* Add update form */}
        <form onSubmit={handleSubmitUpdate} className="mb-4">
          <div className="flex gap-2">
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
              className="px-4 py-2 bg-care-orange text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-orange-600 transition-colors"
            >
              {updating ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>

        {/* Updates list */}
        <div className="space-y-3">
          {project.updates && project.updates.length > 0 ? (
            project.updates.map((update) => (
              <div
                key={update.id}
                className="p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-xs">{update.author}</span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(update.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{update.content}</p>
                {update.imageUrl && (
                  <img
                    src={update.imageUrl}
                    alt="Update"
                    className="mt-2 rounded-lg max-h-48 object-cover"
                  />
                )}
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500 text-center py-4">
              No updates yet. Be the first to post an update!
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProjectDetails;