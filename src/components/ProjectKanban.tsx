import React, { useState } from 'react';
import {
  Calendar,
  DollarSign,
  MapPin,
  User,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pause,
  PlayCircle,
  Image as ImageIcon,
  MoreHorizontal,
  Plus,
} from 'lucide-react';
import { Project, User as UserType, ProjectStatus } from '../types';

interface ProjectKanbanProps {
  projects: Project[];
  users: User[];
  currentUser: UserType;
  onProjectClick: (project: Project) => void;
  onCreateProject: () => void;
}

// Kanban columns configuration
const KANBAN_COLUMNS = [
  { 
    id: 'planning', 
    label: 'Planning', 
    statuses: ['planned'] as string[],
    color: 'blue',
    icon: Clock,
    bgGradient: 'from-blue-500 to-blue-600',
  },
  { 
    id: 'in-progress', 
    label: 'In Progress', 
    statuses: ['in-progress'] as string[],
    color: 'orange',
    icon: PlayCircle,
    bgGradient: 'from-care-orange to-orange-500',
  },
  { 
    id: 'on-hold', 
    label: 'On Hold', 
    statuses: ['on-hold'] as string[],
    color: 'gray',
    icon: Pause,
    bgGradient: 'from-gray-400 to-gray-500',
  },
  { 
    id: 'completed', 
    label: 'Completed', 
    statuses: ['completed'] as string[],
    color: 'green',
    icon: CheckCircle2,
    bgGradient: 'from-green-500 to-green-600',
  },
];

const ProjectKanban: React.FC<ProjectKanbanProps> = ({
  projects,
  users,
  currentUser,
  onProjectClick,
  onCreateProject,
}) => {
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);

  const getProjectsForColumn = (column: typeof KANBAN_COLUMNS[number]) => {
    return projects.filter(p => column.statuses.includes(p.status));
  };

  const getUser = (userId?: string) => {
    return users.find(u => u.id === userId);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'TBD';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
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

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-care-orange';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  return (
    <div className="h-full">
      {/* Kanban Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">
            Project Overview
          </p>
          <h2 className="text-2xl font-black text-gray-900">Kanban Board</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-bold">{projects.length}</span>
            <span>Total Projects</span>
          </div>
          <button
            onClick={onCreateProject}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-xs font-bold hover:bg-care-orange transition-colors"
          >
            <Plus size={16} />
            New Project
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[calc(100vh-280px)] overflow-hidden">
        {KANBAN_COLUMNS.map((column) => {
          const Icon = column.icon;
          const columnProjects = getProjectsForColumn(column);

          return (
            <div 
              key={column.id}
              className="flex flex-col bg-gray-50/50 rounded-2xl overflow-hidden border border-gray-100"
            >
              {/* Column Header */}
              <div className={`p-4 bg-gradient-to-r ${column.bgGradient} text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={18} />
                    <h3 className="text-sm font-black uppercase tracking-wider">{column.label}</h3>
                  </div>
                  <span className="bg-white/20 px-2.5 py-1 rounded-full text-xs font-black">
                    {columnProjects.length}
                  </span>
                </div>
              </div>

              {/* Column Content */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {columnProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <Icon size={20} className="text-gray-400" />
                    </div>
                    <p className="text-xs font-bold text-gray-400">No projects</p>
                    <p className="text-[10px] text-gray-400 mt-1">Projects will appear here</p>
                  </div>
                ) : (
                  columnProjects.map((project) => {
                    const client = getUser(project.clientId);
                    const contractor = getUser(project.contractorId);
                    const daysRemaining = getDaysRemaining(project.estimatedEndDate);
                    const isOverdue = daysRemaining !== null && daysRemaining < 0;
                    const isHovered = hoveredProject === project.id;

                    return (
                      <div
                        key={project.id}
                        onClick={() => onProjectClick(project)}
                        onMouseEnter={() => setHoveredProject(project.id)}
                        onMouseLeave={() => setHoveredProject(null)}
                        className={`bg-white rounded-xl p-4 cursor-pointer transition-all border-2 ${
                          isHovered 
                            ? 'border-care-orange shadow-lg shadow-care-orange/10 -translate-y-0.5' 
                            : 'border-transparent shadow-sm hover:shadow-md'
                        }`}
                      >
                        {/* Project Cover Image (if exists) */}
                        {project.coverImage && (
                          <div className="relative -mx-4 -mt-4 mb-3 h-24 overflow-hidden rounded-t-xl">
                            <img 
                              src={project.coverImage} 
                              alt="" 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          </div>
                        )}

                        {/* Title & Location */}
                        <div className="mb-3">
                          <h4 className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-care-orange transition-colors">
                            {project.title}
                          </h4>
                          {project.location && (
                            <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-1">
                              <MapPin size={10} className="text-care-orange" />
                              <span className="line-clamp-1">{project.location}</span>
                            </p>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Progress</span>
                            <span className="text-xs font-black text-care-orange">{project.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${getProgressColor(project.progress)}`}
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Meta Info */}
                        <div className="flex items-center justify-between text-[10px] text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar size={10} />
                            <span>{formatDate(project.estimatedEndDate)}</span>
                          </div>
                          {daysRemaining !== null && (
                            <span className={`font-bold ${
                              isOverdue ? 'text-red-500' : 
                              daysRemaining <= 7 ? 'text-amber-500' : 
                              'text-gray-500'
                            }`}>
                              {isOverdue 
                                ? `${Math.abs(daysRemaining)}d overdue` 
                                : `${daysRemaining}d left`
                              }
                            </span>
                          )}
                        </div>

                        {/* Budget */}
                        {project.budget && project.budget > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-500">
                            <DollarSign size={10} />
                            <span className="font-medium">${project.budget.toLocaleString()}</span>
                          </div>
                        )}

                        {/* Team Avatars */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <div className="flex -space-x-2">
                            {client && (
                              <div 
                                className="w-7 h-7 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-600"
                                title={`Client: ${client.name}`}
                              >
                                {client.avatar ? (
                                  <img src={client.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  client.name.charAt(0).toUpperCase()
                                )}
                              </div>
                            )}
                            {contractor && (
                              <div 
                                className="w-7 h-7 rounded-full bg-care-orange/20 border-2 border-white flex items-center justify-center text-[10px] font-bold text-care-orange"
                                title={`Contractor: ${contractor.name}`}
                              >
                                {contractor.avatar ? (
                                  <img src={contractor.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  contractor.name.charAt(0).toUpperCase()
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Updates indicator */}
                          {project.updates && project.updates.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-gray-400">
                              <ImageIcon size={10} />
                              <span>{project.updates.length}</span>
                            </div>
                          )}
                        </div>

                        {/* Hover action indicator */}
                        {isHovered && (
                          <div className="mt-3 pt-3 border-t border-care-orange/20 flex items-center justify-center gap-2 text-care-orange">
                            <span className="text-[10px] font-bold uppercase tracking-wider">View Details</span>
                            <ChevronRight size={14} />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Add Project Button (only for Planning column) */}
                {column.id === 'planning' && (
                  <button
                    onClick={onCreateProject}
                    className="w-full p-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-care-orange hover:text-care-orange hover:bg-care-orange/5 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    <span className="text-xs font-bold">Add Project</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {KANBAN_COLUMNS.map((column) => {
          const columnProjects = getProjectsForColumn(column);
          const totalBudget = columnProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
          
          return (
            <div key={column.id} className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${column.bgGradient}`} />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{column.label}</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-black text-gray-900">{columnProjects.length}</p>
                  <p className="text-[10px] text-gray-500">project{columnProjects.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-600">${(totalBudget / 1000).toFixed(0)}k</p>
                  <p className="text-[10px] text-gray-400">total budget</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectKanban;