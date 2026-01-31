import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadProfileImage } from '../services/db';
import { Camera, Save, Loader2, User, Mail, Phone, MapPin, Briefcase, FileText, Clock, AlertCircle, CheckCircle } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { user, updateUserProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
    company: user?.company || '',
    specialty: user?.specialty || '',
    experience: user?.experience || '',
    bio: user?.bio || '',
  });

  if (!user) return null;

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      const avatarUrl = await uploadProfileImage(user.id, file);
      await updateUserProfile({ avatar: avatarUrl });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateUserProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        location: formData.location.trim(),
        company: formData.company.trim(),
        specialty: formData.specialty.trim(),
        experience: formData.experience.trim(),
        bio: formData.bio.trim(),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-20 animate-in fade-in duration-500">
      <header className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Settings</h1>
        <p className="text-gray-500 font-medium">Manage your profile and preferences</p>
      </header>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-care-orange to-orange-500 h-24 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="relative">
              <div 
                onClick={handleImageClick}
                className="w-24 h-24 rounded-2xl bg-white border-4 border-white shadow-lg overflow-hidden cursor-pointer group"
              >
                {uploadingImage ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <Loader2 size={24} className="animate-spin text-care-orange" />
                  </div>
                ) : (
                  <>
                    <img 
                      src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=F15A2B&color=fff`}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={24} className="text-white" />
                    </div>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>
        </div>
        
        <div className="pt-16 px-8 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-black text-gray-900">{user.name}</h2>
              <p className="text-gray-500 text-sm">{user.email}</p>
            </div>
            <span className={`
              px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest
              ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : ''}
              ${user.role === 'CONTRACTOR' ? 'bg-orange-100 text-care-orange' : ''}
              ${user.role === 'CLIENT' ? 'bg-green-100 text-green-600' : ''}
            `}>
              {user.role}
            </span>
          </div>
          {user.createdAt && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
              <Clock size={14} />
              Member since {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600 animate-in slide-in-from-top">
          <AlertCircle size={20} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-600 animate-in slide-in-from-top">
          <CheckCircle size={20} />
          <span className="text-sm font-medium">Changes saved successfully!</span>
        </div>
      )}

      {/* Profile Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Profile Information</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-medium"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  disabled
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 border-2 border-gray-100 rounded-xl text-sm font-medium text-gray-500 cursor-not-allowed"
                  value={formData.email}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-medium"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="City, State"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-medium"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>

            {(user.role === 'CONTRACTOR' || user.role === 'ADMIN') && (
              <>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    Company
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Company name"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-medium"
                      value={formData.company}
                      onChange={e => setFormData({ ...formData, company: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    Specialty
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-medium appearance-none cursor-pointer"
                    value={formData.specialty}
                    onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                  >
                    <option value="">Select specialty...</option>
                    <option value="General Contractor">General Contractor</option>
                    <option value="Carpentry">Carpentry</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="HVAC">HVAC</option>
                    <option value="Roofing">Roofing</option>
                    <option value="Masonry">Masonry</option>
                    <option value="Painting">Painting</option>
                    <option value="Flooring">Flooring</option>
                    <option value="Landscaping">Landscaping</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    Experience
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10+ years"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-medium"
                    value={formData.experience}
                    onChange={e => setFormData({ ...formData, experience: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              Bio
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
              <textarea
                rows={4}
                placeholder="Tell us about yourself..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-medium resize-none"
                value={formData.bio}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-care-orange text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-care-orange/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-8 mt-8">
        <h3 className="text-sm font-black text-red-500 uppercase tracking-widest mb-4">Danger Zone</h3>
        <p className="text-gray-500 text-sm mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button className="border-2 border-red-200 text-red-500 px-6 py-2 rounded-xl font-bold text-sm hover:bg-red-50 transition-all">
          Delete Account
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
