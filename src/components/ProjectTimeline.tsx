// src/components/ProjectTimeline.tsx
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
  X,
  MapPin,
  Hammer,
  HardHat,
  Paintbrush,
  PartyPopper,
  Trash2,
  Edit3,
} from 'lucide-react';
import { Project, User as UserType, Milestone } from '../types';

const PROJECT_PHASES = [
  { id: 'planning', label: 'Planning', icon: Calendar, color: 'orange' },
  { id: 'demolition', label: 'Demolition', icon: Hammer, color: 'orange' },
  { id: 'rough-in', label: 'Rough-In', icon: HardHat, color: 'orange' },
  { id: 'finishing', label: 'Finishing', icon: Paintbrush, color: 'orange' },
  { id: 'completed', label: 'Complete', icon: PartyPopper, color: 'green' },
] as const;

type PhaseId = (typeof PROJECT_PHASES)[number]['id'];

// Type for custom phases (mutable version)
type CustomPhase = {
  id: string;
  label: string;
  icon: typeof Calendar;
  color: 'orange' | 'green';
};

interface ProjectTimelineProps {
  project: Project;
  currentUser: UserType;
  milestones: Milestone[];
  onAddMilestone: (milestone: Omit<Milestone, 'id' | 'comments'>) => Promise<void>;
  onUpdateMilestone: (milestoneId: string, updates: Partial<Milestone>) => Promise<void>;
  onDeleteMilestone: (milestoneId: string) => Promise<void>;
  onAddComment: (
    milestoneId: string,
    content: string,
    imageFile?: File | null
  ) => Promise<void>;
  onUploadMilestoneImage: (milestoneId: string, file: File) => Promise<string>;
}

const ProjectTimeline: React.FC<ProjectTimelineProps> = ({
  project,
  currentUser,
  milestones,
  onAddMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  onAddComment,
}) => {
  // Phase management - Fix: Use CustomPhase[] instead of readonly array type
  const [customPhases, setCustomPhases] = useState<CustomPhase[]>([...PROJECT_PHASES]);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(
    () => new Set(customPhases.map((p) => p.id))
  );

  // Phase labels (editable)
  const [phaseLabels, setPhaseLabels] = useState<Record<string, string>>(() => 
    Object.fromEntries(PROJECT_PHASES.map(p => [p.id, p.label]))
  );
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [phaseLabelDraft, setPhaseLabelDraft] = useState('');

  // Milestone creation
  const [showAddMilestone, setShowAddMilestone] = useState<string | null>(null);
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    date: '',
  });
  const [addingMilestone, setAddingMilestone] = useState(false);

  // Milestone expansion
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  
  // Milestone editing
  const [editingMilestoneTitle, setEditingMilestoneTitle] = useState<string | null>(null);
  const [editingMilestoneDesc, setEditingMilestoneDesc] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');

  // Comments
  const [commentText, setCommentText] = useState('');
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [addingCommentFor, setAddingCommentFor] = useState<string | null>(null);

  // Image viewer
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // ---- Helpers ----

  const getPhaseMilestones = (phaseId: string) =>
    (milestones || [])
      .filter((m) => m.phaseId === phaseId)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const getPhaseStats = (phaseId: string) => {
    const ms = getPhaseMilestones(phaseId);
    const completed = ms.filter((m) => m.status === 'completed').length;
    return { total: ms.length, completed };
  };

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  // Phase label editing
  const startEditingPhaseLabel = (phaseId: string) => {
    const current = phaseLabels[phaseId] || '';
    setEditingPhaseId(phaseId);
    setPhaseLabelDraft(current);
  };

  const commitPhaseLabel = () => {
    if (!editingPhaseId) return;
    const trimmed = phaseLabelDraft.trim();
    if (trimmed) {
      setPhaseLabels((prev) => ({
        ...prev,
        [editingPhaseId]: trimmed,
      }));
    }
    setEditingPhaseId(null);
    setPhaseLabelDraft('');
  };

  const handlePhaseLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditingPhaseId(null);
      setPhaseLabelDraft('');
    }
  };

  // Delete phase
  const handleDeletePhase = (phaseId: string) => {
    const phaseMilestones = getPhaseMilestones(phaseId);
    if (phaseMilestones.length > 0) {
      alert('Cannot delete a phase with milestones. Please delete all milestones first.');
      return;
    }
    if (confirm('Delete this phase? This cannot be undone.')) {
      setCustomPhases(prev => prev.filter(p => p.id !== phaseId));
      setExpandedPhases(prev => {
        const next = new Set(prev);
        next.delete(phaseId);
        return next;
      });
    }
  };

  // Add custom phase - Fix: Now works with CustomPhase[] type
  const handleAddPhase = () => {
    const phaseName = prompt('Enter phase name:');
    if (!phaseName || !phaseName.trim()) return;
    
    const newPhaseId = `custom-${Date.now()}`;
    const newPhase: CustomPhase = {
      id: newPhaseId,
      label: phaseName.trim(),
      icon: Calendar,
      color: 'orange',
    };
    
    setCustomPhases(prev => [...prev, newPhase]);
    setPhaseLabels(prev => ({ ...prev, [newPhaseId]: phaseName.trim() }));
    setExpandedPhases(prev => new Set([...prev, newPhaseId]));
  };

  // Milestone creation
  const handleStartAddMilestone = (phaseId: string) => {
    setShowAddMilestone(phaseId);
    setNewMilestone({ title: '', description: '', date: '' });
  };

  const handleCancelAddMilestone = () => {
    setShowAddMilestone(null);
    setNewMilestone({ title: '', description: '', date: '' });
  };

  const handleAddMilestoneSubmit = async (phaseId: string) => {
    if (!newMilestone.title.trim()) return;

    setAddingMilestone(true);
    try {
      await onAddMilestone({
        phaseId,
        title: newMilestone.title.trim(),
        description: newMilestone.description.trim(),
        date: newMilestone.date,
        status: 'in-progress',
        imageUrls: [],
      });
      setShowAddMilestone(null);
      setNewMilestone({ title: '', description: '', date: '' });
    } catch (err) {
      console.error('Failed to add milestone:', err);
      alert('Failed to add milestone. Please try again.');
    } finally {
      setAddingMilestone(false);
    }
  };

  // Milestone editing
  const startEditingTitle = (milestone: Milestone) => {
    setEditingMilestoneTitle(milestone.id);
    setTitleDraft(milestone.title);
  };

  const commitTitleEdit = async (milestone: Milestone) => {
    if (!titleDraft.trim()) {
      setEditingMilestoneTitle(null);
      return;
    }
    await onUpdateMilestone(milestone.id, { title: titleDraft.trim() });
    setEditingMilestoneTitle(null);
    setTitleDraft('');
  };

  const startEditingDescription = (milestone: Milestone) => {
    setEditingMilestoneDesc(milestone.id);
    setDescDraft(milestone.description || '');
  };

  const commitDescriptionEdit = async (milestone: Milestone) => {
    await onUpdateMilestone(milestone.id, { description: descDraft.trim() });
    setEditingMilestoneDesc(null);
    setDescDraft('');
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent, milestone: Milestone) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditingMilestoneTitle(null);
      setTitleDraft('');
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent, milestone: Milestone) => {
    if (e.key === 'Enter' && e.metaKey) {
      commitDescriptionEdit(milestone);
    } else if (e.key === 'Escape') {
      setEditingMilestoneDesc(null);
      setDescDraft('');
    }
  };

  // Milestone status changes
  const handleStatusChange = async (milestone: Milestone, newStatus: 'in-progress' | 'completed') => {
    await onUpdateMilestone(milestone.id, { status: newStatus });
  };

  // Delete milestone
  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!confirm('Delete this milestone? All photos and comments will be lost.')) {
      return;
    }
    await onDeleteMilestone(milestoneId);
  };

  // Comment management
  const handleCommentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCommentImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCommentImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddComment = async (milestoneId: string) => {
    if (!commentText.trim() && !commentImage) return;

    setAddingCommentFor(milestoneId);
    try {
      await onAddComment(milestoneId, commentText.trim(), commentImage);
      setCommentText('');
      setCommentImage(null);
      setCommentImagePreview(null);
    } catch (err) {
      console.error('Failed to add comment:', err);
      alert('Failed to add comment. Please try again.');
    } finally {
      setAddingCommentFor(null);
    }
  };

  // Formatting
  const formatDate = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // ---- Render ----

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-care-orange via-orange-500 to-orange-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6">
          <div className="space-y-2">
            <p className="text-xs font-black text-white/60 uppercase tracking-widest">
              Project Timeline
            </p>
            <h2 className="text-2xl font-black leading-tight">
              {project.title || 'Untitled Project'}
            </h2>
            {/* Fix: Add type guard for address property */}
            {'address' in project && project.address && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/80">
                <MapPin size={14} />
                <span className="line-clamp-1">{project.address}</span>
              </p>
            )}
          </div>
          <div className="space-y-2 sm:text-right">
            <div className="flex items-center gap-1.5 text-sm text-white/80 sm:justify-end">
              <User size={14} />
              <span className="font-medium">{currentUser.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 space-y-6">
        {/* Add Phase Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAddPhase}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border-2 border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Add Custom Phase
          </button>
        </div>

        {/* Phases */}
        {customPhases.map((phase) => {
          const stats = getPhaseStats(phase.id);
          const isExpanded = expandedPhases.has(phase.id);
          const phaseMilestones = getPhaseMilestones(phase.id);
          const PhaseIcon = phase.icon;
          const isEditing = editingPhaseId === phase.id;

          return (
            <div
              key={phase.id}
              className="rounded-2xl bg-white shadow-md border-2 border-gray-200 overflow-hidden"
            >
              {/* Phase header */}
              <div
                className={`px-6 py-4 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                  phase.color === 'green'
                    ? 'bg-green-100 hover:bg-green-200'
                    : 'bg-orange-100 hover:bg-orange-200'
                }`}
                onClick={() => togglePhase(phase.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      phase.color === 'green'
                        ? 'bg-green-500 text-white'
                        : 'bg-care-orange text-white'
                    }`}
                  >
                    <PhaseIcon size={20} strokeWidth={2.5} />
                  </div>

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input
                        type="text"
                        value={phaseLabelDraft}
                        onChange={(e) => setPhaseLabelDraft(e.target.value)}
                        onBlur={commitPhaseLabel}
                        onKeyDown={handlePhaseLabelKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        className="text-lg font-black text-gray-900 bg-white border-2 border-orange-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        autoFocus
                      />
                    ) : (
                      <h3 className="text-lg font-black text-gray-900 truncate">
                        {phaseLabels[phase.id] || phase.label}
                      </h3>
                    )}
                    {stats.total > 0 && (
                      <p className="text-sm text-gray-600 font-semibold">
                        {stats.completed} of {stats.total} milestone
                        {stats.total !== 1 ? 's' : ''} complete
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditingPhaseLabel(phase.id);
                    }}
                    className="p-2 rounded-full hover:bg-white/50 transition-colors"
                    title="Edit phase name"
                  >
                    <Edit3 size={16} className="text-gray-700" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhase(phase.id);
                    }}
                    className="p-2 rounded-full hover:bg-white/50 transition-colors"
                    title="Delete phase"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartAddMilestone(phase.id);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black text-white text-xs font-bold hover:bg-gray-800 transition-colors"
                  >
                    <Plus size={14} />
                    Add
                  </button>

                  {isExpanded ? (
                    <ChevronUp size={20} className="text-gray-600" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-600" />
                  )}
                </div>
              </div>

              {/* Phase content */}
              {isExpanded && (
                <div className="p-6 bg-gray-50 space-y-4">
                  {/* Add milestone form */}
                  {showAddMilestone === phase.id && (
                    <div className="rounded-xl bg-white border-2 border-dashed border-gray-300 p-4 space-y-3">
                      <input
                        type="text"
                        value={newMilestone.title}
                        onChange={(e) =>
                          setNewMilestone((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="Milestone title (e.g., 'Pour foundation')"
                        className="w-full text-base font-bold rounded-lg border-2 border-gray-300 px-3 py-2 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                      />
                      <textarea
                        value={newMilestone.description}
                        onChange={(e) =>
                          setNewMilestone((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Description (optional)"
                        rows={2}
                        className="w-full text-sm rounded-lg border-2 border-gray-300 px-3 py-2 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 resize-none"
                      />
                      <input
                        type="date"
                        value={newMilestone.date}
                        onChange={(e) =>
                          setNewMilestone((prev) => ({ ...prev, date: e.target.value }))
                        }
                        className="text-sm rounded-lg border-2 border-gray-300 px-3 py-2 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleCancelAddMilestone}
                          className="px-4 py-2 rounded-full bg-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={addingMilestone || !newMilestone.title.trim()}
                          onClick={() => handleAddMilestoneSubmit(phase.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-black text-white text-sm font-bold hover:bg-gray-800 disabled:opacity-50"
                        >
                          {addingMilestone ? (
                            <Clock size={16} className="animate-spin" />
                          ) : (
                            <Plus size={16} />
                          )}
                          Add Milestone
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Milestones */}
                  {phaseMilestones.map((milestone) => {
                    const isExpanded = expandedMilestone === milestone.id;
                    const StatusIcon = milestone.status === 'completed' ? CheckCircle2 : Circle;

                    return (
                      <div
                        key={milestone.id}
                        className="rounded-xl bg-white shadow-sm border-2 border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {/* Milestone header */}
                        <div
                          className="p-4 cursor-pointer"
                          onClick={() =>
                            setExpandedMilestone(isExpanded ? null : milestone.id)
                          }
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newStatus =
                                    milestone.status === 'completed'
                                      ? 'in-progress'
                                      : 'completed';
                                  handleStatusChange(milestone, newStatus);
                                }}
                                className={`flex-shrink-0 mt-0.5 transition-colors ${
                                  milestone.status === 'completed'
                                    ? 'text-green-600 hover:text-green-700'
                                    : 'text-gray-400 hover:text-gray-600'
                                }`}
                              >
                                <StatusIcon size={24} strokeWidth={2} />
                              </button>

                              <div className="flex-1 min-w-0 space-y-1">
                                {editingMilestoneTitle === milestone.id ? (
                                  <input
                                    type="text"
                                    value={titleDraft}
                                    onChange={(e) => setTitleDraft(e.target.value)}
                                    onBlur={() => commitTitleEdit(milestone)}
                                    onKeyDown={(e) => handleTitleKeyDown(e, milestone)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full text-base font-bold text-gray-900 bg-white border-2 border-orange-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                                    autoFocus
                                  />
                                ) : (
                                  <h4
                                    className={`text-base font-bold leading-snug ${
                                      milestone.status === 'completed'
                                        ? 'text-gray-500 line-through'
                                        : 'text-gray-900'
                                    }`}
                                  >
                                    {milestone.title}
                                  </h4>
                                )}

                                {editingMilestoneDesc === milestone.id ? (
                                  <textarea
                                    value={descDraft}
                                    onChange={(e) => setDescDraft(e.target.value)}
                                    onBlur={() => commitDescriptionEdit(milestone)}
                                    onKeyDown={(e) => handleDescriptionKeyDown(e, milestone)}
                                    onClick={(e) => e.stopPropagation()}
                                    rows={2}
                                    className="w-full text-sm text-gray-600 bg-white border-2 border-orange-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                                    autoFocus
                                  />
                                ) : (
                                  milestone.description && (
                                    <p
                                      className={`text-sm leading-relaxed ${
                                        milestone.status === 'completed'
                                          ? 'text-gray-400 line-through'
                                          : 'text-gray-600'
                                      }`}
                                    >
                                      {milestone.description}
                                    </p>
                                  )
                                )}

                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  {milestone.date && (
                                    <span className="flex items-center gap-1">
                                      <Calendar size={12} />
                                      {new Date(milestone.date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                    </span>
                                  )}
                                  {milestone.comments && milestone.comments.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <MessageSquare size={12} />
                                      {milestone.comments.length}
                                    </span>
                                  )}
                                  {milestone.imageUrls && milestone.imageUrls.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <ImageIcon size={12} />
                                      {milestone.imageUrls.length}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingTitle(milestone);
                                }}
                                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                                title="Edit title"
                              >
                                <Edit3 size={14} className="text-gray-500" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMilestone(milestone.id);
                                }}
                                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                                title="Delete milestone"
                              >
                                <Trash2 size={14} className="text-red-500" />
                              </button>

                              {milestone.status !== 'completed' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(milestone, 'completed');
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-xs font-semibold text-green-700 border border-green-300 hover:bg-green-200 transition-colors"
                                >
                                  Complete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Milestone body */}
                        {expandedMilestone === milestone.id && (
                          <div className="border-t-2 border-gray-100 p-4 space-y-4 bg-gray-50">
                            {/* Photos */}
                            {milestone.imageUrls && milestone.imageUrls.length > 0 && (
                              <div className="space-y-2">
                                <p className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                                  <ImageIcon size={14} />
                                  Photos
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {milestone.imageUrls.map((url, idx) => (
                                    <button
                                      key={`${milestone.id}-img-${idx}`}
                                      type="button"
                                      className="w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50 hover:border-orange-400 transition-colors"
                                      onClick={() => setSelectedImage(url)}
                                    >
                                      <img
                                        src={url}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Comments */}
                            <div className="space-y-3">
                              <p className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                                <MessageSquare size={14} />
                                Updates & Notes
                              </p>

                              {milestone.comments && milestone.comments.length > 0 ? (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {milestone.comments.map((comment) => (
                                    <div
                                      key={comment.id}
                                      className="rounded-lg bg-white px-3 py-2.5 space-y-1.5 border border-gray-200"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <div className="w-7 h-7 rounded-full bg-gray-900 text-white text-sm font-bold flex items-center justify-center">
                                            {comment.author?.charAt(0)?.toUpperCase() || '?'}
                                          </div>
                                          <span className="text-sm font-bold text-gray-800">
                                            {comment.author || 'Unknown'}
                                          </span>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                          {formatDate(comment.timestamp)}
                                        </span>
                                      </div>
                                      {comment.content && (
                                        <p className="text-sm text-gray-700 leading-relaxed">
                                          {comment.content}
                                        </p>
                                      )}
                                      {comment.imageUrl && (
                                        <button
                                          type="button"
                                          className="mt-1 inline-flex items-center gap-1 text-sm text-care-orange font-medium hover:text-orange-600"
                                          onClick={() => setSelectedImage(comment.imageUrl!)}
                                        >
                                          <ImageIcon size={14} />
                                          View image
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-400 italic">
                                  No updates yet. Use the form below to add one.
                                </p>
                              )}

                              {/* Add comment */}
                              <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-3 space-y-3">
                                <textarea
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  className="w-full text-sm rounded-lg border-2 border-gray-300 px-3 py-2 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 resize-none"
                                  rows={2}
                                  placeholder="Add a quick update or note..."
                                />

                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <label className="inline-flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer hover:text-gray-800 font-medium">
                                      <Camera size={16} />
                                      <span>Add photo</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleCommentImageChange}
                                      />
                                    </label>
                                    {commentImagePreview && (
                                      <button
                                        type="button"
                                        className="relative w-10 h-10 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100"
                                        onClick={() => setSelectedImage(commentImagePreview)}
                                      >
                                        <img
                                          src={commentImagePreview}
                                          alt=""
                                          className="w-full h-full object-cover"
                                        />
                                        <span className="absolute -top-1 -right-1 bg-white rounded-full border border-gray-300 p-0.5">
                                          <X size={12} />
                                        </span>
                                      </button>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    disabled={
                                      addingCommentFor === milestone.id ||
                                      (!commentText.trim() && !commentImage)
                                    }
                                    onClick={() => handleAddComment(milestone.id)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-black text-white text-sm font-bold hover:bg-gray-800 disabled:opacity-50"
                                  >
                                    {addingCommentFor === milestone.id ? (
                                      <Clock size={16} className="animate-spin" />
                                    ) : (
                                      <MessageSquare size={16} />
                                    )}
                                    Post
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Image lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 p-3 rounded-full bg-black/70 text-white hover:bg-black"
            onClick={() => setSelectedImage(null)}
          >
            <X size={24} />
          </button>
          <img
            src={selectedImage}
            alt=""
            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default ProjectTimeline;