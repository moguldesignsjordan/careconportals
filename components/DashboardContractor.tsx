
import React from 'react';
import { Project, UserRole } from '../types';
import ProjectCard from './ProjectCard';
import { MapPin, Hammer, Calendar, TrendingUp, Plus } from 'lucide-react';
import CalendarModule from './CalendarModule';

interface DashboardContractorProps {
  projects: Project[];
  onSelectProject: (p: Project) => void;
  onOpenCreateModal: () => void;
}

const DashboardContractor: React.FC<DashboardContractorProps> = ({ 
  projects, 
  onSelectProject,
  onOpenCreateModal
}) => {
  const activeProjects = projects.filter(p => p.progress < 100);
  
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Field Dashboard</h1>
          <p className="text-gray-500 font-medium">Managing {activeProjects.length} active sites today.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-sm font-black text-gray-400 uppercase tracking-widest mr-4">
            <Calendar size={18} className="text-care-orange" />
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
          <button 
            onClick={onOpenCreateModal}
            className="bg-care-orange text-white px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:shadow-lg hover:shadow-care-orange/20 transition-all active:scale-95"
          >
            <Plus size={18} />
            New Project
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-12">
          <section>
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Hammer size={16} className="text-care-orange" />
              Active Sites
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeProjects.length > 0 ? (
                activeProjects.map(p => (
                  <ProjectCard key={p.id} project={p} onClick={onSelectProject} />
                ))
              ) : (
                <div className="col-span-full bg-white border-2 border-dashed border-gray-100 rounded-3xl p-12 text-center">
                  <p className="text-gray-400 font-bold italic">No active projects assigned.</p>
                  <button 
                    onClick={onOpenCreateModal}
                    className="mt-4 text-care-orange font-black uppercase text-xs tracking-widest hover:underline"
                  >
                    Launch your first project
                  </button>
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Field Schedule</h2>
            <CalendarModule role={UserRole.CONTRACTOR} />
          </section>
        </div>

        <div className="space-y-6">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Field Priorities</h2>
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-care-orange/10 rounded-xl flex items-center justify-center text-care-orange shrink-0">
                <MapPin size={20} />
              </div>
              <div>
                <p className="font-black text-gray-900">Connor Residence</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Rough-in inspection @ 2 PM</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="font-black text-gray-900">Supplier Run</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Pick up drywall @ Depot</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1A1A1A] text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-care-orange/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
            <h3 className="text-xs font-black uppercase tracking-widest text-care-orange mb-4 relative z-10">Safety & Ethics</h3>
            <p className="text-sm text-gray-300 italic relative z-10 font-medium">"Quality is never an accident; it is always the result of high intention."</p>
            <div className="mt-6 pt-6 border-t border-white/5 text-[10px] text-white/30 font-bold uppercase tracking-widest relative z-10">
              Check all safety gear before starting work.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardContractor;
