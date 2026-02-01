import React from 'react';
import { 
  Calendar, 
  DollarSign, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Image as ImageIcon,
  MessageSquare,
  ChevronRight,
  User as UserIcon,
  TrendingUp,
} from 'lucide-react';
import { Project, User, ProjectStatus } from '../types';

interface EnhancedProjectCardProps {
  project: Project;
  users?: User[];
  onClick: (project: Project) => void;
  variant?: 'default' | 'compact' | 'featured';
}

const EnhancedProjectCard: React.FC<EnhancedProjectCardProps> = ({ 
  project, 
  users = [],
  onClick,
  variant = 'default',
}) => {
  const client = users?.find(u => u.id === project.clientId);
  const contractor = users?.find(u => u.id === project.contractorId);

  const getStatusConfig = (status: ProjectStatus | string) => {
    const configs: Record<string, { bg: string; text: string; icon: React.ElementType; label: string }> = {
      'planned': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock, label: 'Planning' },
      'planning': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock, label: 'Planning' },
      'in-progress': { bg: 'bg-care-orange/10', text: 'text-care-orange', icon: TrendingUp, label: 'In Progress' },
      'on-hold': { bg: 'bg-gray-100', text: 'text-gray-600', icon: AlertCircle, label: 'On Hold' },
      'completed': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2, label: 'Completed' },
    };
    return configs[status] || configs['planned'];
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'TBD';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getDaysRemaining = (endDate?: string) => {
    if (!endDate) return null;
    try {
      const end = new Date(endDate);
      const now = new Date();
      const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diff;
    } catch {
      return null;
    }
  };

  const getLatestUpdate = () => {
    if (!project.updates || project.updates.length === 0) return null;
    return project.updates.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
  };

  const getLatestImage = () => {
    if (!project.updates) return null;
    for (const update of project.updates.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )) {
      if (update.imageUrl) return update.imageUrl;
    }
    return null;
  };

  const statusConfig = getStatusConfig(project.status);
  const StatusIcon = statusConfig.icon;
  const daysRemaining = getDaysRemaining(project.estimatedEndDate);
  const isOverdue = daysRemaining !== null && daysRemaining < 0;
  const latestUpdate = getLatestUpdate();
  const coverImage = project.coverImage || getLatestImage();

  // Compact variant
  if (variant === 'compact') {
    return (
      <div
        onClick={() => onClick(project)}
        className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-care-orange/30 hover:shadow-md transition-all cursor-pointer group"
      >
        {/* Cover/Progress indicator */}
        <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100">
          {coverImage ? (
            <img src={coverImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-2xl font-black text-gray-300">{project.progress}%</span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
            <div 
              className="h-full bg-care-orange transition-all"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-care-orange transition-colors">
              {project.title}
            </h3>
            <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
              {statusConfig.label}
            </span>
          </div>
          
          {project.location && (
            <p className="text-[11px] text-gray-500 flex items-center gap-1 truncate">
              <MapPin size={10} className="text-care-orange shrink-0" />
              {project.location}
            </p>
          )}
          
          <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {formatDate(project.estimatedEndDate)}
            </span>
            {project.budget && (
              <span className="flex items-center gap-1">
                <DollarSign size={10} />
                ${project.budget.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight size={18} className="text-gray-300 group-hover:text-care-orange transition-colors shrink-0" />
      </div>
    );
  }

  // Featured variant
  if (variant === 'featured') {
    return (
      <div
        onClick={() => onClick(project)}
        className="relative overflow-hidden rounded-3xl cursor-pointer group"
      >
        {/* Background Image or Gradient */}
        <div className="absolute inset-0">
          {coverImage ? (
            <img src={coverImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1A1A1A] to-[#2D2D2D]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
        </div>

        {/* Content */}
        <div className="relative p-8 min-h-[320px] flex flex-col justify-end text-white">
          {/* Status Badge */}
          <div className="absolute top-6 left-6">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm`}>
              <StatusIcon size={12} />
              {statusConfig.label}
            </span>
          </div>

          {/* Progress Ring */}
          <div className="absolute top-6 right-6">
            <div className="relative w-16 h-16">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="4"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="#FF6B35"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - project.progress / 100)}`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-black">{project.progress}%</span>
              </div>
            </div>
          </div>

          {/* Title & Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-black group-hover:text-care-orange transition-colors">
                {project.title}
              </h3>
              {project.location && (
                <p className="text-sm text-white/70 flex items-center gap-2 mt-2">
                  <MapPin size={14} className="text-care-orange" />
                  {project.location}
                </p>
              )}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-6 text-sm">
              <div>
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Budget</p>
                <p className="font-bold">${(project.budget || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Timeline</p>
                <p className="font-bold">{formatDate(project.startDate)} — {formatDate(project.estimatedEndDate)}</p>
              </div>
              {daysRemaining !== null && (
                <div>
                  <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Remaining</p>
                  <p className={`font-bold ${isOverdue ? 'text-red-400' : ''}`}>
                    {isOverdue ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days`}
                  </p>
                </div>
              )}
            </div>

            {/* Team */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div className="flex -space-x-3">
                {client && (
                  <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden bg-white/10 flex items-center justify-center">
                    {client.avatar ? (
                      <img src={client.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold">{client.name.charAt(0)}</span>
                    )}
                  </div>
                )}
                {contractor && (
                  <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden bg-care-orange/30 flex items-center justify-center">
                    {contractor.avatar ? (
                      <img src={contractor.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold">{contractor.name.charAt(0)}</span>
                    )}
                  </div>
                )}
              </div>

              <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-care-orange rounded-xl transition-colors">
                <span className="text-xs font-bold">View Project</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div
      onClick={() => onClick(project)}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-care-orange/30 hover:shadow-xl hover:shadow-care-orange/5 transition-all cursor-pointer group"
    >
      {/* Cover Image */}
      {coverImage ? (
        <div className="relative h-40 overflow-hidden">
          <img 
            src={coverImage} 
            alt="" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
              <StatusIcon size={10} />
              {statusConfig.label}
            </span>
          </div>

          {/* Progress */}
          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
            <span className="text-sm font-black text-gray-900">{project.progress}%</span>
          </div>
        </div>
      ) : (
        <div className="relative h-24 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
          <div className="text-center">
            <span className="text-3xl font-black text-gray-200">{project.progress}%</span>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Complete</p>
          </div>
          
          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
              <StatusIcon size={10} />
              {statusConfig.label}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        {/* Title & Location */}
        <div className="mb-4">
          <h3 className="text-base font-bold text-gray-900 group-hover:text-care-orange transition-colors line-clamp-1">
            {project.title}
          </h3>
          {project.location && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1.5">
              <MapPin size={12} className="text-care-orange" />
              <span className="line-clamp-1">{project.location}</span>
            </p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-care-orange to-orange-400 rounded-full transition-all duration-500"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* Meta Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-1">Budget</p>
            <p className="text-sm font-bold text-gray-900 flex items-center gap-1">
              <DollarSign size={12} className="text-care-orange" />
              {project.budget ? project.budget.toLocaleString() : 'TBD'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-1">Due Date</p>
            <p className={`text-sm font-bold flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
              <Calendar size={12} className={isOverdue ? 'text-red-500' : 'text-care-orange'} />
              {formatDate(project.estimatedEndDate)}
            </p>
          </div>
        </div>

        {/* Latest Update */}
        {latestUpdate && (
          <div className="mb-4 p-3 bg-care-orange/5 rounded-xl border border-care-orange/10">
            <div className="flex items-center gap-2 mb-1.5">
              <MessageSquare size={10} className="text-care-orange" />
              <span className="text-[9px] font-bold text-care-orange uppercase tracking-wider">Latest Update</span>
            </div>
            <p className="text-xs text-gray-600 line-clamp-2">{latestUpdate.content}</p>
            <p className="text-[10px] text-gray-400 mt-1.5">{formatDate(latestUpdate.timestamp)}</p>
          </div>
        )}

        {/* Team & Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex -space-x-2">
            {client && (
              <div 
                className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center overflow-hidden"
                title={client.name}
              >
                {client.avatar ? (
                  <img src={client.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-blue-600">{client.name.charAt(0)}</span>
                )}
              </div>
            )}
            {contractor && (
              <div 
                className="w-8 h-8 rounded-full bg-care-orange/20 border-2 border-white flex items-center justify-center overflow-hidden"
                title={contractor.name}
              >
                {contractor.avatar ? (
                  <img src={contractor.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-care-orange">{contractor.name.charAt(0)}</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            {project.updates && project.updates.length > 0 && (
              <span className="flex items-center gap-1">
                <ImageIcon size={12} />
                {project.updates.length}
              </span>
            )}
            <ChevronRight size={16} className="text-gray-300 group-hover:text-care-orange transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedProjectCard;