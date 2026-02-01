import React from 'react';
import { Project, ProjectStatus } from '../types';
import { Calendar, DollarSign } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onClick: (project: Project) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.PLANNING: return 'bg-blue-100 text-blue-700';
      case ProjectStatus.DEMOLITION: return 'bg-red-100 text-red-700';
      case ProjectStatus.ROUGH_IN: return 'bg-purple-100 text-purple-700';
      case ProjectStatus.FINISHING: return 'bg-orange-100 text-orange-700';
      case ProjectStatus.COMPLETED: return 'bg-green-100 text-green-700';
      case ProjectStatus.ON_HOLD: return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div 
      onClick={() => onClick(project)}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:border-care-orange/20 transition-all cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold group-hover:text-care-orange transition-colors truncate">{project.title}</h3>
          <p className="text-sm text-gray-500 mt-1 line-clamp-1">{project.description || 'No description'}</p>
        </div>
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ml-2 shrink-0 ${getStatusColor(project.status)}`}>
          {project.status}
        </span>
      </div>

      <div className="mb-5">
        <div className="flex justify-between items-end mb-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Progress</span>
          <span className="text-sm font-black text-care-orange">{project.progress}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-care-orange to-orange-400 transition-all duration-500 rounded-full" 
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2 text-gray-500">
          <Calendar size={14} className="text-care-orange" />
          <span className="font-medium">{new Date(project.estimatedEndDate).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <DollarSign size={14} className="text-care-orange" />
          <span className="font-medium">${(project.budget || 0).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;