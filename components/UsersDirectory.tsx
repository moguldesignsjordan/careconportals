
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Mail, Phone, MapPin, Award, User as UserIcon, X, Briefcase, ChevronRight, MessageSquare } from 'lucide-react';

interface UsersDirectoryProps {
  users: User[];
  currentUser: User;
  onMessageUser: (user: User) => void;
}

const UsersDirectory: React.FC<UsersDirectoryProps> = ({ users, currentUser, onMessageUser }) => {
  const [selectedProfile, setSelectedProfile] = useState<User | null>(null);

  const contractors = users.filter(u => u.role === UserRole.CONTRACTOR);
  const admins = users.filter(u => u.role === UserRole.ADMIN);
  const clients = users.filter(u => u.role === UserRole.CLIENT);

  const UserCard = ({ user }: { user: User }) => (
    <div 
      onClick={() => setSelectedProfile(user)}
      className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-care-orange/20 transition-all cursor-pointer group text-center"
    >
      <div className="relative inline-block mb-4">
        <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-2xl object-cover border-2 border-transparent group-hover:border-care-orange transition-all" />
        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
          user.role === UserRole.ADMIN ? 'bg-purple-500' : user.role === UserRole.CONTRACTOR ? 'bg-care-orange' : 'bg-green-500'
        }`}>
          {user.role === UserRole.ADMIN ? <Award size={10} className="text-white" /> : user.role === UserRole.CONTRACTOR ? <Briefcase size={10} className="text-white" /> : <UserIcon size={10} className="text-white" />}
        </div>
      </div>
      <h3 className="font-black text-gray-900 group-hover:text-care-orange transition-colors">{user.name}</h3>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">{user.specialty || user.role}</p>
      
      <div className="mt-6 pt-6 border-t border-gray-50 flex justify-center gap-4 text-gray-400">
         <button onClick={(e) => { e.stopPropagation(); onMessageUser(user); }} className="p-2 hover:text-care-orange hover:bg-care-orange/5 rounded-lg transition-all"><MessageSquare size={16} /></button>
         <button className="p-2 hover:text-care-orange hover:bg-care-orange/5 rounded-lg transition-all"><Mail size={16} /></button>
         <button className="p-2 hover:text-care-orange hover:bg-care-orange/5 rounded-lg transition-all"><Phone size={16} /></button>
      </div>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Team Directory</h1>
        <p className="text-gray-500 font-medium">Meet the professionals building your dreams.</p>
      </div>

      <section>
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
          Field Contractors <div className="h-px flex-1 bg-gray-100"></div>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {contractors.map(u => <UserCard key={u.id} user={u} />)}
        </div>
      </section>

      {currentUser.role === UserRole.ADMIN && (
        <section>
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
            Clients <div className="h-px flex-1 bg-gray-100"></div>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {clients.map(u => <UserCard key={u.id} user={u} />)}
          </div>
        </section>
      )}

      {selectedProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1A1A1A]/80 backdrop-blur-sm" onClick={() => setSelectedProfile(null)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute top-6 right-6 z-10">
              <button onClick={() => setSelectedProfile(null)} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white md:text-gray-900 md:bg-gray-100 transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/2 relative h-80 md:h-auto">
                <img src={selectedProfile.avatar} alt={selectedProfile.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/80 via-transparent to-transparent md:hidden"></div>
                <div className="absolute bottom-6 left-6 text-white md:hidden">
                  <h2 className="text-3xl font-black uppercase tracking-tight">{selectedProfile.name}</h2>
                  <p className="text-care-orange font-black uppercase text-xs tracking-widest">{selectedProfile.specialty || selectedProfile.role}</p>
                </div>
              </div>

              <div className="p-8 md:p-12 md:w-1/2 flex flex-col justify-center space-y-8">
                <div className="hidden md:block">
                  <h2 className="text-3xl font-black uppercase tracking-tight text-gray-900">{selectedProfile.name}</h2>
                  <p className="text-care-orange font-black uppercase text-sm tracking-widest mt-2">{selectedProfile.specialty || selectedProfile.role}</p>
                </div>

                <div className="space-y-6">
                  {selectedProfile.experience && (
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-care-orange/10 rounded-xl flex items-center justify-center text-care-orange">
                           <Award size={20} />
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Experience</p>
                           <p className="font-bold text-gray-900">{selectedProfile.experience}</p>
                        </div>
                     </div>
                  )}
                  {selectedProfile.location && (
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-care-orange/10 rounded-xl flex items-center justify-center text-care-orange">
                           <MapPin size={20} />
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Location</p>
                           <p className="font-bold text-gray-900">{selectedProfile.location}</p>
                        </div>
                     </div>
                  )}
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Bio & Background</p>
                  <p className="text-gray-500 text-sm leading-relaxed font-medium">
                    {selectedProfile.bio || "No biography provided yet."}
                  </p>
                </div>

                <div className="pt-8 border-t border-gray-100 flex gap-4">
                  <button 
                    onClick={() => onMessageUser(selectedProfile)}
                    className="flex-1 bg-care-orange text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:shadow-lg transition-all"
                  >
                     <MessageSquare size={14} /> Send Message
                  </button>
                  <button className="w-12 h-12 border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-care-orange transition-colors">
                     <Phone size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersDirectory;
