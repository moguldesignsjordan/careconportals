import React from 'react';
import {
  ArrowRight,
  Calendar,
  DollarSign,
  User as UserIcon,
  Plus,
} from 'lucide-react';
import { Project, ProjectStatus, User } from '../types';

interface ProjectKanbanProps {
  projects: Project[];
  users: User[];
  onSelectProject: (project: Project) => void;
  onCreateProject?: () => void;
}

const ProjectKanban: React.FC<ProjectKanbanProps> = ({
  projects,
  users,
  onSelectProject,
  onCreateProject,
}) => {
  // Define kanban columns based on ProjectStatus
  const columns = [
    { status: ProjectStatus.PLANNING, title: 'Planning', color: 'bg-blue-500' },
    { status: ProjectStatus.DEMOLITION, title: 'Demolition', color: 'bg-red-500' },
    { status: ProjectStatus.ROUGH_IN, title: 'Rough-In', color: 'bg-purple-500' },
    { status: ProjectStatus.FINISHING, title: 'Finishing', color: 'bg-orange-500' },
    { status: ProjectStatus.COMPLETED, title: 'Completed', color: 'bg-green-500' },
  ];

  const getProjectsForStatus = (status: ProjectStatus) => {
    return projects.filter((p) => p.status === status);
  };

  const getClientName = (clientId: string) => {
    const client = users.find((u) => u.id === clientId);
    return client?.name || 'Unknown Client';
  };

  const getContractorName = (contractorId: string) => {
    const contractor = users.find((u) => u.id === contractorId);
    return contractor?.name || 'Unassigned';
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
                  columnProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => onSelectProject(project)}
                      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-care-orange/20 transition-all group"
                    >
                      <h4 className="font-bold text-sm text-gray-900 group-hover:text-care-orange transition-colors mb-2 truncate">
                        {project.title}
                      </h4>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-gray-400 font-bold uppercase">
                            Progress
                          </span>
                          <span className="text-care-orange font-black">
                            {project.progress}%
                          </span>
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
                            {new Date(project.estimatedEndDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <DollarSign size={12} className="text-gray-400" />
                          <span>${(project.budget || 0).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* View Arrow */}
                      <div className="mt-3 flex justify-end">
                        <ArrowRight
                          size={14}
                          className="text-gray-300 group-hover:text-care-orange transition-colors"
                        />
                      </div>
                    </div>
                  ))
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