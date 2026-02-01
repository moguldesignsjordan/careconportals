import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Camera,
  MessageSquare,
  Plus,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Calendar,
  User,
  AlertCircle,
  Loader2,
  X,
  MapPin,
  Hammer,
  HardHat,
  Paintbrush,
  PartyPopper,
  PauseCircle,
} from 'lucide-react';
import { Project, User as UserType, ProjectStatus } from '../types';

// Phase definitions for construction projects
const PROJECT_PHASES = [
  { id: 'planning', label: 'Planning', icon: Calendar, color: 'blue' },
  { id: 'demolition', label: 'Demolition', icon: Hammer, color: 'red' },
  { id: 'rough-in', label: 'Rough-In', icon: HardHat, color: 'purple' },
  { id: 'finishing', label: 'Finishing', icon: Paintbrush, color: 'orange' },
  { id: 'completed', label: 'Completed', icon: PartyPopper, color: 'green' },
] as const;

type PhaseId = typeof PROJECT_PHASES[number]['id'];

export interface Milestone {
  id: string;
  phaseId: PhaseId;
  title: string;
  description?: string;
  date: string;
  completedAt?: string;
  imageUrls?: string[];
  comments?: MilestoneComment[];
  status: 'pending' | 'in-progress' | 'completed';
}

export interface MilestoneComment {
  id: string;
  author: string;
  authorId: string;
  content: string;
  timestamp: string;
  imageUrl?: string;
}

interface ProjectTimelineProps {
  project: Project;
  currentUser: UserType;
  milestones: Milestone[];
  onAddMilestone: (milestone: Omit<Milestone, 'id' | 'comments'>) => Promise<void>;
  onUpdateMilestone: (milestoneId: string, updates: Partial<Milestone>) => Promise<void>;
  onAddComment: (milestoneId: string, content: string, imageFile?: File | null) => Promise<void>;
  onUploadMilestoneImage: (milestoneId: string, file: File) => Promise<string>;
}

const ProjectTimeline: React.FC<ProjectTimelineProps> = ({
  project,
  currentUser,
  milestones,
  onAddMilestone,
  onUpdateMilestone,
  onAddComment,
  onUploadMilestoneImage,
}) => {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(['planning', 'demolition', 'rough-in', 'finishing']));
  const [showAddMilestone, setShowAddMilestone] = useState<PhaseId | null>(null);
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', date: '' });
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [addingComment, setAddingComment] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Determine current phase based on project status
  const getCurrentPhase = (): PhaseId => {
    switch (project.status) {
      case 'planned': return 'planning';
      case 'in-progress': 
        if (project.progress < 25) return 'demolition';
        if (project.progress < 50) return 'rough-in';
        if (project.progress < 90) return 'finishing';
        return 'finishing';
      case 'completed': return 'completed';
      default: return 'planning';
    }
  };

  const currentPhase = getCurrentPhase();
  const currentPhaseIndex = PROJECT_PHASES.findIndex(p => p.id === currentPhase);

  const togglePhase = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  const getPhaseStatus = (phaseIndex: number): 'completed' | 'current' | 'upcoming' => {
    if (phaseIndex < currentPhaseIndex) return 'completed';
    if (phaseIndex === currentPhaseIndex) return 'current';
    return 'upcoming';
  };

  const getPhaseMilestones = (phaseId: PhaseId) => {
    return milestones.filter(m => m.phaseId === phaseId).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const getPhaseColorClasses = (color: string, status: 'completed' | 'current' | 'upcoming') => {
    if (status === 'upcoming') {
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-400',
        border: 'border-gray-200',
        line: 'bg-gray-200',
      };
    }
    
    const colors: Record<string, { bg: string; text: string; border: string; line: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', line: 'bg-blue-400' },
      red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', line: 'bg-red-400' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', line: 'bg-purple-400' },
      orange: { bg: 'bg-care-orange/10', text: 'text-care-orange', border: 'border-care-orange/30', line: 'bg-care-orange' },
      green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', line: 'bg-green-400' },
    };
    return colors[color] || colors.blue;
  };

  const handleAddMilestone = async (phaseId: PhaseId) => {
    if (!newMilestone.title.trim() || !newMilestone.date) return;
    
    setAddingMilestone(true);
    try {
      await onAddMilestone({
        phaseId,
        title: newMilestone.title.trim(),
        description: newMilestone.description.trim(),
        date: newMilestone.date,
        status: 'pending',
      });
      setNewMilestone({ title: '', description: '', date: '' });
      setShowAddMilestone(null);
    } finally {
      setAddingMilestone(false);
    }
  };

  const handleCommentImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('Image must be less than 10MB');
        return;
      }
      setCommentImage(file);
      setCommentImagePreview(URL.createObjectURL(file));
    }
  };

  const clearCommentImage = () => {
    setCommentImage(null);
    if (commentImagePreview) {
      URL.revokeObjectURL(commentImagePreview);
      setCommentImagePreview(null);
    }
  };

  const handleAddComment = async (milestoneId: string) => {
    if (!commentText.trim() && !commentImage) return;
    
    setAddingComment(true);
    try {
      await onAddComment(milestoneId, commentText.trim(), commentImage);
      setCommentText('');
      clearCommentImage();
    } finally {
      setAddingComment(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-2">
      {/* Timeline Header */}
      <div className="bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-1">
              Project Timeline
            </p>
            <h2 className="text-xl font-black">{project.title}</h2>
            {project.location && (
              <p className="text-xs text-white/60 flex items-center gap-1 mt-1">
                <MapPin size={12} />
                {project.location}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-care-orange">{project.progress}%</p>
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Complete</p>
          </div>
        </div>
        
        {/* Mini progress phases */}
        <div className="flex items-center gap-1 mt-4">
          {PROJECT_PHASES.map((phase, index) => {
            const status = getPhaseStatus(index);
            return (
              <React.Fragment key={phase.id}>
                <div 
                  className={`h-2 flex-1 rounded-full transition-all ${
                    status === 'completed' ? 'bg-care-orange' :
                    status === 'current' ? 'bg-care-orange/50' :
                    'bg-white/20'
                  }`}
                />
              </React.Fragment>
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          {PROJECT_PHASES.map((phase, index) => {
            const status = getPhaseStatus(index);
            return (
              <span 
                key={phase.id}
                className={`text-[9px] font-bold uppercase tracking-wider ${
                  status === 'completed' ? 'text-care-orange' :
                  status === 'current' ? 'text-white' :
                  'text-white/40'
                }`}
              >
                {phase.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Timeline Phases */}
      <div className="space-y-3">
        {PROJECT_PHASES.map((phase, phaseIndex) => {
          const Icon = phase.icon;
          const status = getPhaseStatus(phaseIndex);
          const colorClasses = getPhaseColorClasses(phase.color, status);
          const phaseMilestones = getPhaseMilestones(phase.id);
          const isExpanded = expandedPhases.has(phase.id);

          return (
            <div key={phase.id} className="relative">
              {/* Connecting line */}
              {phaseIndex < PROJECT_PHASES.length - 1 && (
                <div 
                  className={`absolute left-6 top-14 w-0.5 h-[calc(100%-3rem)] ${
                    status === 'upcoming' ? 'bg-gray-200' : colorClasses.line
                  } transition-colors`}
                  style={{ opacity: isExpanded ? 1 : 0 }}
                />
              )}

              {/* Phase Header */}
              <button
                onClick={() => togglePhase(phase.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${colorClasses.bg} ${colorClasses.border} hover:shadow-md`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  status === 'completed' ? 'bg-green-500 text-white' :
                  status === 'current' ? `${colorClasses.text} bg-white shadow-lg` :
                  'bg-gray-200 text-gray-400'
                }`}>
                  {status === 'completed' ? (
                    <CheckCircle2 size={24} />
                  ) : (
                    <Icon size={24} />
                  )}
                </div>

                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-black uppercase tracking-wider ${
                      status === 'upcoming' ? 'text-gray-400' : 'text-gray-900'
                    }`}>
                      {phase.label}
                    </h3>
                    {status === 'current' && (
                      <span className="px-2 py-0.5 bg-care-orange text-white text-[9px] font-black uppercase tracking-wider rounded-full animate-pulse">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {phaseMilestones.length} milestone{phaseMilestones.length !== 1 ? 's' : ''} 
                    {phaseMilestones.filter(m => m.status === 'completed').length > 0 && (
                      <span className="text-green-600 ml-1">
                        • {phaseMilestones.filter(m => m.status === 'completed').length} completed
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {status !== 'upcoming' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAddMilestone(showAddMilestone === phase.id ? null : phase.id);
                      }}
                      className={`p-2 rounded-lg ${colorClasses.text} hover:bg-white/80 transition-colors`}
                    >
                      <Plus size={18} />
                    </button>
                  )}
                  {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </div>
              </button>

              {/* Add Milestone Form */}
              {showAddMilestone === phase.id && (
                <div className="ml-16 mt-3 p-4 bg-white rounded-xl border-2 border-dashed border-gray-200 space-y-3">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Add Milestone</p>
                  <input
                    type="text"
                    placeholder="Milestone title..."
                    value={newMilestone.title}
                    onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-care-orange focus:ring-0"
                  />
                  <textarea
                    placeholder="Description (optional)..."
                    value={newMilestone.description}
                    onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-care-orange focus:ring-0"
                  />
                  <input
                    type="date"
                    value={newMilestone.date}
                    onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-care-orange focus:ring-0"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddMilestone(null)}
                      className="flex-1 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAddMilestone(phase.id)}
                      disabled={!newMilestone.title.trim() || !newMilestone.date || addingMilestone}
                      className="flex-1 py-2 text-xs font-bold text-white bg-care-orange rounded-lg hover:bg-care-orange/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {addingMilestone ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Milestones */}
              {isExpanded && phaseMilestones.length > 0 && (
                <div className="ml-16 mt-3 space-y-3">
                  {phaseMilestones.map((milestone) => (
                    <div 
                      key={milestone.id}
                      className={`bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all ${
                        expandedMilestone === milestone.id ? 'ring-2 ring-care-orange/30' : ''
                      }`}
                    >
                      {/* Milestone Header */}
                      <div 
                        className="p-4 cursor-pointer"
                        onClick={() => setExpandedMilestone(expandedMilestone === milestone.id ? null : milestone.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 ${
                            milestone.status === 'completed' ? 'text-green-500' :
                            milestone.status === 'in-progress' ? 'text-care-orange' :
                            'text-gray-300'
                          }`}>
                            {milestone.status === 'completed' ? (
                              <CheckCircle2 size={20} />
                            ) : milestone.status === 'in-progress' ? (
                              <Clock size={20} />
                            ) : (
                              <Circle size={20} />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-gray-900">{milestone.title}</h4>
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                milestone.status === 'completed' ? 'bg-green-100 text-green-700' :
                                milestone.status === 'in-progress' ? 'bg-care-orange/10 text-care-orange' :
                                'bg-gray-100 text-gray-500'
                              }`}>
                                {milestone.status}
                              </span>
                            </div>
                            {milestone.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{milestone.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-400">
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {formatDate(milestone.date)}
                              </span>
                              {milestone.imageUrls && milestone.imageUrls.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <ImageIcon size={12} />
                                  {milestone.imageUrls.length} photo{milestone.imageUrls.length !== 1 ? 's' : ''}
                                </span>
                              )}
                              {milestone.comments && milestone.comments.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <MessageSquare size={12} />
                                  {milestone.comments.length} comment{milestone.comments.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Thumbnail preview */}
                          {milestone.imageUrls && milestone.imageUrls.length > 0 && (
                            <div className="flex -space-x-2">
                              {milestone.imageUrls.slice(0, 3).map((url, i) => (
                                <img
                                  key={i}
                                  src={url}
                                  alt=""
                                  className="w-10 h-10 rounded-lg object-cover border-2 border-white shadow-sm"
                                />
                              ))}
                              {milestone.imageUrls.length > 3 && (
                                <div className="w-10 h-10 rounded-lg bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500">
                                  +{milestone.imageUrls.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {expandedMilestone === milestone.id && (
                        <div className="border-t border-gray-100">
                          {/* Status Toggle */}
                          <div className="p-4 bg-gray-50/50 flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-2">Status:</span>
                            {(['pending', 'in-progress', 'completed'] as const).map((s) => (
                              <button
                                key={s}
                                onClick={() => onUpdateMilestone(milestone.id, { status: s })}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                  milestone.status === s
                                    ? s === 'completed' ? 'bg-green-500 text-white' :
                                      s === 'in-progress' ? 'bg-care-orange text-white' :
                                      'bg-gray-300 text-gray-700'
                                    : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>

                          {/* Photos */}
                          {milestone.imageUrls && milestone.imageUrls.length > 0 && (
                            <div className="p-4 border-t border-gray-100">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Photos</p>
                              <div className="grid grid-cols-4 gap-2">
                                {milestone.imageUrls.map((url, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setSelectedImage(url)}
                                    className="aspect-square rounded-xl overflow-hidden hover:opacity-90 transition-opacity"
                                  >
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                  </button>
                                ))}
                                <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-care-orange hover:bg-care-orange/5 transition-colors">
                                  <Camera size={20} className="text-gray-400" />
                                  <span className="text-[9px] font-bold text-gray-400 mt-1">Add</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        await onUploadMilestoneImage(milestone.id, file);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          )}

                          {/* Comments */}
                          <div className="p-4 border-t border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Comments</p>
                            
                            {milestone.comments && milestone.comments.length > 0 && (
                              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                                {milestone.comments.map((comment) => (
                                  <div key={comment.id} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                                      {comment.author.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-900">{comment.author}</span>
                                        <span className="text-[10px] text-gray-400">{formatDateTime(comment.timestamp)}</span>
                                      </div>
                                      <p className="text-xs text-gray-600 mt-0.5">{comment.content}</p>
                                      {comment.imageUrl && (
                                        <button
                                          onClick={() => setSelectedImage(comment.imageUrl!)}
                                          className="mt-2"
                                        >
                                          <img 
                                            src={comment.imageUrl} 
                                            alt="" 
                                            className="max-h-32 rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                                          />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add Comment */}
                            <div className="flex gap-2">
                              <div className="w-8 h-8 rounded-full bg-care-orange/10 flex items-center justify-center text-xs font-bold text-care-orange shrink-0">
                                {currentUser.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 space-y-2">
                                <textarea
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  placeholder="Add a comment..."
                                  rows={2}
                                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:border-care-orange focus:ring-0 resize-none"
                                />
                                {commentImagePreview && (
                                  <div className="relative inline-block">
                                    <img src={commentImagePreview} alt="" className="h-16 rounded-lg border border-gray-200" />
                                    <button
                                      onClick={clearCommentImage}
                                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                )}
                                <div className="flex items-center justify-between">
                                  <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer hover:text-care-orange transition-colors">
                                    <Camera size={14} />
                                    <span className="font-medium">Photo</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={handleCommentImageSelect}
                                    />
                                  </label>
                                  <button
                                    onClick={() => handleAddComment(milestone.id)}
                                    disabled={(!commentText.trim() && !commentImage) || addingComment}
                                    className="px-4 py-1.5 bg-[#1A1A1A] text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-2"
                                  >
                                    {addingComment ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />}
                                    Post
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state for expanded phase */}
              {isExpanded && phaseMilestones.length === 0 && status !== 'upcoming' && (
                <div className="ml-16 mt-3 p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Plus size={20} className="text-gray-400" />
                  </div>
                  <p className="text-xs font-bold text-gray-500">No milestones yet</p>
                  <p className="text-[11px] text-gray-400 mt-1">Click the + button to add your first milestone</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Image Lightbox */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
          >
            <X size={28} />
          </button>
          <img 
            src={selectedImage} 
            alt="" 
            className="max-w-full max-h-[90vh] rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default ProjectTimeline;