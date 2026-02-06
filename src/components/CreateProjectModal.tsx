import React, { useState, useEffect, useRef } from 'react';
import { X, Briefcase, User as UserIcon, Calendar, DollarSign, AlignLeft, Loader2, Check, ChevronDown, Star } from 'lucide-react';
import { User, UserRole, ProjectStatus, Project } from '../types';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: User[];
  contractors: User[];
  currentUser: User;
  onCreate: (project: Omit<Project, 'id' | 'updates' | 'createdAt'>) => Promise<void>;
}

// Multi-select dropdown component
interface MultiSelectDropdownProps {
  label: string;
  placeholder: string;
  options: User[];
  selectedIds: string[];
  primaryId: string;
  onSelectionChange: (ids: string[], newPrimaryId?: string) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  placeholder,
  options,
  selectedIds,
  primaryId,
  onSelectionChange,
  disabled,
  icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleSelection = (userId: string) => {
    if (selectedIds.includes(userId)) {
      // Don't allow removing if it's the only selection
      if (selectedIds.length === 1) return;
      
      const newIds = selectedIds.filter(id => id !== userId);
      // If removing the primary, set a new primary
      if (userId === primaryId) {
        onSelectionChange(newIds, newIds[0]);
      } else {
        onSelectionChange(newIds);
      }
    } else {
      const newIds = [...selectedIds, userId];
      // If this is the first selection, make it primary
      if (selectedIds.length === 0) {
        onSelectionChange(newIds, userId);
      } else {
        onSelectionChange(newIds);
      }
    }
  };

  const handleSetPrimary = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (selectedIds.includes(userId)) {
      // Pass the same ids but with new primary
      onSelectionChange(selectedIds, userId);
    }
  };

  const selectedUsers = options.filter(u => selectedIds.includes(u.id));

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
        {label}
      </label>
      
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-left flex items-center gap-2 ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-gray-200'
        }`}
      >
        {icon && <span className="text-gray-400">{icon}</span>}
        
        <div className="flex-1 min-w-0">
          {selectedUsers.length === 0 ? (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selectedUsers.map(user => (
                <span
                  key={user.id}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    user.id === primaryId
                      ? 'bg-care-orange text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {user.id === primaryId && <Star size={10} className="fill-current" />}
                  {user.name}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <ChevronDown 
          size={18} 
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No options available
            </div>
          ) : (
            options.map(user => {
              const isSelected = selectedIds.includes(user.id);
              const isPrimary = user.id === primaryId;
              
              return (
                <div
                  key={user.id}
                  onClick={() => handleToggleSelection(user.id)}
                  className={`px-4 py-3 cursor-pointer flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-care-orange/5' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    isSelected 
                      ? 'bg-care-orange border-care-orange' 
                      : 'border-gray-300'
                  }`}>
                    {isSelected && <Check size={14} className="text-white" />}
                  </div>
                  
                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {user.name}
                      </span>
                      {isPrimary && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-care-orange/10 text-care-orange text-[10px] font-bold">
                          <Star size={8} className="fill-current" />
                          PRIMARY
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 truncate block">
                      {user.email}
                    </span>
                  </div>
                  
                  {/* Set as primary button */}
                  {isSelected && !isPrimary && (
                    <button
                      type="button"
                      onClick={(e) => handleSetPrimary(e, user.id)}
                      className="px-2 py-1 text-[10px] font-bold text-gray-500 hover:text-care-orange hover:bg-care-orange/10 rounded transition-colors"
                    >
                      Set Primary
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

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
    // Multi-select arrays
    clientIds: [] as string[],
    contractorIds: currentUser.role === UserRole.CONTRACTOR ? [currentUser.id] : [] as string[],
    // Primary selections
    primaryClientId: '',
    primaryContractorId: currentUser.role === UserRole.CONTRACTOR ? currentUser.id : '',
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
        clientIds: [],
        contractorIds: currentUser.role === UserRole.CONTRACTOR ? [currentUser.id] : [],
        primaryClientId: '',
        primaryContractorId: currentUser.role === UserRole.CONTRACTOR ? currentUser.id : '',
        budget: '',
        startDate: new Date().toISOString().split('T')[0],
        estimatedEndDate: '',
      });
      setError(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Combined handlers that update both ids and primary in one setState call
  const handleClientSelectionChange = (ids: string[], newPrimaryId?: string) => {
    setFormData(prev => ({
      ...prev,
      clientIds: ids,
      // If newPrimaryId is provided, use it; otherwise keep existing (unless it's no longer in the list)
      primaryClientId: newPrimaryId !== undefined 
        ? newPrimaryId 
        : (ids.includes(prev.primaryClientId) ? prev.primaryClientId : (ids[0] || ''))
    }));
  };

  const handleContractorSelectionChange = (ids: string[], newPrimaryId?: string) => {
    setFormData(prev => ({
      ...prev,
      contractorIds: ids,
      primaryContractorId: newPrimaryId !== undefined 
        ? newPrimaryId 
        : (ids.includes(prev.primaryContractorId) ? prev.primaryContractorId : (ids[0] || ''))
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError('Project title is required');
      return;
    }
    if (formData.clientIds.length === 0) {
      setError('Please select at least one client');
      return;
    }
    if (!formData.estimatedEndDate) {
      setError('End date is required');
      return;
    }
    if (formData.contractorIds.length === 0 && currentUser.role !== UserRole.CONTRACTOR) {
      setError('Please assign at least one contractor');
      return;
    }

    setLoading(true);
    try {
        await onCreate({
        title: formData.title.trim(),
        description: formData.description.trim(),
        status: ProjectStatus.PLANNING,
        progress: 0,
        // Primary IDs for backwards compatibility
        clientId: formData.primaryClientId || formData.clientIds[0],
        contractorId:
          formData.primaryContractorId ||
          formData.contractorIds[0] ||
          currentUser.id,
        // Multi-select arrays
        clientIds: formData.clientIds,
        contractorIds:
          formData.contractorIds.length > 0 ? formData.contractorIds : [currentUser.id],
        startDate: formData.startDate,
        estimatedEndDate: formData.estimatedEndDate,
        budget: parseFloat(formData.budget) || 0,
        spent: 0,
        milestones: []
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-care-orange/10 flex items-center justify-center">
              <Briefcase className="text-care-orange" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">Create Project</h2>
              <p className="text-xs text-gray-500">Set up a new construction project</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* Project Title */}
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              Project Title *
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="e.g. Master Suite Renovation"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Brief overview of the scope of work..."
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-medium"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Client Multi-Select */}
          <MultiSelectDropdown
            label="Link Clients *"
            placeholder="Select clients..."
            options={clients}
            selectedIds={formData.clientIds}
            primaryId={formData.primaryClientId}
            onSelectionChange={handleClientSelectionChange}
            icon={<UserIcon size={18} />}
          />
          {clients.length === 0 && (
            <p className="text-xs text-amber-600 -mt-3">No clients available. Add a client first.</p>
          )}

          {/* Contractor Multi-Select */}
          <MultiSelectDropdown
            label="Assign Contractors"
            placeholder="Select contractors..."
            options={contractors}
            selectedIds={formData.contractorIds}
            primaryId={formData.primaryContractorId}
            onSelectionChange={handleContractorSelectionChange}
            disabled={currentUser.role === UserRole.CONTRACTOR}
            icon={<UserIcon size={18} />}
          />

          {/* Budget and Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                Budget ($)
              </label>
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
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                Start Date
              </label>
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
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                End Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="date"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold"
                  value={formData.estimatedEndDate}
                  onChange={e => setFormData({ ...formData, estimatedEndDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Info about primary selection */}
          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
            <p className="flex items-center gap-2">
              <Star size={12} className="text-care-orange fill-care-orange" />
              <span>
                <strong className="text-gray-700">Primary</strong> users are the main point of contact. 
                Click "Set Primary" in the dropdown to change.
              </span>
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-care-orange text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-care-orange/90 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;