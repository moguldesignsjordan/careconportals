// src/components/ProjectTimeline.tsx
import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Camera,
  MessageSquare,
  Plus,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  X,
  Trash2,
  Edit3,
  Loader2,
} from 'lucide-react';
import { Project, User as UserType, Milestone } from '../types';

const PROJECT_PHASES = [
  { id: 'planning', label: 'Planning' },
  { id: 'demolition', label: 'Demolition' },
  { id: 'rough-in', label: 'Rough-In' },
  { id: 'finishing', label: 'Finishing' },
  { id: 'completed', label: 'Complete' },
] as const;

type CustomPhase = {
  id: string;
  label: string;
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
  // Phase management
  const [customPhases, setCustomPhases] = useState<CustomPhase[]>([...PROJECT_PHASES]);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(
    () => new Set(customPhases.map((p) => p.id))
  );

  // Phase labels (editable)
  const [phaseLabels, setPhaseLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries(PROJECT_PHASES.map((p) => [p.id, p.label]))
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
      setCustomPhases((prev) => prev.filter((p) => p.id !== phaseId));
      setExpandedPhases((prev) => {
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
    const newPhase: CustomPhase = {
      id: newPhaseId,
      label: phaseName.trim(),
    };

    setCustomPhases((prev) => [...prev, newPhase]);
    setPhaseLabels((prev) => ({ ...prev, [newPhaseId]: phaseName.trim() }));
    setExpandedPhases((prev) => new Set([...prev, newPhaseId]));
  };

  // Milestone actions
  const handleAddMilestoneClick = (phaseId: string) => {
    setShowAddMilestone(phaseId);
    setNewMilestone({ title: '', description: '', date: '' });
  };

  const handleCreateMilestone = async (phaseId: string) => {
    if (!newMilestone.title.trim()) return;
    setAddingMilestone(true);
    try {
      await onAddMilestone({
        phaseId,
        title: newMilestone.title,
        description: newMilestone.description || '',
        date: newMilestone.date || new Date().toISOString().split('T')[0],
        status: 'pending',
        imageUrls: [],
      });
      setShowAddMilestone(null);
      setNewMilestone({ title: '', description: '', date: '' });
    } catch (err) {
      console.error('Failed to create milestone:', err);
    } finally {
      setAddingMilestone(false);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (confirm('Delete this milestone? This cannot be undone.')) {
      try {
        await onDeleteMilestone(milestoneId);
      } catch (err) {
        console.error('Failed to delete milestone:', err);
      }
    }
  };

  // Title editing
  const startEditingTitle = (milestone: Milestone) => {
    setEditingMilestoneTitle(milestone.id);
    setTitleDraft(milestone.title);
  };

  const commitTitleEdit = async (milestoneId: string) => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== titleDraft) {
      try {
        await onUpdateMilestone(milestoneId, { title: trimmed });
      } catch (err) {
        console.error('Failed to update title:', err);
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

  // Description editing
  const startEditingDescription = (milestone: Milestone) => {
    setEditingMilestoneDesc(milestone.id);
    setDescDraft(milestone.description || '');
  };

  const commitDescEdit = async (milestoneId: string) => {
    try {
      await onUpdateMilestone(milestoneId, { description: descDraft.trim() });
    } catch (err) {
      console.error('Failed to update description:', err);
    }
    setEditingMilestoneDesc(null);
    setDescDraft('');
  };

  const handleDescKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, milestoneId: string) => {
    if (e.key === 'Enter' && e.metaKey) {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditingMilestoneDesc(null);
      setDescDraft('');
    }
  };

  // Comments
  const handleCommentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCommentImage(file);
      const url = URL.createObjectURL(file);
      setCommentImagePreview(url);
    }
  };

  const handleAddComment = async (milestoneId: string) => {
    if (!commentText.trim() && !commentImage) return;
    setAddingCommentFor(milestoneId);
    try {
      await onAddComment(milestoneId, commentText, commentImage);
      setCommentText('');
      setCommentImage(null);
      if (commentImagePreview) {
        URL.revokeObjectURL(commentImagePreview);
        setCommentImagePreview(null);
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setAddingCommentFor(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'No date';
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

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Timeline Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-3 sm:space-y-4">
        {customPhases.map((phase, phaseIndex) => {
          const stats = getPhaseStats(phase.id);
          const isExpanded = expandedPhases.has(phase.id);
          const phaseMilestones = getPhaseMilestones(phase.id);
          const progressPercent = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

          return (
            <div key={phase.id}>
              {/* Phase Card */}
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                {/* Phase Header */}
                <button
                  onClick={() => togglePhase(phase.id)}
                  className="w-full px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors group"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Phase Number - Orange accent */}
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#F15A2B] flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                      {phaseIndex + 1}
                    </div>

                    {/* Phase Info */}
                    <div className="text-left min-w-0">
                      {editingPhaseId === phase.id ? (
                        <input
                          type="text"
                          value={phaseLabelDraft}
                          onChange={(e) => setPhaseLabelDraft(e.target.value)}
                          onBlur={commitPhaseLabel}
                          onKeyDown={handlePhaseLabelKeyDown}
                          onClick={(e) => e.stopPropagation()}
                          className="text-base sm:text-lg font-semibold bg-neutral-100 border border-neutral-300 rounded-lg px-2 sm:px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[#F15A2B] w-full max-w-[200px]"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <h2 className="text-base sm:text-lg font-semibold text-neutral-900 truncate">
                            {phaseLabels[phase.id] || phase.label}
                          </h2>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingPhaseLabel(phase.id);
                            }}
                            className="p-1 rounded hover:bg-neutral-200 transition-colors opacity-0 group-hover:opacity-100 hidden sm:block"
                          >
                            <Edit3 size={12} className="text-neutral-500" />
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-2 sm:gap-3 mt-0.5">
                        <span className="text-xs sm:text-sm text-neutral-500">
                          {stats.completed}/{stats.total} complete
                        </span>
                        {stats.total > 0 && (
                          <span className="text-xs sm:text-sm font-medium text-[#F15A2B]">
                            {Math.round(progressPercent)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Controls */}
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePhase(phase.id);
                      }}
                      className="p-1.5 sm:p-2 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors opacity-0 group-hover:opacity-100 hidden sm:block"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="p-1">
                      {isExpanded ? (
                        <ChevronUp size={18} className="text-neutral-400" />
                      ) : (
                        <ChevronDown size={18} className="text-neutral-400" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Progress Bar - Orange */}
                {stats.total > 0 && (
                  <div className="px-4 sm:px-5 pb-3 sm:pb-4">
                    <div className="h-1 sm:h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#F15A2B] rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Phase Body */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-neutral-100">
                    {/* Add Milestone */}
                    <div className="pt-3 sm:pt-4">
                      {showAddMilestone === phase.id ? (
                        <div className="bg-neutral-50 rounded-xl p-4 sm:p-5 space-y-3 sm:space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                              Milestone Title
                            </label>
                            <input
                              type="text"
                              value={newMilestone.title}
                              onChange={(e) =>
                                setNewMilestone({ ...newMilestone, title: e.target.value })
                              }
                              className="w-full px-3 sm:px-4 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15A2B] focus:border-transparent transition-all text-sm sm:text-base"
                              placeholder="e.g., Foundation Pour Complete"
                              autoFocus
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                              Description
                            </label>
                            <textarea
                              value={newMilestone.description}
                              onChange={(e) =>
                                setNewMilestone({ ...newMilestone, description: e.target.value })
                              }
                              className="w-full px-3 sm:px-4 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15A2B] focus:border-transparent transition-all resize-none text-sm sm:text-base"
                              rows={3}
                              placeholder="Add details..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                              Date
                            </label>
                            <input
                              type="date"
                              value={newMilestone.date}
                              onChange={(e) =>
                                setNewMilestone({ ...newMilestone, date: e.target.value })
                              }
                              className="w-full px-3 sm:px-4 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15A2B] focus:border-transparent transition-all text-sm sm:text-base"
                            />
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                            <button
                              onClick={() => handleCreateMilestone(phase.id)}
                              disabled={addingMilestone || !newMilestone.title.trim()}
                              className="flex-1 px-4 py-2.5 bg-[#F15A2B] text-white rounded-lg font-medium hover:bg-[#d94d22] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                            >
                              {addingMilestone ? 'Creating...' : 'Create Milestone'}
                            </button>
                            <button
                              onClick={() => setShowAddMilestone(null)}
                              className="px-4 py-2.5 bg-white border border-neutral-200 text-neutral-700 rounded-lg font-medium hover:bg-neutral-50 transition-colors text-sm sm:text-base"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddMilestoneClick(phase.id)}
                          className="w-full px-4 py-3 border border-dashed border-neutral-300 rounded-xl hover:border-[#F15A2B] hover:bg-orange-50/50 transition-all group"
                        >
                          <div className="flex items-center justify-center gap-2 text-neutral-500 group-hover:text-[#F15A2B]">
                            <Plus size={18} />
                            <span className="text-sm font-medium">Add Milestone</span>
                          </div>
                        </button>
                      )}
                    </div>

                    {/* Milestones List */}
                    {phaseMilestones.length > 0 && (
                      <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
                        {phaseMilestones.map((milestone) => {
                          const isCompleted = milestone.status === 'completed';
                          const isOpen = expandedMilestone === milestone.id;

                          return (
                            <div
                              key={milestone.id}
                              className="bg-white border border-neutral-200 rounded-xl overflow-hidden"
                            >
                              {/* Milestone Header */}
                              <div className="p-3 sm:p-4">
                                <div className="flex items-start gap-2.5 sm:gap-3">
                                  {/* Status Toggle - Orange when complete */}
                                  <button
                                    onClick={async () => {
                                      await onUpdateMilestone(milestone.id, {
                                        status: isCompleted ? 'pending' : 'completed',
                                      });
                                    }}
                                    className="mt-0.5 flex-shrink-0"
                                  >
                                    {isCompleted ? (
                                      <CheckCircle2
                                        size={20}
                                        className="text-[#F15A2B] hover:scale-110 transition-transform sm:w-[22px] sm:h-[22px]"
                                      />
                                    ) : (
                                      <Circle
                                        size={20}
                                        className="text-neutral-300 hover:text-[#F15A2B] hover:scale-110 transition-all sm:w-[22px] sm:h-[22px]"
                                      />
                                    )}
                                  </button>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    {/* Title */}
                                    {editingMilestoneTitle === milestone.id ? (
                                      <input
                                        type="text"
                                        value={titleDraft}
                                        onChange={(e) => setTitleDraft(e.target.value)}
                                        onBlur={() => commitTitleEdit(milestone.id)}
                                        onKeyDown={(e) => handleTitleKeyDown(e, milestone.id)}
                                        className="w-full font-medium bg-neutral-100 border border-neutral-300 rounded-lg px-2 sm:px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[#F15A2B] text-sm sm:text-base"
                                        autoFocus
                                      />
                                    ) : (
                                      <div className="flex items-center gap-2 group/title">
                                        <h3
                                          className={`font-medium text-sm sm:text-base truncate ${
                                            isCompleted
                                              ? 'text-neutral-400 line-through'
                                              : 'text-neutral-900'
                                          }`}
                                        >
                                          {milestone.title}
                                        </h3>
                                        <button
                                          onClick={() => startEditingTitle(milestone)}
                                          className="p-1 rounded hover:bg-neutral-100 transition-colors opacity-0 group-hover/title:opacity-100 hidden sm:block flex-shrink-0"
                                        >
                                          <Edit3 size={12} className="text-neutral-400" />
                                        </button>
                                      </div>
                                    )}

                                    {/* Meta */}
                                    <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-neutral-500">
                                      <span>{formatDate(milestone.date)}</span>
                                      {milestone.comments && milestone.comments.length > 0 && (
                                        <span className="flex items-center gap-1">
                                          <MessageSquare size={12} />
                                          {milestone.comments.length}
                                        </span>
                                      )}
                                    </div>

                                    {/* Description */}
                                    {editingMilestoneDesc === milestone.id ? (
                                      <textarea
                                        value={descDraft}
                                        onChange={(e) => setDescDraft(e.target.value)}
                                        onBlur={() => commitDescEdit(milestone.id)}
                                        onKeyDown={(e) => handleDescKeyDown(e, milestone.id)}
                                        className="w-full mt-2 text-sm bg-neutral-100 border border-neutral-300 rounded-lg px-2 sm:px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F15A2B] resize-none"
                                        rows={2}
                                        autoFocus
                                      />
                                    ) : milestone.description ? (
                                      <p
                                        onClick={() => startEditingDescription(milestone)}
                                        className="mt-2 text-xs sm:text-sm text-neutral-600 cursor-pointer hover:bg-neutral-50 rounded px-1 -mx-1 transition-colors line-clamp-2"
                                      >
                                        {milestone.description}
                                      </p>
                                    ) : null}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                                    <button
                                      onClick={() =>
                                        setExpandedMilestone(isOpen ? null : milestone.id)
                                      }
                                      className={`p-1.5 sm:p-2 rounded-lg hover:bg-neutral-100 transition-colors ${
                                        isOpen ? 'text-[#F15A2B]' : 'text-neutral-400 hover:text-neutral-600'
                                      }`}
                                    >
                                      <MessageSquare size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMilestone(milestone.id)}
                                      className="p-1.5 sm:p-2 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Expanded Comments Section */}
                              {isOpen && (
                                <div className="border-t border-neutral-100 bg-neutral-50 p-3 sm:p-4">
                                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                                    <MessageSquare size={14} className="text-[#F15A2B]" />
                                    <span className="text-xs sm:text-sm font-medium text-neutral-700">
                                      Updates & Comments
                                    </span>
                                  </div>

                                  {/* Comments List */}
                                  {milestone.comments && milestone.comments.length > 0 ? (
                                    <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4 max-h-60 sm:max-h-80 overflow-y-auto">
                                      {milestone.comments.map((comment) => (
                                        <div
                                          key={comment.id}
                                          className="bg-white rounded-lg p-2.5 sm:p-3 border border-neutral-200"
                                        >
                                          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                            <div className="flex items-center gap-2">
                                              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#F15A2B] text-white text-[10px] sm:text-xs font-medium flex items-center justify-center">
                                                {comment.author?.charAt(0)?.toUpperCase() || '?'}
                                              </div>
                                              <span className="text-xs sm:text-sm font-medium text-neutral-700">
                                                {comment.author || 'Unknown'}
                                              </span>
                                            </div>
                                            <span className="text-[10px] sm:text-xs text-neutral-400">
                                              {formatDate(comment.timestamp)}
                                            </span>
                                          </div>
                                          {comment.content && (
                                            <p className="text-xs sm:text-sm text-neutral-600">
                                              {comment.content}
                                            </p>
                                          )}
                                          {comment.imageUrl && (
                                            <button
                                              type="button"
                                              className="mt-2 flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#F15A2B] hover:text-[#d94d22] transition-colors"
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
                                    <div className="mb-3 sm:mb-4 p-3 sm:p-4 border border-dashed border-neutral-300 rounded-lg text-center">
                                      <p className="text-xs sm:text-sm text-neutral-400">
                                        No updates yet. Add one below.
                                      </p>
                                    </div>
                                  )}

                                  {/* Add Comment Form */}
                                  <div className="bg-white rounded-lg border border-neutral-200 p-2.5 sm:p-3 space-y-2 sm:space-y-3">
                                    <textarea
                                      value={commentText}
                                      onChange={(e) => setCommentText(e.target.value)}
                                      className="w-full px-2.5 sm:px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15A2B] focus:border-transparent resize-none text-xs sm:text-sm"
                                      rows={2}
                                      placeholder="Add an update..."
                                    />

                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <label className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm text-neutral-600 cursor-pointer hover:bg-neutral-100 transition-colors border border-neutral-200">
                                          <Camera size={14} />
                                          <span className="hidden sm:inline">Photo</span>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleCommentImageChange}
                                          />
                                        </label>
                                        {commentImagePreview && (
                                          <div className="relative">
                                            <button
                                              type="button"
                                              className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden border border-neutral-200"
                                              onClick={() => setSelectedImage(commentImagePreview)}
                                            >
                                              <img
                                                src={commentImagePreview}
                                                alt=""
                                                className="w-full h-full object-cover"
                                              />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setCommentImage(null);
                                                if (commentImagePreview) {
                                                  URL.revokeObjectURL(commentImagePreview);
                                                  setCommentImagePreview(null);
                                                }
                                              }}
                                              className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-neutral-900 rounded-full flex items-center justify-center"
                                            >
                                              <X size={10} className="text-white" />
                                            </button>
                                          </div>
                                        )}
                                      </div>

                                      <button
                                        type="button"
                                        disabled={
                                          addingCommentFor === milestone.id ||
                                          (!commentText.trim() && !commentImage)
                                        }
                                        onClick={() => handleAddComment(milestone.id)}
                                        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#F15A2B] text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-[#d94d22] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 sm:gap-2"
                                      >
                                        {addingCommentFor === milestone.id ? (
                                          <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span className="hidden sm:inline">Posting...</span>
                                          </>
                                        ) : (
                                          'Post'
                                        )}
                                      </button>
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
                )}
              </div>
            </div>
          );
        })}

        {/* Add Custom Phase Button */}
        <button
          onClick={handleAddPhase}
          className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-white border border-dashed border-neutral-300 rounded-xl hover:border-[#F15A2B] hover:bg-orange-50/50 transition-all group"
        >
          <div className="flex items-center justify-center gap-2 text-neutral-500 group-hover:text-[#F15A2B]">
            <Plus size={18} />
            <span className="font-medium text-sm sm:text-base">Add Custom Phase</span>
          </div>
        </button>
      </div>

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 sm:p-6"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
          <img
            src={selectedImage}
            alt=""
            className="max-w-full max-h-[85vh] rounded-lg sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default ProjectTimeline;