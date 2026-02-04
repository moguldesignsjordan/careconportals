import React from 'react';
import {
  Calendar,
  DollarSign,
  FileText,
  MapPin,
  User as UserIcon,
} from 'lucide-react';
import { Project, ProjectStatus } from '../types';

interface ProjectCardProps {
  project: Project;
  onClick: (project: Project) => void;
  documentCount?: number;
  clientName?: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onClick,
  documentCount,
  clientName,
}) => {
  const getStatusColor = (status: ProjectStatus | string): string => {
    const statusStr = String(status);
    if (statusStr === ProjectStatus.PLANNING || statusStr === 'Planning')
      return 'bg-blue-50 text-blue-700';
    if (statusStr === ProjectStatus.DEMOLITION || statusStr === 'Demolition')
      return 'bg-rose-50 text-rose-700';
    if (statusStr === ProjectStatus.ROUGH_IN || statusStr === 'Rough-in')
      return 'bg-purple-50 text-purple-700';
    if (statusStr === ProjectStatus.FINISHING || statusStr === 'Finishing')
      return 'bg-indigo-50 text-indigo-700';
    if (statusStr === ProjectStatus.COMPLETED || statusStr === 'Completed')
      return 'bg-emerald-50 text-emerald-700';
    if (statusStr === ProjectStatus.ON_HOLD || statusStr === 'On Hold')
      return 'bg-amber-50 text-amber-700';
    return 'bg-gray-50 text-gray-700';
  };

  const statusClass = getStatusColor(project.status);
  const progress = project.progress ?? 0;
  const budget = project.budget || 0;

  return (
    <button
      onClick={() => onClick(project)}
      className="group flex flex-col h-full rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm hover:shadow-md hover:border-care-orange/40 transition-all"
    >
      {/* Status / progress */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.18em] border ${statusClass}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {String(project.status || 'Planning')}
        </span>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 uppercase tracking-[0.18em]">
            Progress
          </p>
          <p className="text-xs font-bold text-gray-900">
            {progress}%
          </p>
        </div>
      </div>

      {/* Title & meta */}
      <div className="mb-3">
        <h3 className="text-sm font-bold text-gray-900 group-hover:text-care-orange transition-colors line-clamp-2">
          {project.title}
        </h3>
        <p className="mt-1 text-[11px] text-gray-500 flex items-center gap-1.5">
          <MapPin size={12} className="text-care-orange" />
          {project.location || 'No address set'}
        </p>
      </div>

      {/* Client + budget */}
      <div className="mb-3 flex items-center justify-between gap-3 text-[11px] text-gray-500">
        <div className="flex items-center gap-1.5">
          <UserIcon size={12} className="text-gray-400" />
          <span className="truncate">
            {clientName || 'Client'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <DollarSign size={12} className="text-care-orange" />
          <span>
            {budget
              ? `$${budget.toLocaleString()}`
              : 'No budget'}
          </span>
        </div>
      </div>

      {/* Footer: dates, docs, progress bar */}
      <div className="mt-auto space-y-2">
        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="text-gray-400" />
            <span>
              {project.estimatedEndDate
                ? new Date(
                    project.estimatedEndDate
                  ).toLocaleDateString()
                : 'No end date'}
            </span>
          </div>

          {typeof documentCount === 'number' && (
            <div className="flex items-center gap-1.5">
              <FileText size={12} className="text-care-orange" />
              <span>{documentCount} docs</span>
            </div>
          )}
        </div>

        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-care-orange transition-all"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>
    </button>
  );
};

export default ProjectCard;
