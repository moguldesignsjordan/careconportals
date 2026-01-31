import React, { useState, useEffect } from 'react';
import { X, Briefcase, User as UserIcon, Calendar, DollarSign, AlignLeft, Loader2 } from 'lucide-react';
import { User, UserRole, ProjectStatus, Project } from '../types';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: User[];
  contractors: User[];
  currentUser: User;
  onCreate: (project: Omit<Project, 'id' | 'updates' | 'createdAt'>) => Promise<void>;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ 
  isOpen, 
  onClose, 
  clients, 
  contractors,
  currentUser,
  onCreate 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    clientId: '',
    contractorId: currentUser.role === UserRole.CONTRACTOR ? currentUser.id : '',
    budget: '',
    startDate: new Date().toISOString().split('T')[0],
    estimatedEndDate: '',
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        description: '',
        clientId: '',
        contractorId: currentUser.role === UserRole.CONTRACTOR ? currentUser.id : '',
        budget: '',
        startDate: new Date().toISOString().split('T')[0],
        estimatedEndDate: '',
      });
      setError(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError('Project title is required');
      return;
    }
    if (!formData.clientId) {
      setError('Please select a client');
      return;
    }
    if (!formData.estimatedEndDate) {
      setError('End date is required');
      return;
    }
    if (!formData.contractorId && currentUser.role !== UserRole.CONTRACTOR) {
      setError('Please assign a contractor');
      return;
    }

    setLoading(true);
    try {
      await onCreate({
        title: formData.title.trim(),
        description: formData.description.trim(),
        status: ProjectStatus.PLANNING,
        progress: 0,
        clientId: formData.clientId,
        contractorId: formData.contractorId || currentUser.id,
        startDate: formData.startDate,
        estimatedEndDate: formData.estimatedEndDate,
        budget: Number(formData.budget) || 0,
        spent: 0,
      });
      
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
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
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Project Title *</label>
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
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Link Client *</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold appearance-none cursor-pointer"
                    value={formData.clientId}
                    onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                  >
                    <option value="">Select Client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {clients.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No clients available. Add a client first.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Assign Contractor</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    disabled={currentUser.role === UserRole.CONTRACTOR}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold appearance-none disabled:opacity-60 cursor-pointer"
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

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Budget ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="number"
                    placeholder="50000"
                    min="0"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold"
                    value={formData.budget}
                    onChange={e => setFormData({ ...formData, budget: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">End Date *</label>
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

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-6 border-2 border-gray-200 rounded-xl font-black uppercase tracking-widest text-xs text-gray-600 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || clients.length === 0}
              className="flex-1 py-3 px-6 bg-care-orange text-white rounded-xl font-black uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-care-orange/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                'Launch Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
