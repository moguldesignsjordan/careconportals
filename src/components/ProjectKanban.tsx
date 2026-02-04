import React, { useState } from 'react';
import {
  ArrowRight,
  Calendar,
  DollarSign,
  User as UserIcon,
  Plus,
  Trash2,
} from 'lucide-react';
import { Project, ProjectStatus, User } from '../types';

interface ProjectKanbanProps {
  projects: Project[];
  users: User[];
  currentUser: User;
  onProjectClick: (project: Project) => void;
  onCreateProject?: () => void;
  /** When provided (admin only) each card gets a delete button */
  onDeleteProject?: (projectId: string) => Promise<void>;
}

const ProjectKanban: React.FC<ProjectKanbanProps> = ({
  projects,
  users,
  currentUser,
  onProjectClick,
  onCreateProject,
  onDeleteProject,
}) => {
  /** tracks which single card is in "confirm delete" mode */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const columns = [
    { status: ProjectStatus.PLANNING,    title: 'Planning',    color: 'bg-blue-500' },
    { status: ProjectStatus.DEMOLITION,  title: 'Demolition',  color: 'bg-red-500' },
    { status: ProjectStatus.ROUGH_IN,    title: 'Rough-In',    color: 'bg-purple-500' },
    { status: ProjectStatus.FINISHING,   title: 'Finishing',   color: 'bg-orange-500' },
    { status: ProjectStatus.COMPLETED,   title: 'Completed',   color: 'bg-green-500' },
  ];

  const getProjectsForStatus = (status: ProjectStatus) =>
    projects.filter((p) => String(p.status) === String(status));

  const getClientName = (clientId: string) =>
    users.find((u) => u.id === clientId)?.name || 'Unknown Client';

  const getContractorName = (contractorId: string) =>
    users.find((u) => u.id === contractorId)?.name || 'Unassigned';

  const handleDelete = async (projectId: string) => {
    if (onDeleteProject) {
      try {
        await onDeleteProject(projectId);
      } catch (e) {
        console.error('Delete failed', e);
      }
    }
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1">
            Project Board
          </p>
          <h1 className="text-2xl font-black text-[#111827]">Kanban View</h1>
        </div>
        {onCreateProject && (
          <button
            onClick={onCreateProject}
            className="flex items-center gap-2 px-4 py-2.5 bg-care-orange text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-orange-600 transition-all"
          >
            <Plus size={16} />
            New Project
          </button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => {
          const columnProjects = getProjectsForStatus(column.status);
          return (
            <div
              key={column.status}
              className="flex-shrink-0 w-72 bg-gray-50 rounded-2xl p-4"
            >
              {/* Column Header */}
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-3 h-3 rounded-full ${column.color}`} />
                <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">
                  {column.title}
                </h3>
                <span className="ml-auto bg-white text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full">
                  {columnProjects.length}
                </span>
              </div>

              {/* Column Content */}
              <div className="space-y-3">
                {columnProjects.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs">
                    No projects
                  </div>
                ) : (
                  columnProjects.map((project) => {
                    const isConfirming = confirmDeleteId === project.id;

                    return (
                      <div
                        key={project.id}
                        className="relative group"
                      >
                        {/* ── confirm overlay ── */}
                        {isConfirming && (
                          <div className="absolute inset-0 z-20 bg-white/95 rounded-xl flex flex-col items-center justify-center p-4 text-center">
                            <Trash2 size={20} className="text-red-500 mb-2" />
                            <p className="text-xs font-black text-[#111827] mb-1">Delete this project?</p>
                            <p className="text-[11px] text-gray-500 mb-3">This cannot be undone.</p>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                                className="px-3 py-1.5 bg-red-600 text-white text-xs font-black rounded-lg hover:bg-red-700 transition-colors"
                              >
                                Delete
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-black rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ── card ── */}
                        <div
                          onClick={() => onProjectClick(project)}
                          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-care-orange/20 transition-all group"
                        >
                          {/* title row + trash */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-bold text-sm text-gray-900 group-hover:text-care-orange transition-colors truncate">
                              {project.title}
                            </h4>
                            {onDeleteProject && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(project.id); }}
                                className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100 shrink-0"
                                title="Delete project"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="flex justify-between text-[10px] mb-1">
                              <span className="text-gray-400 font-bold uppercase">Progress</span>
                              <span className="text-care-orange font-black">{project.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-care-orange rounded-full transition-all"
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Meta Info */}
                          <div className="space-y-1.5 text-[11px]">
                            <div className="flex items-center gap-2 text-gray-500">
                              <UserIcon size={12} className="text-gray-400" />
                              <span className="truncate">{getClientName(project.clientId)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                              <Calendar size={12} className="text-gray-400" />
                              <span>
                                {project.estimatedEndDate
                                  ? new Date(project.estimatedEndDate).toLocaleDateString()
                                  : 'No due date'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                              <DollarSign size={12} className="text-gray-400" />
                              <span>${(project.budget || 0).toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Contractor tag */}
                          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              Contractor
                            </span>
                            <span className="text-[11px] font-semibold text-care-orange">
                              {getContractorName(project.contractorId)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectKanban;