
import React, { useState } from 'react';
import { Project, ProjectStatus, User, UserRole } from '../types';
import { ChevronLeft, MessageSquare, Camera, CheckCircle, Clock, User as UserIcon, Calendar, ArrowUpRight } from 'lucide-react';

interface ProjectDetailsProps {
  project: Project;
  user: User;
  onBack: () => void;
  onUpdateStatus: (projectId: string, status: ProjectStatus, progress: number) => void;
  onAddUpdate: (projectId: string, content: string) => void;
  onContactLead: (leadId: string) => void;
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project, user, onBack, onUpdateStatus, onAddUpdate, onContactLead }) => {
  const [newUpdate, setNewUpdate] = useState('');
  const canEdit = user.role === UserRole.CONTRACTOR || user.role === UserRole.ADMIN;

  const handleSubmitUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUpdate.trim()) {
      onAddUpdate(project.id, newUpdate);
      setNewUpdate('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-care-orange transition-all font-black uppercase tracking-widest text-[10px]"
        >
          <ChevronLeft size={18} />
          Back to Dashboard
        </button>
        <div className="flex gap-2">
           <button className="p-2.5 bg-gray-100 rounded-xl text-gray-400 hover:text-care-orange hover:bg-care-orange/5 transition-all"><ArrowUpRight size={18} /></button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-black/5 border border-gray-100 overflow-hidden">
        <div className="bg-[#1A1A1A] p-6 md:p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-care-orange/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-care-orange rounded-full animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-care-orange">Site Live</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">{project.title}</h1>
              <p className="text-white/50 text-sm md:text-base font-medium max-w-2xl leading-relaxed">{project.description}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 text-center min-w-[140px] w-full md:w-auto">
              <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-2">Stage</p>
              <p className="text-xl font-black text-care-orange uppercase tracking-tight">{project.status}</p>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
            <div className="lg:col-span-2 space-y-12">
              <section>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-black uppercase tracking-tight">Timeline & Progress</h2>
                  {canEdit && (
                    <button className="bg-gray-50 text-gray-400 hover:text-care-orange p-3 rounded-2xl transition-all border border-gray-100 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                      <Camera size={16} /> Attach Media
                    </button>
                  )}
                </div>

                <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-[2px] before:bg-gray-100/50">
                  {project.updates.map((update, idx) => (
                    <div key={idx} className="relative pl-10 group">
                      <div className="absolute left-0 top-1.5 w-[24px] h-[24px] bg-white border-4 border-care-orange rounded-full z-10 shadow-[0_0_10px_rgba(241,90,43,0.2)]"></div>
                      <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 group-hover:bg-white group-hover:border-care-orange/20 group-hover:shadow-xl transition-all duration-300">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-lg bg-care-orange/10 flex items-center justify-center text-care-orange font-black text-xs">{update.author[0]}</div>
                             <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">{update.author}</span>
                          </div>
                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{new Date(update.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed font-medium">{update.content}</p>
                        {update.imageUrl && (
                          <div className="mt-6 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                            <img src={update.imageUrl} alt="Update" className="w-full h-56 object-cover hover:scale-105 transition-transform duration-700" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {canEdit && (
                    <div className="relative pl-10">
                      <div className="absolute left-0 top-1.5 w-[24px] h-[24px] bg-care-orange rounded-full z-10 flex items-center justify-center shadow-lg shadow-care-orange/20">
                        <UserIcon size={12} className="text-white" />
                      </div>
                      <form onSubmit={handleSubmitUpdate} className="bg-white p-6 rounded-3xl border-2 border-dashed border-gray-200 focus-within:border-care-orange transition-colors">
                        <textarea
                          placeholder="Log site progress or blockers..."
                          className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 placeholder-gray-300 resize-none"
                          rows={3}
                          value={newUpdate}
                          onChange={(e) => setNewUpdate(e.target.value)}
                        />
                        <div className="flex justify-end mt-4">
                          <button type="submit" className="bg-care-orange text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:shadow-xl hover:shadow-care-orange/20 transition-all active:scale-95">Post Log</button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-8">
              <section className="bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100 space-y-8">
                <div className="space-y-4">
                   <h3 className="font-black text-gray-900 uppercase text-[10px] tracking-[0.3em]">Build Progress</h3>
                   <div className="relative pt-1">
                      <div className="flex items-end justify-between mb-3">
                        <span className="text-3xl font-black text-care-orange">{project.progress}<span className="text-sm">%</span></span>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{project.status}</span>
                      </div>
                      <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                        <div style={{ width: `${project.progress}%` }} className="h-full bg-care-orange rounded-full shadow-[0_0_10px_rgba(241,90,43,0.3)] transition-all duration-1000"></div>
                      </div>
                   </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-care-orange shadow-sm border border-gray-50"><Calendar size={20} /></div>
                    <div>
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em]">Handoff Target</p>
                      <p className="font-black text-gray-900 text-sm">{new Date(project.estimatedEndDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-care-orange shadow-sm border border-gray-50"><UserIcon size={20} /></div>
                    <div>
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em]">Site Lead</p>
                      <p className="font-black text-gray-900 text-sm">John Smith</p>
                    </div>
                  </div>
                </div>
              </section>

              <button 
                onClick={() => onContactLead(project.contractorId)}
                className="w-full bg-[#1A1A1A] text-white p-5 rounded-3xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[11px] hover:bg-care-orange transition-all group shadow-xl shadow-black/5"
              >
                <MessageSquare size={20} className="text-care-orange group-hover:text-white transition-colors" />
                Contact Site Lead
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;
