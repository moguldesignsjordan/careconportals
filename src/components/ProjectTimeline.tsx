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
  // Phase management
  const [customPhases, setCustomPhases] = useState<typeof PROJECT_PHASES[number][]>([...PROJECT_PHASES]);
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

  // Add custom phase
  const handleAddPhase = () => {
    const phaseName = prompt('Enter phase name:');
    if (!phaseName || !phaseName.trim()) return;
    
    const newPhaseId = `custom-${Date.now()}`;
    const newPhase = {
      id: newPhaseId,
      label: phaseName.trim(),
      icon: Calendar,
      color: 'orange' as const,
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

  const handleCreateMilestone = async (phaseId: string) => {
    if (!newMilestone.title.trim()) return;
    setAddingMilestone(true);
    try {
      const payload: any = {
        phaseId,
        title: newMilestone.title.trim(),
        date: newMilestone.date || new Date().toISOString().slice(0, 10),
        status: 'pending',
        imageUrls: [],
      };

      const desc = newMilestone.description.trim();
      if (desc) {
        payload.description = desc;
      }

      await onAddMilestone(payload);

      setShowAddMilestone(null);
      setNewMilestone({ title: '', description: '', date: '' });
    } catch (err) {
      console.error('Error creating milestone', err);
    } finally {
      setAddingMilestone(false);
    }
  };

  // Milestone status
  const handleStatusChange = async (
    milestone: Milestone,
    status: Milestone['status']
  ) => {
    try {
      const updates: any = { status };
      if (status === 'completed') {
        updates.completedAt = new Date().toISOString();
      }
      await onUpdateMilestone(milestone.id, updates);
    } catch (err) {
      console.error('Error updating milestone status', err);
    }
  };

  // Milestone title editing (inline)
  const startEditingTitle = (milestone: Milestone) => {
    setEditingMilestoneTitle(milestone.id);
    setTitleDraft(milestone.title || '');
  };

  const commitTitle = async (milestoneId: string) => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== milestones.find(m => m.id === milestoneId)?.title) {
      try {
        await onUpdateMilestone(milestoneId, { title: trimmed });
      } catch (err) {
        console.error('Error updating title', err);
      }
    }
    setEditingMilestoneTitle(null);
    setTitleDraft('');
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, milestoneId: string) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditingMilestoneTitle(null);
      setTitleDraft('');
    }
  };

  // Milestone description editing (inline)
  const startEditingDesc = (milestone: Milestone) => {
    setEditingMilestoneDesc(milestone.id);
    setDescDraft(milestone.description || '');
  };

  const commitDesc = async (milestoneId: string) => {
    const trimmed = descDraft.trim();
    const current = milestones.find(m => m.id === milestoneId)?.description;
    if (trimmed !== current) {
      try {
        await onUpdateMilestone(milestoneId, { description: trimmed || undefined });
      } catch (err) {
        console.error('Error updating description', err);
      }
    }
    setEditingMilestoneDesc(null);
    setDescDraft('');
  };

  const handleDescKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, milestoneId: string) => {
    if (e.key === 'Escape') {
      setEditingMilestoneDesc(null);
      setDescDraft('');
    }
  };

  // Delete milestone
  const handleDeleteMilestone = async (milestoneId: string) => {
    if (confirm('Delete this milestone? This cannot be undone.')) {
      try {
        await onDeleteMilestone(milestoneId);
      } catch (err) {
        console.error('Error deleting milestone', err);
      }
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return 'No date';
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  };

  const handleCommentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCommentImage(file);
    const url = URL.createObjectURL(file);
    setCommentImagePreview(url);
  };

  const handleAddComment = async (milestoneId: string) => {
    if (!commentText.trim() && !commentImage) return;
    setAddingCommentFor(milestoneId);
    try {
      await onAddComment(milestoneId, commentText.trim(), commentImage || undefined);
      setCommentText('');
      setCommentImage(null);
      if (commentImagePreview) {
        URL.revokeObjectURL(commentImagePreview);
        setCommentImagePreview(null);
      }
    } catch (err) {
      console.error('Error adding comment', err);
    } finally {
      setAddingCommentFor(null);
    }
  };

  const renderStatusBadge = (status: Milestone['status']) => {
    let label = 'Pending';
    let classes = 'bg-gray-100 text-gray-700 border border-gray-200';

    if (status === 'in-progress') {
      label = 'In Progress';
      classes = 'bg-orange-50 text-orange-700 border border-orange-200';
    } else if (status === 'completed') {
      label = 'Completed';
      classes = 'bg-green-100 text-green-700 border border-green-200';
    }

    return (
      <span
        className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${classes}`}
      >
        {label}
      </span>
    );
  };

  const getStatusIcon = (status: Milestone['status']) => {
    if (status === 'completed') {
      return <CheckCircle2 className="text-green-500" size={28} />;
    }
    if (status === 'in-progress') {
      return <Clock className="text-care-orange" size={28} />;
    }
    return <Circle className="text-gray-300" size={28} />;
  };

  const getPhaseColorClasses = (color: string, hasActive: boolean) => {
    const base = 'bg-white border-gray-200 text-gray-900';
    const active =
      color === 'orange'
        ? 'bg-orange-50 border-orange-300 text-orange-900'
        : 'bg-green-50 border-green-300 text-green-900';

    return hasActive ? active : base;
  };

  // ---- Render ----

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-care-orange to-orange-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-black text-white/60 uppercase tracking-widest">
              Project Timeline
            </p>
            <h2 className="text-2xl font-black leading-tight">
              {project.title || 'Untitled Project'}
            </h2>
            {project.address && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/80">
                <MapPin size={14} />
                <span className="line-clamp-1">{project.address}</span>
              </p>
            )}
          </div>
          <div className="space-y-2 sm:text-right">
            <div className="flex items-center gap-1.5 text-sm text-white/80 sm:justify-end">
              <User size={14} />
              <span>{currentUser.name}</span>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
                {milestones.length} milestone{milestones.length === 1 ? '' : 's'}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
                {milestones.filter((m) => m.status === 'completed').length} completed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Phase Button */}
      <button
        type="button"
        onClick={handleAddPhase}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-orange-400 transition-colors text-sm font-semibold text-gray-600"
      >
        <Plus size={18} />
        Add Custom Phase
      </button>

      {/* Phases list */}
      <div className="space-y-4">
        {customPhases.map((phase) => {
          const Icon = phase.icon;
          const phaseMilestones = getPhaseMilestones(phase.id);
          const { total, completed } = getPhaseStats(phase.id);
          const isExpanded = expandedPhases.has(phase.id);
          const hasActive = total > 0;
          const colorClasses = getPhaseColorClasses(phase.color, hasActive);

          return (
            <div
              key={phase.id}
              className="relative rounded-2xl bg-white border-2 border-gray-100 shadow-md overflow-hidden"
            >
              {/* Phase header */}
              <div
                role="button"
                tabIndex={0}
                className={`flex items-center gap-4 p-5 cursor-pointer transition-colors ${colorClasses}`}
                onClick={() => togglePhase(phase.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    togglePhase(phase.id);
                  }
                }}
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-white shadow-md shrink-0">
                  <Icon className="text-gray-800" size={26} />
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      {/* Inline-editable phase label */}
                      {editingPhaseId === phase.id ? (
                        <input
                          autoFocus
                          value={phaseLabelDraft}
                          onChange={(e) => setPhaseLabelDraft(e.target.value)}
                          onBlur={commitPhaseLabel}
                          onKeyDown={handlePhaseLabelKeyDown}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-white text-base font-black uppercase tracking-wider text-gray-900 px-2 py-1 rounded-lg border-2 border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 w-full"
                        />
                      ) : (
                        <div
                          className="text-base font-black uppercase tracking-wider text-gray-900 inline-flex items-center gap-2 rounded-lg px-2 py-1 -mx-2 hover:bg-white/60 cursor-text"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingPhaseLabel(phase.id);
                          }}
                        >
                          {phaseLabels[phase.id] || phase.label}
                          <Edit3 size={14} className="text-gray-400" />
                        </div>
                      )}

                      <p className="text-sm text-gray-600 font-medium">
                        {total === 0
                          ? 'No milestones yet'
                          : `${completed}/${total} completed`}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhase(phase.id);
                          }}
                          className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                          title="Delete phase"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartAddMilestone(phase.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-black text-white text-sm font-bold hover:bg-gray-800 shadow-md"
                        >
                          <Plus size={16} />
                          Add
                        </button>
                        <div className="w-9 h-9 rounded-full bg-white/80 shadow-sm flex items-center justify-center">
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add milestone form */}
              {showAddMilestone === phase.id && (
                <div className="border-t-2 border-gray-100 px-5 pb-5 pt-3 bg-gray-50">
                  <div className="space-y-4 bg-white rounded-xl p-4 border border-gray-200">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                        Title
                      </label>
                      <input
                        type="text"
                        value={newMilestone.title}
                        onChange={(e) =>
                          setNewMilestone((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        className="w-full text-base rounded-lg border-2 border-gray-300 px-3 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                        placeholder="e.g. Inspection, Walkthrough, Payment"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                        Date
                      </label>
                      <input
                        type="date"
                        value={newMilestone.date}
                        onChange={(e) =>
                          setNewMilestone((prev) => ({
                            ...prev,
                            date: e.target.value,
                          }))
                        }
                        className="w-full text-base rounded-lg border-2 border-gray-300 px-3 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                        Notes
                      </label>
                      <textarea
                        value={newMilestone.description}
                        onChange={(e) =>
                          setNewMilestone((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="w-full text-sm rounded-lg border-2 border-gray-300 px-3 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 resize-none"
                        rows={3}
                        placeholder="Add details, instructions, or notes..."
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddMilestone(null);
                          setNewMilestone({ title: '', description: '', date: '' });
                        }}
                        className="text-sm font-medium text-gray-500 hover:text-gray-700 px-3 py-2"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={addingMilestone || !newMilestone.title.trim()}
                        onClick={() => handleCreateMilestone(phase.id)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-care-orange text-white text-sm font-bold hover:bg-orange-600 disabled:opacity-50 shadow-md"
                      >
                        {addingMilestone ? (
                          <Clock size={16} className="animate-spin" />
                        ) : (
                          <Plus size={16} />
                        )}
                        Create
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Milestones list */}
              {isExpanded && getPhaseMilestones(phase.id).length > 0 && (
                <div className="border-t-2 border-gray-100 px-5 py-4 space-y-3 bg-gray-50">
                  {getPhaseMilestones(phase.id).map((milestone) => (
                    <div
                      key={milestone.id}
                      className="rounded-xl border-2 border-gray-200 bg-white shadow-sm overflow-hidden"
                    >
                      {/* Milestone header */}
                      <div
                        className="p-4 flex items-start gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() =>
                          setExpandedMilestone(
                            expandedMilestone === milestone.id ? null : milestone.id
                          )
                        }
                      >
                        <div className="shrink-0">
                          {getStatusIcon(milestone.status)}
                        </div>
                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-2 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Click-to-edit title */}
                                {editingMilestoneTitle === milestone.id ? (
                                  <input
                                    autoFocus
                                    value={titleDraft}
                                    onChange={(e) => setTitleDraft(e.target.value)}
                                    onBlur={() => commitTitle(milestone.id)}
                                    onKeyDown={(e) => handleTitleKeyDown(e, milestone.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-base font-bold text-gray-900 bg-white border-2 border-orange-400 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500 flex-1 min-w-0"
                                  />
                                ) : (
                                  <h4
                                    className="text-base font-bold text-gray-900 cursor-text hover:text-orange-600 flex items-center gap-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditingTitle(milestone);
                                    }}
                                  >
                                    {milestone.title}
                                    <Edit3 size={14} className="text-gray-400" />
                                  </h4>
                                )}
                                {renderStatusBadge(milestone.status)}
                              </div>

                              {/* Click-to-edit description */}
                              {editingMilestoneDesc === milestone.id ? (
                                <textarea
                                  autoFocus
                                  value={descDraft}
                                  onChange={(e) => setDescDraft(e.target.value)}
                                  onBlur={() => commitDesc(milestone.id)}
                                  onKeyDown={(e) => handleDescKeyDown(e, milestone.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full text-sm text-gray-600 bg-white border-2 border-orange-400 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                                  rows={2}
                                />
                              ) : (
                                <p
                                  className="text-sm text-gray-600 cursor-text hover:text-gray-800 line-clamp-2 flex items-start gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditingDesc(milestone);
                                  }}
                                >
                                  {milestone.description || (
                                    <span className="text-gray-400 italic">Click to add notes...</span>
                                  )}
                                  <Edit3 size={12} className="text-gray-400 shrink-0 mt-0.5" />
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <p className="text-sm text-gray-500 flex items-center gap-1.5 font-medium">
                                <Calendar size={14} />
                                <span>{formatDate(milestone.date)}</span>
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMilestone(milestone.id);
                                  }}
                                  className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                  title="Delete milestone"
                                >
                                  <Trash2 size={16} />
                                </button>
                                <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                                  {expandedMilestone === milestone.id ? (
                                    <ChevronUp size={18} />
                                  ) : (
                                    <ChevronDown size={18} />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Status buttons */}
                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(milestone, 'pending');
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-xs font-semibold text-gray-700 border border-gray-300 hover:bg-gray-200 transition-colors"
                            >
                              Pending
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(milestone, 'in-progress');
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 text-xs font-semibold text-orange-700 border border-orange-300 hover:bg-orange-200 transition-colors"
                            >
                              In Progress
                            </button>
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
                  ))}
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