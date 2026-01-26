
import React, { useState } from 'react';
import { User, UserRole } from '../types';
// Added Award to the list of icons imported from lucide-react
import { User as UserIcon, Mail, Phone, MapPin, Briefcase, Info, Save, Camera, Award } from 'lucide-react';

interface SettingsPageProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, onUpdateUser }) => {
  const [formData, setFormData] = useState({ ...user });
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 space-y-12">
      <header>
        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Account Settings</h1>
        <p className="text-gray-500 font-medium">Update your profile and professional information.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row gap-12">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
               <div className="relative group">
                  <img 
                    src={formData.avatar} 
                    alt={formData.name} 
                    className="w-32 h-32 rounded-[2rem] object-cover border-4 border-gray-50 group-hover:opacity-75 transition-opacity" 
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="text-white drop-shadow-lg" size={32} />
                  </div>
               </div>
               <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Profile Photo</p>
            </div>

            {/* Fields Grid */}
            <div className="flex-1 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all font-bold text-gray-700"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input
                      type="email"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all font-bold text-gray-700"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all font-bold text-gray-700"
                      value={formData.phone || ''}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all font-bold text-gray-700"
                      value={formData.location || ''}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {user.role === UserRole.CONTRACTOR && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-50">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Specialty</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                      <input
                        type="text"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all font-bold text-gray-700"
                        value={formData.specialty || ''}
                        onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Years of Experience</label>
                    <div className="relative">
                      <Award className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                      <input
                        type="text"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all font-bold text-gray-700"
                        value={formData.experience || ''}
                        onChange={e => setFormData({ ...formData, experience: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Bio / Professional Summary</label>
                <div className="relative">
                  <Info className="absolute left-3 top-4 text-gray-300" size={18} />
                  <textarea
                    rows={4}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all font-medium text-gray-700"
                    value={formData.bio || ''}
                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between bg-[#1A1A1A] p-6 rounded-[2rem] shadow-2xl text-white">
          <div className="flex items-center gap-4">
             {isSaved ? (
               <div className="flex items-center gap-2 text-green-400 font-black uppercase text-xs tracking-widest animate-in slide-in-from-left-2">
                 <Save size={16} /> All Changes Saved!
               </div>
             ) : (
               <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Ready to save updates?</p>
             )}
          </div>
          <button 
            type="submit"
            className="bg-care-orange px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-care-orange/20"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
