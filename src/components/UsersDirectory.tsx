import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Mail, Phone, MapPin, Award, User as UserIcon, X, Briefcase, MessageSquare, UserPlus, HardHat, Trash2 } from 'lucide-react';

interface UsersDirectoryProps {
  users: User[];
  currentUser: User;
  onMessageUser: (user: User) => void;
  onOpenCreateClientModal: () => void;
  onOpenCreateContractorModal: () => void;
  onDeleteUser?: (userId: string) => void;
}

const UsersDirectory: React.FC<UsersDirectoryProps> = ({ 
  users, 
  currentUser, 
  onMessageUser,
  onOpenCreateClientModal,
  onOpenCreateContractorModal,
  onDeleteUser
}) => {
  const [selectedProfile, setSelectedProfile] = useState<User | null>(null);

  const contractors = users.filter(u => u.role === UserRole.CONTRACTOR);
  const admins = users.filter(u => u.role === UserRole.ADMIN);
  const clients = users.filter(u => u.role === UserRole.CLIENT);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return { bg: 'bg-purple-500', text: 'Admin' };
      case UserRole.CONTRACTOR: return { bg: 'bg-care-orange', text: 'Contractor' };
      case UserRole.CLIENT: return { bg: 'bg-green-500', text: 'Client' };
    }
  };

  const UserCard = ({ user }: { user: User }) => {
    const badge = getRoleBadge(user.role);
    
    return (
      <div 
        onClick={() => setSelectedProfile(user)}
        className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-care-orange/20 transition-all cursor-pointer group"
      >
        <div className="relative inline-block mb-4">
          <img 
            src={user.avatar || 'https://via.placeholder.com/80'} 
            alt={user.name} 
            className="w-20 h-20 rounded-2xl object-cover border-2 border-transparent group-hover:border-care-orange transition-all mx-auto" 
          />
          <div className={`absolute -bottom-1 -right-1 ${badge.bg} text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase`}>
            {badge.text}
          </div>
        </div>
        <h3 className="font-bold text-gray-900 group-hover:text-care-orange transition-colors text-center">{user.name}</h3>
        <p className="text-xs text-gray-500 text-center mt-1">{user.specialty || user.email}</p>
        
        <div className="mt-4 pt-4 border-t border-gray-50 flex justify-center gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); onMessageUser(user); }} 
            className="p-2 hover:text-care-orange hover:bg-care-orange/5 rounded-lg transition-all text-gray-400"
          >
            <MessageSquare size={16} />
          </button>
          {user.email && (
            <a 
              href={`mailto:${user.email}`}
              onClick={(e) => e.stopPropagation()}
              className="p-2 hover:text-care-orange hover:bg-care-orange/5 rounded-lg transition-all text-gray-400"
            >
              <Mail size={16} />
            </a>
          )}
          {user.phone && (
            <a 
              href={`tel:${user.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="p-2 hover:text-care-orange hover:bg-care-orange/5 rounded-lg transition-all text-gray-400"
            >
              <Phone size={16} />
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Team Directory</h1>
          <p className="text-gray-500 font-medium">Manage clients and contractors</p>
        </div>
        {currentUser.role === UserRole.ADMIN && (
          <div className="flex gap-2">
            <button
              onClick={onOpenCreateClientModal}
              className="bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:shadow-lg hover:shadow-green-600/20 transition-all"
            >
              <UserPlus size={16} />
              Add Client
            </button>
            <button
              onClick={onOpenCreateContractorModal}
              className="bg-care-orange text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:shadow-lg hover:shadow-care-orange/20 transition-all"
            >
              <HardHat size={16} />
              Add Contractor
            </button>
          </div>
        )}
      </div>

      {/* Contractors Section */}
      <section>
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-3">
          <HardHat size={16} className="text-care-orange" />
          Field Contractors ({contractors.length})
          <div className="h-px flex-1 bg-gray-100"></div>
        </h2>
        {contractors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {contractors.map(u => <UserCard key={u.id} user={u} />)}
          </div>
        ) : (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
            <HardHat size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No contractors yet</p>
            {currentUser.role === UserRole.ADMIN && (
              <button 
                onClick={onOpenCreateContractorModal}
                className="mt-3 text-care-orange font-bold text-sm hover:underline"
              >
                Add your first contractor →
              </button>
            )}
          </div>
        )}
      </section>

      {/* Clients Section */}
      {currentUser.role === UserRole.ADMIN && (
        <section>
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-3">
            <UserIcon size={16} className="text-green-500" />
            Clients ({clients.length})
            <div className="h-px flex-1 bg-gray-100"></div>
          </h2>
          {clients.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {clients.map(u => <UserCard key={u.id} user={u} />)}
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
              <UserIcon size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No clients yet</p>
              <button 
                onClick={onOpenCreateClientModal}
                className="mt-3 text-green-600 font-bold text-sm hover:underline"
              >
                Add your first client →
              </button>
            </div>
          )}
        </section>
      )}

      {/* Admins Section */}
      {admins.length > 0 && (
        <section>
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-3">
            <Award size={16} className="text-purple-500" />
            Administrators ({admins.length})
            <div className="h-px flex-1 bg-gray-100"></div>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {admins.map(u => <UserCard key={u.id} user={u} />)}
          </div>
        </section>
      )}

      {/* Profile Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedProfile(null)}></div>
          
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={`${getRoleBadge(selectedProfile.role).bg} p-8 text-white text-center relative`}>
              <button 
                onClick={() => setSelectedProfile(null)}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
              <img 
                src={selectedProfile.avatar || 'https://via.placeholder.com/100'} 
                alt={selectedProfile.name}
                className="w-24 h-24 rounded-2xl object-cover mx-auto border-4 border-white/20"
              />
              <h2 className="text-2xl font-black mt-4">{selectedProfile.name}</h2>
              <p className="text-white/70 text-sm uppercase tracking-widest font-bold mt-1">{selectedProfile.role}</p>
            </div>

            <div className="p-6 space-y-4">
              {selectedProfile.specialty && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Briefcase size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-bold">Specialty</p>
                    <p className="font-bold">{selectedProfile.specialty}</p>
                  </div>
                </div>
              )}
              {selectedProfile.experience && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Award size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-bold">Experience</p>
                    <p className="font-bold">{selectedProfile.experience}</p>
                  </div>
                </div>
              )}
              {selectedProfile.email && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Mail size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-bold">Email</p>
                    <p className="font-bold">{selectedProfile.email}</p>
                  </div>
                </div>
              )}
              {selectedProfile.phone && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Phone size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-bold">Phone</p>
                    <p className="font-bold">{selectedProfile.phone}</p>
                  </div>
                </div>
              )}
              {selectedProfile.location && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <MapPin size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-bold">Location</p>
                    <p className="font-bold">{selectedProfile.location}</p>
                  </div>
                </div>
              )}
              {selectedProfile.bio && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 uppercase font-bold mb-1">Bio</p>
                  <p className="text-gray-600">{selectedProfile.bio}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => { onMessageUser(selectedProfile); setSelectedProfile(null); }}
                  className="flex-1 py-3 bg-care-orange text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-all"
                >
                  <MessageSquare size={18} />
                  Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersDirectory;
