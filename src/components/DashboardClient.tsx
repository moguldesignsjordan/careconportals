
import React from 'react';
import { Project, UserRole } from '../types';
import ProjectCard from './ProjectCard';
import { Sparkles, MessageSquare, FileText, CheckCircle } from 'lucide-react';
import CalendarModule from './CalendarModule';

interface DashboardClientProps {
  projects: Project[];
  onSelectProject: (p: Project) => void;
}

const DashboardClient: React.FC<DashboardClientProps> = ({ projects, onSelectProject }) => {
  const activeProjects = projects.filter(p => p.progress < 100);
  const completedProjects = projects.filter(p => p.progress === 100);

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Welcome Home! <Sparkles className="text-yellow-400" />
          </h1>
          <p className="text-gray-500 text-lg mt-1">Here is how your home project is coming along.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors">
            <MessageSquare size={18} className="text-care-orange" />
            Chat with Contractor
          </button>
          <button className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors">
            <FileText size={18} className="text-care-orange" />
            Project Documents
          </button>
        </div>
      </header>

      {activeProjects.length > 0 ? (
        <section className="space-y-8">
          <div>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              Active Construction
              <span className="bg-care-orange text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter">Live</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeProjects.map(p => (
                <ProjectCard key={p.id} project={p} onClick={onSelectProject} />
              ))}
            </div>
          </div>

          <div className="pt-8">
            <h2 className="text-xl font-bold mb-6">Home Milestones</h2>
            <CalendarModule role={UserRole.CLIENT} />
          </div>
        </section>
      ) : (
        <div className="bg-care-orange/5 border-2 border-dashed border-care-orange/20 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-care-orange">
            <Sparkles size={32} />
          </div>
          <h3 className="text-xl font-bold mb-2">Ready to start something new?</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">Explore our services and get a quote for your next renovation project today.</p>
          <button className="bg-care-orange text-white px-6 py-2 rounded-full font-bold hover:opacity-90 transition-opacity">
            Start New Project
          </button>
        </div>
      )}

      {completedProjects.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            Past Masterpieces
            <CheckCircle className="text-green-500" size={20} />
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
            {completedProjects.map(p => (
              <ProjectCard key={p.id} project={p} onClick={onSelectProject} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default DashboardClient;
