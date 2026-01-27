
import React from 'react';
import { Project, ProjectStatus } from '../types';
import { Calendar, Clock, DollarSign, TrendingUp } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onClick: (project: Project) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.PLANNING: return 'bg-blue-100 text-blue-700';
      case ProjectStatus.ROUGH_IN: return 'bg-purple-100 text-purple-700';
      case ProjectStatus.FINISHING: return 'bg-orange-100 text-orange-700';
      case ProjectStatus.COMPLETED: return 'bg-green-100 text-green-700';
      case ProjectStatus.ON_HOLD: return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div 
      onClick={() => onClick(project)}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold group-hover:text-care-orange transition-colors">{project.title}</h3>
          <p className="text-sm text-gray-500 mt-1 line-clamp-1">{project.description}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider ${getStatusColor(project.status)}`}>
          {project.status}
        </span>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-medium text-gray-600">Overall Progress</span>
          <span className="text-sm font-bold text-care-orange">{project.progress}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-care-orange transition-all duration-500" 
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar size={16} className="text-care-orange" />
          <span>Ends {new Date(project.estimatedEndDate).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <DollarSign size={16} className="text-care-orange" />
          <span>${project.budget.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
