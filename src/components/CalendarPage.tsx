import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Briefcase,
  Loader2,
  Trash2,
  Check,
} from 'lucide-react';
import { Project, User, UserRole } from '../types';

// Event Types
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // HH:MM format
  endTime?: string;
  location?: string;
  type: 'inspection' | 'meeting' | 'delivery' | 'site-visit' | 'deadline' | 'other';
  projectId?: string;
  attendeeIds: string[];
  createdBy: string;
  createdAt: string;
}

interface CalendarPageProps {
  events: CalendarEvent[];
  projects: Project[];
  users: User[];
  currentUser: User;
  onCreateEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateEvent: (eventId: string, updates: Partial<CalendarEvent>) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
}

const EVENT_TYPES = [
  { value: 'inspection', label: 'Inspection', color: 'bg-blue-500', bgLight: 'bg-blue-100', text: 'text-blue-700' },
  { value: 'meeting', label: 'Meeting', color: 'bg-purple-500', bgLight: 'bg-purple-100', text: 'text-purple-700' },
  { value: 'delivery', label: 'Delivery', color: 'bg-care-orange', bgLight: 'bg-orange-100', text: 'text-orange-700' },
  { value: 'site-visit', label: 'Site Visit', color: 'bg-green-500', bgLight: 'bg-green-100', text: 'text-green-700' },
  { value: 'deadline', label: 'Deadline', color: 'bg-red-500', bgLight: 'bg-red-100', text: 'text-red-700' },
  { value: 'other', label: 'Other', color: 'bg-gray-500', bgLight: 'bg-gray-100', text: 'text-gray-700' },
] as const;

const CalendarPage: React.FC<CalendarPageProps> = ({
  events,
  projects,
  users,
  currentUser,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEventDetail, setShowEventDetail] = useState<CalendarEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    location: '',
    type: 'meeting' as CalendarEvent['type'],
    projectId: '',
    attendeeIds: [] as string[],
  });

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Get events for a specific date
  const getEventsForDate = (date: string) => {
    return events.filter(e => e.date === date).sort((a, b) => 
      a.startTime.localeCompare(b.startTime)
    );
  };

  // Format date as YYYY-MM-DD
  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Get event type config
  const getEventTypeConfig = (type: CalendarEvent['type']) => {
    return EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[5];
  };

  // Handle create event
  const handleCreateEvent = async () => {
    if (!formData.title.trim() || !formData.date) return;

    setIsCreating(true);
    try {
      await onCreateEvent({
        ...formData,
        createdBy: currentUser.id,
      });
      setShowCreateModal(false);
      resetForm();
    } finally {
      setIsCreating(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: selectedDate || '',
      startTime: '09:00',
      endTime: '10:00',
      location: '',
      type: 'meeting',
      projectId: '',
      attendeeIds: [],
    });
  };

  // Open create modal for a specific date
  const openCreateForDate = (date: string) => {
    setSelectedDate(date);
    setFormData(prev => ({ ...prev, date }));
    setShowCreateModal(true);
  };

  // Get user by ID
  const getUserById = (id: string) => users.find(u => u.id === id);

  // Get project by ID
  const getProjectById = (id: string) => projects.find(p => p.id === id);

  // Toggle attendee selection
  const toggleAttendee = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      attendeeIds: prev.attendeeIds.includes(userId)
        ? prev.attendeeIds.filter(id => id !== userId)
        : [...prev.attendeeIds, userId]
    }));
  };

  // Filter users for attendee selection
  const getAvailableAttendees = () => {
    if (formData.projectId) {
      const project = getProjectById(formData.projectId);
      if (project) {
        return users.filter(u => 
          u.id === project.clientId || 
          u.id === project.contractorId ||
          u.role === UserRole.ADMIN
        );
      }
    }
    return users.filter(u => u.id !== currentUser.id);
  };

  // Check if current user can edit/delete event
  const canEditEvent = (event: CalendarEvent) => {
    return currentUser.role === UserRole.ADMIN || event.createdBy === currentUser.id;
  };

  // Today's date for comparison
  const today = new Date();
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  // Upcoming events (next 7 days)
  const upcomingEvents = events
    .filter(e => {
      const eventDate = new Date(e.date);
      const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    })
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">
            Schedule & Events
          </p>
          <h1 className="text-2xl font-black text-gray-900">Calendar</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={goToToday}
            className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-care-orange transition-colors"
          >
            Today
          </button>
          
          {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.CONTRACTOR) && (
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-xs font-bold hover:bg-care-orange transition-colors"
            >
              <Plus size={16} />
              Add Event
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Calendar */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Calendar Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <div className="text-center min-w-[200px]">
                <h2 className="text-xl font-black text-gray-900">{monthNames[month]}</h2>
                <p className="text-xs font-bold text-gray-400">{year}</p>
              </div>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  viewMode === 'month' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  viewMode === 'week' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}
              >
                Week
              </button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div
                key={day}
                className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[120px] p-2 border-b border-r border-gray-50 bg-gray-50/30"
              />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = formatDateKey(year, month, day);
              const dayEvents = getEventsForDate(dateKey);
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedDate;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDate(dateKey)}
                  className={`min-h-[120px] p-2 border-b border-r border-gray-50 cursor-pointer transition-colors group ${
                    isToday ? 'bg-care-orange/5' : 'hover:bg-gray-50'
                  } ${isSelected ? 'ring-2 ring-inset ring-care-orange' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-sm font-bold ${
                        isToday
                          ? 'bg-care-orange text-white w-7 h-7 rounded-full flex items-center justify-center'
                          : 'text-gray-700'
                      }`}
                    >
                      {day}
                    </span>
                    {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.CONTRACTOR) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openCreateForDate(dateKey);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
                      >
                        <Plus size={12} className="text-gray-400" />
                      </button>
                    )}
                  </div>

                  {/* Events for this day */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(event => {
                      const typeConfig = getEventTypeConfig(event.type);
                      return (
                        <button
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowEventDetail(event);
                          }}
                          className={`w-full text-left px-2 py-1 rounded-md text-[10px] font-bold truncate transition-all hover:opacity-80 ${typeConfig.bgLight} ${typeConfig.text}`}
                        >
                          <span className="mr-1">{event.startTime}</span>
                          {event.title}
                        </button>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <p className="text-[10px] font-bold text-gray-400 px-2">
                        +{dayEvents.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar - Upcoming Events */}
        <div className="space-y-4">
          {/* Upcoming Events Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
              Upcoming Events
            </h3>

            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map(event => {
                  const typeConfig = getEventTypeConfig(event.type);
                  const project = event.projectId ? getProjectById(event.projectId) : null;
                  const eventDate = new Date(event.date);
                  const isEventToday = event.date === todayKey;

                  return (
                    <button
                      key={event.id}
                      onClick={() => setShowEventDetail(event)}
                      className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-care-orange/30 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-1 h-full min-h-[40px] rounded-full ${typeConfig.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${typeConfig.bgLight} ${typeConfig.text}`}>
                              {typeConfig.label}
                            </span>
                            {isEventToday && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-care-orange/10 text-care-orange">
                                Today
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-gray-900 truncate">
                            {event.title}
                          </h4>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {event.startTime}
                            </span>
                            <span>
                              {eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          {project && (
                            <p className="text-[10px] text-care-orange font-medium mt-1 truncate">
                              {project.title}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Event Type Legend */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
              Event Types
            </h3>
            <div className="space-y-2">
              {EVENT_TYPES.map(type => (
                <div key={type.value} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${type.color}`} />
                  <span className="text-sm text-gray-600">{type.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-[#1A1A1A] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-care-orange rounded-xl flex items-center justify-center">
                  <CalendarIcon size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black">Create Event</h2>
                  <p className="text-[10px] text-white/50 uppercase tracking-widest">
                    {formData.date ? new Date(formData.date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    }) : 'Select a date'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Rough-in Inspection"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:border-care-orange focus:ring-0"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Event Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {EVENT_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: type.value as CalendarEvent['type'] }))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${
                        formData.type === type.value
                          ? 'border-care-orange bg-care-orange/5'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full ${type.color}`} />
                      <span className="text-xs font-bold text-gray-700">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:border-care-orange focus:ring-0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:border-care-orange focus:ring-0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:border-care-orange focus:ring-0"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Location
                </label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., 123 Main St or Zoom"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:border-care-orange focus:ring-0"
                  />
                </div>
              </div>

              {/* Project Link */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Link to Project
                </label>
                <div className="relative">
                  <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={formData.projectId}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value, attendeeIds: [] }))}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:border-care-orange focus:ring-0 appearance-none cursor-pointer"
                  >
                    <option value="">No project linked</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Attendees */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Attendees
                </label>
                <div className="flex flex-wrap gap-2">
                  {getAvailableAttendees().map(user => {
                    const isSelected = formData.attendeeIds.includes(user.id);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => toggleAttendee(user.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-care-orange bg-care-orange/10'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isSelected ? 'bg-care-orange text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-gray-700">{user.name}</span>
                        {isSelected && <Check size={14} className="text-care-orange" />}
                      </button>
                    );
                  })}
                  {getAvailableAttendees().length === 0 && (
                    <p className="text-xs text-gray-500">No attendees available</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add any notes or details..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:border-care-orange focus:ring-0 resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={!formData.title.trim() || !formData.date || isCreating}
                className="flex-1 py-3 bg-care-orange text-white rounded-xl font-bold text-sm hover:bg-care-orange/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Create Event
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {showEventDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowEventDetail(null)}
          />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            {(() => {
              const event = showEventDetail;
              const typeConfig = getEventTypeConfig(event.type);
              const project = event.projectId ? getProjectById(event.projectId) : null;
              const attendees = event.attendeeIds.map(id => getUserById(id)).filter(Boolean);
              const creator = getUserById(event.createdBy);

              return (
                <>
                  <div className={`p-6 text-white ${typeConfig.color}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-75">
                          {typeConfig.label}
                        </span>
                        <h2 className="text-xl font-black mt-1">{event.title}</h2>
                      </div>
                      <button
                        onClick={() => setShowEventDetail(null)}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Date & Time */}
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                        <Clock size={18} className="text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {event.startTime}
                          {event.endTime && ` - ${event.endTime}`}
                        </p>
                      </div>
                    </div>

                    {/* Location */}
                    {event.location && (
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                          <MapPin size={18} className="text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{event.location}</p>
                          <p className="text-xs text-gray-500">Location</p>
                        </div>
                      </div>
                    )}

                    {/* Project */}
                    {project && (
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-care-orange/10 rounded-xl flex items-center justify-center">
                          <Briefcase size={18} className="text-care-orange" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{project.title}</p>
                          <p className="text-xs text-gray-500">Linked Project</p>
                        </div>
                      </div>
                    )}

                    {/* Attendees */}
                    {attendees.length > 0 && (
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                          <Users size={18} className="text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-2">Attendees</p>
                          <div className="flex flex-wrap gap-2">
                            {attendees.map(user => user && (
                              <div
                                key={user.id}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg"
                              >
                                <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-bold text-white">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs font-medium text-gray-700">{user.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {event.description && (
                      <div className="pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-2">Description</p>
                        <p className="text-sm text-gray-700">{event.description}</p>
                      </div>
                    )}

                    {/* Creator info */}
                    {creator && (
                      <p className="text-[10px] text-gray-400 pt-4 border-t border-gray-100">
                        Created by {creator.name} on {new Date(event.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {canEditEvent(event) && (
                    <div className="p-4 border-t border-gray-100 flex gap-3">
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete this event?')) {
                            await onDeleteEvent(event.id);
                            setShowEventDetail(null);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <Trash2 size={16} />
                        <span className="text-sm font-bold">Delete</span>
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;