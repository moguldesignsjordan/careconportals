// src/components/CalendarPage.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  MapPin,
  Users,
  Calendar as CalendarIcon,
  Video,
  Phone,
  ExternalLink,
  Trash2,
  Edit3,
  Check,
  Link2,
  Copy,
  Settings,
  Bell,
  Briefcase,
} from 'lucide-react';
import { User, Project, CalendarEvent, UserRole } from '../types';

interface CalendarPageProps {
  currentUser: User;
  events?: CalendarEvent[];
  projects?: Project[];
  users?: User[];
  onCreateEvent?: (eventData: Omit<CalendarEvent, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateEvent?: (eventId: string, updates: Partial<CalendarEvent>) => Promise<void>;
  onDeleteEvent?: (eventId: string) => Promise<void>;
}

type ViewMode = 'month' | 'week' | 'day';
type EventType = 'meeting' | 'site_visit' | 'deadline' | 'milestone' | 'other';

interface LocalEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: EventType;
  location?: string;
  attendees?: string[];
  projectId?: string;
  isAllDay?: boolean;
  color?: string;
  meetingLink?: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const EVENT_COLORS: Record<EventType, { bg: string; text: string; border: string }> = {
  meeting: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  site_visit: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  deadline: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  milestone: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  other: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

const CalendarPage: React.FC<CalendarPageProps> = ({
  currentUser,
  events = [],
  projects = [],
  users = [],
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCalComModal, setShowCalComModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LocalEvent | null>(null);
  const [calComUsername, setCalComUsername] = useState(() => {
    return localStorage.getItem('calcom_username') || '';
  });
  const [tempCalComUsername, setTempCalComUsername] = useState(calComUsername);

  // Local events state (in a real app, this would come from Firebase)
  const [localEvents, setLocalEvents] = useState<LocalEvent[]>(() => {
    const saved = localStorage.getItem('calendar_events');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((e: LocalEvent) => ({ ...e, date: new Date(e.date) }));
    }
    return [];
  });

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    type: 'meeting' as EventType,
    location: '',
    attendees: [] as string[],
    projectId: '',
    isAllDay: false,
    meetingLink: '',
  });

  // Save events to localStorage
  useEffect(() => {
    localStorage.setItem('calendar_events', JSON.stringify(localEvents));
  }, [localEvents]);

  // Calendar calculations
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (Date | null)[] = [];

    // Previous month padding
    for (let i = 0; i < startOffset; i++) {
      const prevDate = new Date(year, month, -startOffset + i + 1);
      days.push(prevDate);
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  }, [currentDate]);

  // Week view calculations
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });
  }, [currentDate]);

  // Time slots for week/day view
  const timeSlots = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, '0');
      return `${hour}:00`;
    });
  }, []);

  // Get events for a specific date
  const getEventsForDate = (date: Date): LocalEvent[] => {
    return localEvents.filter(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    });
  };

  // Navigation
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Event handlers
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setEventForm(prev => ({
      ...prev,
      date: date.toISOString().split('T')[0],
    }));
    setShowEventModal(true);
    setEditingEvent(null);
  };

  const handleEventClick = (event: LocalEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || '',
      date: new Date(event.date).toISOString().split('T')[0],
      startTime: event.startTime,
      endTime: event.endTime,
      type: event.type,
      location: event.location || '',
      attendees: event.attendees || [],
      projectId: event.projectId || '',
      isAllDay: event.isAllDay || false,
      meetingLink: event.meetingLink || '',
    });
    setShowEventModal(true);
  };

  const handleSaveEvent = () => {
    if (!eventForm.title.trim()) return;

    if (editingEvent) {
      // Update existing event
      setLocalEvents(prev =>
        prev.map(e =>
          e.id === editingEvent.id
            ? {
              ...e,
              title: eventForm.title,
              description: eventForm.description,
              date: new Date(eventForm.date),
              startTime: eventForm.startTime,
              endTime: eventForm.endTime,
              type: eventForm.type,
              location: eventForm.location,
              attendees: eventForm.attendees,
              projectId: eventForm.projectId,
              isAllDay: eventForm.isAllDay,
              meetingLink: eventForm.meetingLink,
            }
            : e
        )
      );
    } else {
      // Create new event
      const newEvent: LocalEvent = {
        id: `event-${Date.now()}`,
        title: eventForm.title,
        description: eventForm.description,
        date: new Date(eventForm.date),
        startTime: eventForm.startTime,
        endTime: eventForm.endTime,
        type: eventForm.type,
        location: eventForm.location,
        attendees: eventForm.attendees,
        projectId: eventForm.projectId,
        isAllDay: eventForm.isAllDay,
        meetingLink: eventForm.meetingLink,
      };
      setLocalEvents(prev => [...prev, newEvent]);
    }

    resetEventForm();
  };

  const handleDeleteEvent = (eventId: string) => {
    setLocalEvents(prev => prev.filter(e => e.id !== eventId));
    resetEventForm();
  };

  const resetEventForm = () => {
    setShowEventModal(false);
    setEditingEvent(null);
    setEventForm({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
      type: 'meeting',
      location: '',
      attendees: [],
      projectId: '',
      isAllDay: false,
      meetingLink: '',
    });
  };

  const saveCalComSettings = () => {
    localStorage.setItem('calcom_username', tempCalComUsername);
    setCalComUsername(tempCalComUsername);
    setShowSettingsModal(false);
  };

  const copyCalComLink = () => {
    if (calComUsername) {
      navigator.clipboard.writeText(`https://cal.com/${calComUsername}`);
    }
  };

  // Check if date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Check if date is in current month
  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth();
  };

  // Format date display
  const getHeaderDateDisplay = (): string => {
    if (viewMode === 'month') {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (viewMode === 'week') {
      const weekStart = weekDays[0];
      const weekEnd = weekDays[6];
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
      }
      return `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} - ${MONTHS[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
    } else {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your schedule and appointments</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Navigation */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1">
            <button
              onClick={navigatePrevious}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={navigateNext}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={18} className="text-gray-600" />
            </button>
          </div>

          {/* Date Display */}
          <div className="hidden sm:block text-lg font-semibold text-gray-900 min-w-[200px]">
            {getHeaderDateDisplay()}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${viewMode === mode
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Actions */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
            title="Cal.com Settings"
          >
            <Settings size={18} className="text-gray-500" />
          </button>

          {calComUsername && (
            <button
              onClick={() => setShowCalComModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:border-gray-300 transition-all"
            >
              <Video size={16} />
              Book Meeting
            </button>
          )}

          <button
            onClick={() => {
              setSelectedDate(new Date());
              setEventForm(prev => ({
                ...prev,
                date: new Date().toISOString().split('T')[0],
              }));
              setShowEventModal(true);
              setEditingEvent(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-care-orange text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-all shadow-sm"
          >
            <Plus size={16} />
            New Event
          </button>
        </div>
      </div>

      {/* Mobile Date Display */}
      <div className="sm:hidden text-lg font-semibold text-gray-900 mb-4">
        {getHeaderDateDisplay()}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
        {viewMode === 'month' && (
          <>
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6">
              {calendarDays.map((date, index) => {
                if (!date) return <div key={index} className="border-b border-r border-gray-50" />;

                const dayEvents = getEventsForDate(date);
                const isCurrentMonthDay = isCurrentMonth(date);
                const isTodayDate = isToday(date);

                return (
                  <div
                    key={index}
                    onClick={() => handleDateClick(date)}
                    className={`min-h-[100px] p-2 border-b border-r border-gray-50 cursor-pointer transition-colors hover:bg-gray-50 ${!isCurrentMonthDay ? 'bg-gray-50/50' : ''
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isTodayDate
                            ? 'bg-care-orange text-white'
                            : isCurrentMonthDay
                              ? 'text-gray-900'
                              : 'text-gray-400'
                          }`}
                      >
                        {date.getDate()}
                      </span>
                      {dayEvents.length > 2 && (
                        <span className="text-[10px] font-medium text-gray-400">
                          +{dayEvents.length - 2} more
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map((event) => {
                        const colors = EVENT_COLORS[event.type];
                        return (
                          <div
                            key={event.id}
                            onClick={(e) => handleEventClick(event, e)}
                            className={`text-[11px] px-2 py-1 rounded-md truncate ${colors.bg} ${colors.text} border ${colors.border} hover:opacity-80 transition-opacity`}
                          >
                            {!event.isAllDay && (
                              <span className="font-medium">{event.startTime} </span>
                            )}
                            {event.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {viewMode === 'week' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Week Header */}
            <div className="grid grid-cols-8 border-b border-gray-100 shrink-0">
              <div className="py-3 px-2 text-xs font-medium text-gray-400 border-r border-gray-100">
                GMT
              </div>
              {weekDays.map((date, index) => {
                const isTodayDate = isToday(date);
                return (
                  <div
                    key={index}
                    className={`py-3 text-center border-r border-gray-100 ${isTodayDate ? 'bg-care-orange/5' : ''
                      }`}
                  >
                    <div className="text-xs font-medium text-gray-500 uppercase">
                      {DAYS[date.getDay()]}
                    </div>
                    <div
                      className={`text-lg font-semibold mt-1 ${isTodayDate ? 'text-care-orange' : 'text-gray-900'
                        }`}
                    >
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time Grid */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-8">
                {/* Time Labels */}
                <div className="border-r border-gray-100">
                  {timeSlots.map((time) => (
                    <div
                      key={time}
                      className="h-14 px-2 text-[11px] font-medium text-gray-400 text-right pr-3 pt-[-6px]"
                    >
                      {time}
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                {weekDays.map((date, dayIndex) => {
                  const dayEvents = getEventsForDate(date);
                  const isTodayDate = isToday(date);

                  return (
                    <div
                      key={dayIndex}
                      className={`relative border-r border-gray-100 ${isTodayDate ? 'bg-care-orange/5' : ''
                        }`}
                    >
                      {timeSlots.map((time, timeIndex) => (
                        <div
                          key={time}
                          onClick={() => {
                            setSelectedDate(date);
                            setEventForm(prev => ({
                              ...prev,
                              date: date.toISOString().split('T')[0],
                              startTime: time,
                              endTime: `${(parseInt(time) + 1).toString().padStart(2, '0')}:00`,
                            }));
                            setShowEventModal(true);
                            setEditingEvent(null);
                          }}
                          className="h-14 border-b border-gray-50 hover:bg-gray-100/50 cursor-pointer transition-colors"
                        />
                      ))}

                      {/* Events */}
                      {dayEvents.map((event) => {
                        const startHour = parseInt(event.startTime.split(':')[0]);
                        const endHour = parseInt(event.endTime.split(':')[0]);
                        const duration = endHour - startHour;
                        const colors = EVENT_COLORS[event.type];

                        return (
                          <div
                            key={event.id}
                            onClick={(e) => handleEventClick(event, e)}
                            style={{
                              top: `${startHour * 56}px`,
                              height: `${Math.max(duration, 1) * 56 - 4}px`,
                            }}
                            className={`absolute left-1 right-1 px-2 py-1 rounded-lg ${colors.bg} ${colors.text} border ${colors.border} overflow-hidden cursor-pointer hover:opacity-80 transition-opacity z-10`}
                          >
                            <div className="text-xs font-semibold truncate">{event.title}</div>
                            <div className="text-[10px] opacity-75">
                              {event.startTime} - {event.endTime}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'day' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Day Header */}
            <div className="py-4 px-6 border-b border-gray-100 shrink-0">
              <div className="text-xs font-medium text-gray-500 uppercase">
                {DAYS[currentDate.getDay()]}
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {currentDate.getDate()}
              </div>
            </div>

            {/* Day Events */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex">
                {/* Time Labels */}
                <div className="w-20 shrink-0 border-r border-gray-100">
                  {timeSlots.map((time) => (
                    <div
                      key={time}
                      className="h-14 px-3 text-xs font-medium text-gray-400 text-right pt-[-6px]"
                    >
                      {time}
                    </div>
                  ))}
                </div>

                {/* Day Column */}
                <div className="flex-1 relative">
                  {timeSlots.map((time) => (
                    <div
                      key={time}
                      onClick={() => {
                        setSelectedDate(currentDate);
                        setEventForm(prev => ({
                          ...prev,
                          date: currentDate.toISOString().split('T')[0],
                          startTime: time,
                          endTime: `${(parseInt(time) + 1).toString().padStart(2, '0')}:00`,
                        }));
                        setShowEventModal(true);
                        setEditingEvent(null);
                      }}
                      className="h-14 border-b border-gray-50 hover:bg-gray-100/50 cursor-pointer transition-colors"
                    />
                  ))}

                  {/* Events */}
                  {getEventsForDate(currentDate).map((event) => {
                    const startHour = parseInt(event.startTime.split(':')[0]);
                    const endHour = parseInt(event.endTime.split(':')[0]);
                    const duration = endHour - startHour;
                    const colors = EVENT_COLORS[event.type];

                    return (
                      <div
                        key={event.id}
                        onClick={(e) => handleEventClick(event, e)}
                        style={{
                          top: `${startHour * 56}px`,
                          height: `${Math.max(duration, 1) * 56 - 4}px`,
                        }}
                        className={`absolute left-2 right-2 px-3 py-2 rounded-xl ${colors.bg} ${colors.text} border ${colors.border} overflow-hidden cursor-pointer hover:opacity-80 transition-opacity z-10`}
                      >
                        <div className="text-sm font-semibold">{event.title}</div>
                        <div className="text-xs opacity-75 mt-0.5">
                          {event.startTime} - {event.endTime}
                        </div>
                        {event.location && (
                          <div className="text-xs opacity-75 mt-1 flex items-center gap-1">
                            <MapPin size={12} />
                            {event.location}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={resetEventForm} />
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gray-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-care-orange rounded-xl flex items-center justify-center">
                  <CalendarIcon size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {editingEvent ? 'Edit Event' : 'New Event'}
                  </h2>
                  <p className="text-xs text-white/50 uppercase tracking-widest">
                    {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <button
                onClick={resetEventForm}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Meeting with client..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-0"
                />
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Event Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(EVENT_COLORS) as EventType[]).map((type) => {
                    const colors = EVENT_COLORS[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEventForm(prev => ({ ...prev, type }))}
                        className={`px-3 py-2 rounded-xl border-2 text-xs font-semibold capitalize transition-all ${eventForm.type === type
                            ? `${colors.bg} ${colors.text} border-current`
                            : 'border-gray-100 text-gray-600 hover:border-gray-200'
                          }`}
                      >
                        {type.replace('_', ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Start
                  </label>
                  <input
                    type="time"
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    End
                  </label>
                  <input
                    type="time"
                    value={eventForm.endTime}
                    onChange={(e) => setEventForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-0"
                  />
                </div>
              </div>

              {/* All Day Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">All day event</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEventForm(prev => ({ ...prev, isAllDay: !prev.isAllDay }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${eventForm.isAllDay ? 'bg-care-orange' : 'bg-gray-300'
                    }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${eventForm.isAllDay ? 'left-6' : 'left-1'
                      }`}
                  />
                </button>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Location
                </label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={eventForm.location}
                    onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Add location..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-0"
                  />
                </div>
              </div>

              {/* Meeting Link */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Meeting Link
                </label>
                <div className="relative">
                  <Video size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="url"
                    value={eventForm.meetingLink}
                    onChange={(e) => setEventForm(prev => ({ ...prev, meetingLink: e.target.value }))}
                    placeholder="https://zoom.us/j/..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-0"
                  />
                </div>
              </div>

              {/* Project */}
              {projects.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Related Project
                  </label>
                  <div className="relative">
                    <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                      value={eventForm.projectId}
                      onChange={(e) => setEventForm(prev => ({ ...prev, projectId: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-0 appearance-none cursor-pointer"
                    >
                      <option value="">No project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add notes or details..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-0 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-between">
              {editingEvent ? (
                <button
                  onClick={() => handleDeleteEvent(editingEvent.id)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              ) : (
                <div />
              )}
              <div className="flex gap-3">
                <button
                  onClick={resetEventForm}
                  className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEvent}
                  disabled={!eventForm.title.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-care-orange text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={16} />
                  {editingEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cal.com Booking Modal */}
      {showCalComModal && calComUsername && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCalComModal(false)} />
          <div className="relative bg-white w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                  <Video size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Book a Meeting</h3>
                  <p className="text-xs text-gray-500">via Cal.com</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://cal.com/${calComUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ExternalLink size={14} />
                  Open in Cal.com
                </a>
                <button
                  onClick={() => setShowCalComModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>
            </div>
            <iframe
              src={`https://cal.com/${calComUsername}?embed=true&theme=light`}
              className="w-full h-[calc(100%-64px)]"
              frameBorder="0"
            />
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)} />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gray-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-care-orange rounded-xl flex items-center justify-center">
                  <Settings size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Calendar Settings</h2>
                  <p className="text-xs text-white/50 uppercase tracking-widest">
                    Configure Cal.com Integration
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Cal.com Username
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    cal.com/
                  </span>
                  <input
                    type="text"
                    value={tempCalComUsername}
                    onChange={(e) => setTempCalComUsername(e.target.value)}
                    placeholder="your-username"
                    className="w-full pl-[70px] pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-0"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Enter your Cal.com username to enable booking functionality.
                </p>
              </div>

              {calComUsername && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Your Booking Link
                    </span>
                    <button
                      onClick={copyCalComLink}
                      className="flex items-center gap-1 text-xs text-care-orange hover:text-orange-600 font-medium"
                    >
                      <Copy size={12} />
                      Copy
                    </button>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                    <Link2 size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-700 font-mono">
                      cal.com/{calComUsername}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="flex gap-3">
                  <CalendarIcon size={18} className="text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Don't have a Cal.com account?</p>
                    <p className="text-blue-700 text-xs">
                      <a
                        href="https://cal.com/signup"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium"
                      >
                        Sign up for free
                      </a>{' '}
                      to create your own booking page and manage your availability.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setTempCalComUsername(calComUsername);
                  setShowSettingsModal(false);
                }}
                className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveCalComSettings}
                className="flex items-center gap-2 px-6 py-2.5 bg-care-orange text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
              >
                <Check size={16} />
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;