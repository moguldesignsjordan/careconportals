import React, { useState, useEffect } from 'react';
import { X, HardHat, Mail, Phone, MapPin, Briefcase, Award, Loader2 } from 'lucide-react';
import { User, UserRole } from '../types';

interface CreateContractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (contractor: Omit<User, 'id'>) => Promise<void>;
}

const CreateContractorModal: React.FC<CreateContractorModalProps> = ({ 
  isOpen, 
  onClose, 
  onCreate 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    specialty: '',
    experience: '',
    company: '',
    bio: '',
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', email: '', phone: '', location: '', specialty: '', experience: '', company: '', bio: '' });
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Contractor name is required');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await onCreate({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        location: formData.location.trim(),
        specialty: formData.specialty.trim(),
        experience: formData.experience.trim(),
        company: formData.company.trim() || 'Freelance',
        bio: formData.bio.trim(),
        role: UserRole.CONTRACTOR,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=F15A2B&color=fff`,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add contractor');
    } finally {
      setLoading(false);
    }
  };

  const specialties = [
    'General Contractor',
    'Carpentry',
    'Electrical',
    'Plumbing',
    'HVAC',
    'Roofing',
    'Masonry',
    'Painting',
    'Flooring',
    'Landscaping',
    'Other'
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1A1A1A]/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="bg-care-orange p-6 text-white flex justify-between items-center sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <HardHat size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Add Contractor</h2>
              <p className="text-white/70 text-xs font-bold tracking-widest uppercase">Team Member</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Full Name *</label>
            <div className="relative">
              <HardHat className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                required
                type="text"
                placeholder="Mike Johnson"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Email Address *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                required
                type="email"
                placeholder="contractor@example.com"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="City, State"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Specialty</label>
              <div className="relative">
                <Award className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold appearance-none cursor-pointer"
                  value={formData.specialty}
                  onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                >
                  <option value="">Select Specialty</option>
                  {specialties.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Experience</label>
              <input
                type="text"
                placeholder="e.g. 10 Years"
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold"
                value={formData.experience}
                onChange={e => setFormData({ ...formData, experience: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Company</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Company name or 'Freelance'"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold"
                value={formData.company}
                onChange={e => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Bio</label>
            <textarea
              rows={2}
              placeholder="Brief description of skills and experience..."
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-medium resize-none"
              value={formData.bio}
              onChange={e => setFormData({ ...formData, bio: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-6 border-2 border-gray-200 rounded-xl font-black uppercase tracking-widest text-xs text-gray-600 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-6 bg-care-orange text-white rounded-xl font-black uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-care-orange/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Contractor'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateContractorModal;
