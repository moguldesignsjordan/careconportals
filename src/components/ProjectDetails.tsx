import React, { useState } from 'react';
import { Project, ProjectStatus, User, UserRole } from '../types';
import { 
  ChevronLeft, MessageSquare, Camera, CheckCircle, Clock, 
  User as UserIcon, Calendar, DollarSign, Edit3, Send, Loader2
} from 'lucide-react';

interface ProjectDetailsProps {
  project: Project;
  currentUser: User;
  users: User[];
  onBack: () => void;
  onUpdateStatus: (projectId: string, status: ProjectStatus, progress: number) => Promise<void>;
  onAddUpdate: (projectId: string, content: string) => Promise<void>;
  onMessage: (user: User) => void;
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ 
  project, 
  currentUser, 
  users,
  onBack, 
  onUpdateStatus, 
  onAddUpdate, 
  onMessage 
}) => {
  const [newUpdate, setNewUpdate] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [tempProgress, setTempProgress] = useState(project.progress);
  const [tempStatus, setTempStatus] = useState(project.status);

  const canEdit = currentUser.role === UserRole.CONTRACTOR || currentUser.role === UserRole.ADMIN;

  const client = users.find(u => u.id === project.clientId);
  const contractor = users.find(u => u.id === project.contractorId);

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdate.trim() || isPostingUpdate) return;
    
    setIsPostingUpdate(true);
    try {
      await onAddUpdate(project.id, newUpdate);
      setNewUpdate('');
    } finally {
      setIsPostingUpdate(false);
    }
  };

  const handleSaveStatus = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onUpdateStatus(project.id, tempStatus, tempProgress);
      setEditMode(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const statusOptions = Object.values(ProjectStatus);

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
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-care-orange transition-all font-bold text-sm"
      >
        <ChevronLeft size={18} />
        Back to Dashboard
      </button>

      {/* Main Card */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-[#1A1A1A] p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-care-orange/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black mb-2">{project.title}</h1>
                <p className="text-gray-400">{project.description || 'No description provided'}</p>
              </div>
              <span className={`self-start px-4 py-2 rounded-full text-sm font-black uppercase tracking-wider ${getStatusColor(project.status)}`}>
                {project.status}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="p-8 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Project Progress</h3>
            {canEdit && !editMode && (
              <button 
                onClick={() => setEditMode(true)}
                className="text-care-orange hover:text-orange-600 font-bold text-sm flex items-center gap-1"
              >
                <Edit3 size={14} />
                Edit
              </button>
            )}
          </div>

          {editMode ? (
            <div className="space-y-4 bg-gray-50 p-4 rounded-xl">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block">Status</label>
                <select
                  value={tempStatus}
                  onChange={(e) => setTempStatus(e.target.value as ProjectStatus)}
                  className="w-full p-3 border border-gray-200 rounded-xl font-bold"
                >
                  {statusOptions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block">Progress: {tempProgress}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={tempProgress}
                  onChange={(e) => setTempProgress(Number(e.target.value))}
                  className="w-full accent-care-orange"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditMode(false);
                    setTempProgress(project.progress);
                    setTempStatus(project.status);
                  }}
                  className="flex-1 py-2 border border-gray-200 rounded-xl font-bold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveStatus}
                  disabled={isUpdating}
                  className="flex-1 py-2 bg-care-orange text-white rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {isUpdating ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-end mb-2">
                <span className="text-3xl font-black text-care-orange">{project.progress}%</span>
              </div>
              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-care-orange to-orange-400 rounded-full transition-all duration-500" 
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </>
          )}
        </div>

        {/* Details Grid */}
        <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <Calendar className="mx-auto mb-2 text-gray-400" size={20} />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Start Date</p>
            <p className="font-bold mt-1">{new Date(project.startDate).toLocaleDateString()}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <Clock className="mx-auto mb-2 text-gray-400" size={20} />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">End Date</p>
            <p className="font-bold mt-1">{new Date(project.estimatedEndDate).toLocaleDateString()}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <DollarSign className="mx-auto mb-2 text-gray-400" size={20} />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Budget</p>
            <p className="font-bold mt-1">${(project.budget || 0).toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <DollarSign className="mx-auto mb-2 text-gray-400" size={20} />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Spent</p>
            <p className="font-bold mt-1">${(project.spent || 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Team Section */}
        <div className="p-8 border-t border-gray-100">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Project Team</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {client && (
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <img src={client.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=F15A2B&color=fff`} alt={client.name} className="w-12 h-12 rounded-xl object-cover" />
                <div className="flex-1">
                  <p className="font-bold">{client.name}</p>
                  <p className="text-xs text-gray-500">Client</p>
                </div>
                <button 
                  onClick={() => onMessage(client)}
                  className="p-2 text-care-orange hover:bg-care-orange/10 rounded-lg transition-all"
                >
                  <MessageSquare size={18} />
                </button>
              </div>
            )}
            {contractor && (
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <img src={contractor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contractor.name)}&background=F15A2B&color=fff`} alt={contractor.name} className="w-12 h-12 rounded-xl object-cover" />
                <div className="flex-1">
                  <p className="font-bold">{contractor.name}</p>
                  <p className="text-xs text-gray-500">Contractor • {contractor.specialty || 'General'}</p>
                </div>
                <button 
                  onClick={() => onMessage(contractor)}
                  className="p-2 text-care-orange hover:bg-care-orange/10 rounded-lg transition-all"
                >
                  <MessageSquare size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Updates Section */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-100">
          <h3 className="text-lg font-black">Site Updates</h3>
        </div>

        {/* Post Update Form */}
        {canEdit && (
          <form onSubmit={handleSubmitUpdate} className="p-6 border-b border-gray-100 bg-gray-50">
            <div className="flex gap-3">
              <img 
                src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=F15A2B&color=fff`} 
                alt={currentUser.name}
                className="w-10 h-10 rounded-xl object-cover shrink-0"
              />
              <div className="flex-1">
                <textarea
                  value={newUpdate}
                  onChange={(e) => setNewUpdate(e.target.value)}
                  placeholder="Post a site update..."
                  rows={2}
                  className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:border-care-orange focus:ring-0 transition-all"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={!newUpdate.trim() || isPostingUpdate}
                    className="bg-care-orange text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPostingUpdate ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Post Update
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Updates List */}
        <div className="divide-y divide-gray-100">
          {project.updates && project.updates.length > 0 ? (
            [...project.updates].reverse().map((update) => (
              <div key={update.id} className="p-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-care-orange/10 rounded-xl flex items-center justify-center text-care-orange shrink-0">
                    <UserIcon size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold">{update.author}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(update.timestamp).toLocaleDateString()} at {new Date(update.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-gray-600">{update.content}</p>
                    {update.imageUrl && (
                      <img src={update.imageUrl} alt="Update" className="mt-3 rounded-xl max-w-md" />
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-gray-400">
              <Camera size={40} className="mx-auto mb-3 opacity-30" />
              <p>No updates yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;
