import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  X, 
  Star, 
  ChevronDown, 
  Check, 
  Trash2, 
  HardHat, 
  Home,
  AlertCircle
} from 'lucide-react';
import { Project, User, UserRole } from '../types';

interface ProjectTeamManagerProps {
  project: Project;
  users: User[];
  currentUser: User;
  onAddContractor: (projectId: string, contractorId: string) => Promise<void>;
  onRemoveContractor: (projectId: string, contractorId: string) => Promise<void>;
  onAddClient: (projectId: string, clientId: string) => Promise<void>;
  onRemoveClient: (projectId: string, clientId: string) => Promise<void>;
  onSetPrimaryContractor: (projectId: string, contractorId: string) => Promise<void>;
  onSetPrimaryClient: (projectId: string, clientId: string) => Promise<void>;
}

const ProjectTeamManager: React.FC<ProjectTeamManagerProps> = ({
  project,
  users,
  currentUser,
  onAddContractor,
  onRemoveContractor,
  onAddClient,
  onRemoveClient,
  onSetPrimaryContractor,
  onSetPrimaryClient
}) => {
  const [showAddContractor, setShowAddContractor] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const contractorDropdownRef = useRef<HTMLDivElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Get current team members
  const contractorIds = project.contractorIds || [project.contractorId];
  const clientIds = project.clientIds || [project.clientId];
  
  const teamContractors = users.filter(u => contractorIds.includes(u.id));
  const teamClients = users.filter(u => clientIds.includes(u.id));
  
  // Get available users to add
  const availableContractors = users.filter(
    u => u.role === UserRole.CONTRACTOR && !contractorIds.includes(u.id)
  );
  const availableClients = users.filter(
    u => u.role === UserRole.CLIENT && !clientIds.includes(u.id)
  );

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contractorDropdownRef.current && !contractorDropdownRef.current.contains(event.target as Node)) {
        setShowAddContractor(false);
      }
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setShowAddClient(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const canManageTeam = currentUser.role === UserRole.ADMIN;

  const handleAddContractor = async (contractorId: string) => {
    setLoading(`add-contractor-${contractorId}`);
    setError(null);
    try {
      await onAddContractor(project.id, contractorId);
      setShowAddContractor(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add contractor');
    } finally {
      setLoading(null);
    }
  };

  const handleRemoveContractor = async (contractorId: string) => {
    if (contractorId === project.contractorId) {
      setError('Cannot remove primary contractor. Set a new primary first.');
      return;
    }
    setLoading(`remove-contractor-${contractorId}`);
    setError(null);
    try {
      await onRemoveContractor(project.id, contractorId);
    } catch (err: any) {
      setError(err.message || 'Failed to remove contractor');
    } finally {
      setLoading(null);
    }
  };

  const handleSetPrimaryContractor = async (contractorId: string) => {
    setLoading(`primary-contractor-${contractorId}`);
    setError(null);
    try {
      await onSetPrimaryContractor(project.id, contractorId);
    } catch (err: any) {
      setError(err.message || 'Failed to set primary contractor');
    } finally {
      setLoading(null);
    }
  };

  const handleAddClient = async (clientId: string) => {
    setLoading(`add-client-${clientId}`);
    setError(null);
    try {
      await onAddClient(project.id, clientId);
      setShowAddClient(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add client');
    } finally {
      setLoading(null);
    }
  };

  const handleRemoveClient = async (clientId: string) => {
    if (clientId === project.clientId) {
      setError('Cannot remove primary client. Set a new primary first.');
      return;
    }
    setLoading(`remove-client-${clientId}`);
    setError(null);
    try {
      await onRemoveClient(project.id, clientId);
    } catch (err: any) {
      setError(err.message || 'Failed to remove client');
    } finally {
      setLoading(null);
    }
  };

  const handleSetPrimaryClient = async (clientId: string) => {
    setLoading(`primary-client-${clientId}`);
    setError(null);
    try {
      await onSetPrimaryClient(project.id, clientId);
    } catch (err: any) {
      setError(err.message || 'Failed to set primary client');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-care-orange/10 flex items-center justify-center">
            <Users className="text-care-orange" size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900">Project Team</h3>
            <p className="text-xs text-gray-500">
              {teamContractors.length} contractor{teamContractors.length !== 1 ? 's' : ''}, {teamClients.length} client{teamClients.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-600">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="p-5 space-y-6">
        {/* Contractors Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardHat size={16} className="text-gray-500" />
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Contractors
              </span>
            </div>
            {canManageTeam && (
              <div className="relative" ref={contractorDropdownRef}>
                <button
                  onClick={() => setShowAddContractor(!showAddContractor)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-care-orange hover:bg-care-orange/10 rounded-lg transition-colors"
                >
                  <UserPlus size={14} />
                  Add
                </button>
                
                {showAddContractor && availableContractors.length > 0 && (
                  <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                    {availableContractors.map(contractor => (
                      <button
                        key={contractor.id}
                        onClick={() => handleAddContractor(contractor.id)}
                        disabled={loading === `add-contractor-${contractor.id}`}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                          {contractor.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{contractor.name}</p>
                          <p className="text-xs text-gray-500 truncate">{contractor.specialty || contractor.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            {teamContractors.map(contractor => {
              const isPrimary = contractor.id === project.contractorId;
              return (
                <div
                  key={contractor.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    isPrimary ? 'border-care-orange/30 bg-care-orange/5' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                    {contractor.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate">{contractor.name}</p>
                      {isPrimary && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-care-orange text-white text-[10px] font-bold">
                          <Star size={8} className="fill-current" />
                          PRIMARY
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{contractor.specialty || contractor.email}</p>
                  </div>
                  
                  {canManageTeam && (
                    <div className="flex items-center gap-1">
                      {!isPrimary && (
                        <>
                          <button
                            onClick={() => handleSetPrimaryContractor(contractor.id)}
                            disabled={loading === `primary-contractor-${contractor.id}`}
                            className="p-2 text-gray-400 hover:text-care-orange hover:bg-care-orange/10 rounded-lg transition-colors"
                            title="Set as primary"
                          >
                            <Star size={14} />
                          </button>
                          <button
                            onClick={() => handleRemoveContractor(contractor.id)}
                            disabled={loading === `remove-contractor-${contractor.id}`}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove from project"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Clients Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Home size={16} className="text-gray-500" />
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Clients
              </span>
            </div>
            {canManageTeam && (
              <div className="relative" ref={clientDropdownRef}>
                <button
                  onClick={() => setShowAddClient(!showAddClient)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-care-orange hover:bg-care-orange/10 rounded-lg transition-colors"
                >
                  <UserPlus size={14} />
                  Add
                </button>
                
                {showAddClient && availableClients.length > 0 && (
                  <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                    {availableClients.map(client => (
                      <button
                        key={client.id}
                        onClick={() => handleAddClient(client.id)}
                        disabled={loading === `add-client-${client.id}`}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{client.name}</p>
                          <p className="text-xs text-gray-500 truncate">{client.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            {teamClients.map(client => {
              const isPrimary = client.id === project.clientId;
              return (
                <div
                  key={client.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    isPrimary ? 'border-care-orange/30 bg-care-orange/5' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate">{client.name}</p>
                      {isPrimary && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-care-orange text-white text-[10px] font-bold">
                          <Star size={8} className="fill-current" />
                          PRIMARY
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{client.email}</p>
                  </div>
                  
                  {canManageTeam && (
                    <div className="flex items-center gap-1">
                      {!isPrimary && (
                        <>
                          <button
                            onClick={() => handleSetPrimaryClient(client.id)}
                            disabled={loading === `primary-client-${client.id}`}
                            className="p-2 text-gray-400 hover:text-care-orange hover:bg-care-orange/10 rounded-lg transition-colors"
                            title="Set as primary"
                          >
                            <Star size={14} />
                          </button>
                          <button
                            onClick={() => handleRemoveClient(client.id)}
                            disabled={loading === `remove-client-${client.id}`}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove from project"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectTeamManager;