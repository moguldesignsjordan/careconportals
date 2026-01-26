
import React, { useState } from 'react';
import { X, Briefcase, User as UserIcon, Calendar, DollarSign, AlignLeft } from 'lucide-react';
import { User, UserRole, ProjectStatus, Project } from '../types';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: User[];
  contractors: User[];
  currentUser: User;
  onCreate: (project: Omit<Project, 'id' | 'updates'>) => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ 
  isOpen, 
  onClose, 
  clients, 
  contractors,
  currentUser,
  onCreate 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    clientId: '',
    contractorId: currentUser.role === UserRole.CONTRACTOR ? currentUser.id : '',
    budget: '',
    startDate: new Date().toISOString().split('T')[0],
    estimatedEndDate: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.clientId || !formData.estimatedEndDate) return;

    onCreate({
      title: formData.title,
      description: formData.description,
      status: ProjectStatus.PLANNING,
      progress: 0,
      clientId: formData.clientId,
      contractorId: formData.contractorId || currentUser.id,
      startDate: formData.startDate,
      estimatedEndDate: formData.estimatedEndDate,
      budget: Number(formData.budget) || 0,
      spent: 0,
    });
    
    // Reset and close
    setFormData({
      title: '',
      description: '',
      clientId: '',
      contractorId: currentUser.role === UserRole.CONTRACTOR ? currentUser.id : '',
      budget: '',
      startDate: new Date().toISOString().split('T')[0],
      estimatedEndDate: '',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1A1A1A]/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-[#1A1A1A] p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-care-orange rounded-xl flex items-center justify-center">
              <Briefcase size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Create New Project</h2>
              <p className="text-white/50 text-xs font-bold tracking-widest uppercase">Project Setup & Linking</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Project Title</label>
              <div className="relative">
                <AlignLeft className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  required
                  type="text"
                  placeholder="e.g. Master Suite Renovation"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
              <textarea
                rows={2}
                placeholder="Brief overview of the scope of work..."
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-medium"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Link Client</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold appearance-none"
                    value={formData.clientId}
                    onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                  >
                    <option value="">Select Client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Assign Contractor</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    disabled={currentUser.role === UserRole.CONTRACTOR}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold appearance-none disabled:opacity-60"
                    value={formData.contractorId}
                    onChange={e => setFormData({ ...formData, contractorId: e.target.value })}
                  >
                    <option value="">Select Contractor</option>
                    {contractors.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Budget ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="number"
                    placeholder="Total Budget"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold"
                    value={formData.budget}
                    onChange={e => setFormData({ ...formData, budget: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Est. Completion Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    required
                    type="date"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold"
                    value={formData.estimatedEndDate}
                    onChange={e => setFormData({ ...formData, estimatedEndDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-care-orange text-white py-4 rounded-xl font-black uppercase tracking-widest hover:shadow-xl hover:shadow-care-orange/20 transition-all active:scale-[0.98]"
          >
            Launch Project
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
