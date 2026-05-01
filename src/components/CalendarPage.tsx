// src/components/CalendarPage.tsx
import React, { useState, useMemo } from 'react';
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
  ExternalLink,
  Trash2,
  Edit3,
  Check,
  Link2,
  Copy,
  Settings,
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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const EVENT_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  meeting:      { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500' },
  inspection:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500' },
  'site-visit': { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',    dot: 'bg-teal-500' },
  delivery:     { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  dot: 'bg-indigo-500' },
  deadline:     { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500' },
  other:        { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  dot: 'bg-purple-500' },
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
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);

  const [calComUsername, setCalComUsername] = useState(() => {
    return localStorage.getItem('calcom_username') || '';
  });
  const [tempCalComUsername, setTempCalComUsername] = useState(calComUsername);

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    type: 'meeting' as CalendarEvent['type'],
    location: '',
    attendeeIds: [] as string[],
    projectId: '',
  });

  const isAdmin = currentUser.role === UserRole.ADMIN;

  // ─── Helpers ──────────────────────────────────────────

  const resetForm = (date?: Date) => {
    setEventForm({
      title: '',
      description: '',
      date: (date || new Date()).toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
      type: 'meeting',
      location: '',
      attendeeIds: [],
      projectId: '',
    });
  };

  const getUserName = (id: string) => {
    const u = users.find((usr) => usr.id === id);
    return u ? u.name : 'Unknown';
  };

  const getColorForType = (type: string) => EVENT_COLORS[type] || EVENT_COLORS.other;

  // ─── Calendar math ────────────────────────────────────

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const days: (Date | null)[] = [];

    for (let i = 0; i < startOffset; i++) {
      days.push(new Date(year, month, -startOffset + i + 1));
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
    return days;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter((e) => e.date === dateStr);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => date.getMonth() === currentDate.getMonth();

  // ─── Navigation ───────────────────────────────────────

  const navigatePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const navigateNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const getHeaderDateDisplay = () => {
    if (viewMode === 'month') {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (viewMode === 'week') {
      const ws = weekDays[0];
      const we = weekDays[6];
      if (ws.getMonth() === we.getMonth()) {
        return `${MONTHS[ws.getMonth()]} ${ws.getDate()} – ${we.getDate()}, ${ws.getFullYear()}`;
      }
      return `${MONTHS[ws.getMonth()]} ${ws.getDate()} – ${MONTHS[we.getMonth()]} ${we.getDate()}, ${ws.getFullYear()}`;
    }
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
  };

  // ─── Event CRUD ───────────────────────────────────────

  const handleDateClick = (date: Date) => {
    if (!isAdmin) return; // only admins create events
    setSelectedDate(date);
    resetForm(date);
    setEditingEvent(null);
    setShowEventModal(true);
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return; // clients/contractors view only
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || '',
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime || '',
      type: event.type,
      location: event.location || '',
      attendeeIds: event.attendeeIds || [],
      projectId: event.projectId || '',
    });
    setShowEventModal(true);
  };

  const handleSaveEvent = async () => {
    if (!eventForm.title.trim() || saving) return;
    setSaving(true);

    try {
      if (editingEvent && onUpdateEvent) {
        await onUpdateEvent(editingEvent.id, {
          title: eventForm.title,
          description: eventForm.description || undefined,
          date: eventForm.date,
          startTime: eventForm.startTime,
          endTime: eventForm.endTime || undefined,
          type: eventForm.type,
          location: eventForm.location || undefined,
          attendeeIds: eventForm.attendeeIds,
          projectId: eventForm.projectId || undefined,
        });
      } else if (onCreateEvent) {
        await onCreateEvent({
          title: eventForm.title,
          description: eventForm.description || undefined,
          date: eventForm.date,
          startTime: eventForm.startTime,
          endTime: eventForm.endTime || undefined,
          type: eventForm.type,
          location: eventForm.location || undefined,
          projectId: eventForm.projectId || undefined,
          attendeeIds: eventForm.attendeeIds,
          createdBy: currentUser.id,
        });
      }
      setShowEventModal(false);
      setEditingEvent(null);
      resetForm();
    } catch (err) {
      console.error('Failed to save event:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!onDeleteEvent) return;
    try {
      await onDeleteEvent(eventId);
      setShowEventModal(false);
      setEditingEvent(null);
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  // ─── Cal.com helpers ──────────────────────────────────

  const saveCalComSettings = () => {
    localStorage.setItem('calcom_username', tempCalComUsername);
    setCalComUsername(tempCalComUsername);
    setShowSettingsModal(false);
  };

  const copyCalComLink = () => {
    if (calComUsername) navigator.clipboard.writeText(`https://cal.com/${calComUsername}`);
  };

  // ─── Upcoming events list (sidebar / top section) ─────

  const upcomingEvents = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return events
      .filter((e) => e.date >= todayStr)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      })
      .slice(0, 5);
  }, [events]);

  // ─── Time slots for week / day view ───────────────────

  const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
    const hour = i + 7; // 7 AM – 8 PM
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const formatTimeLabel = (slot: string) => {
    const h = parseInt(slot);
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
  };

  // ─── Render helpers ───────────────────────────────────

  const renderEventPill = (event: CalendarEvent, compact = false) => {
    const c = getColorForType(event.type);
    return (
      <button
        key={event.id}
        onClick={(e) => handleEventClick(event, e)}
        className={`w-full text-left rounded-lg border ${c.bg} ${c.border} ${c.text} transition-all ${
          isAdmin ? 'hover:shadow-sm cursor-pointer' : 'cursor-default'
        } ${compact ? 'px-1.5 py-0.5 text-[10px] leading-tight' : 'px-2 py-1 text-xs'}`}
      >
        <div className="flex items-center gap-1 truncate">
          <span className={`w-1.5 h-1.5 rounded-full ${c.dot} shrink-0`} />
          <span className="font-medium truncate">{event.title}</span>
        </div>
        {!compact && (
          <span className="text-[10px] opacity-70 ml-2.5">
            {event.startTime}
            {event.endTime ? ` – ${event.endTime}` : ''}
          </span>
        )}
      </button>
    );
  };

  // ─── Role-based header text ───────────────────────────

  const pageTitle = isAdmin ? 'Calendar' : 'My Appointments';
  const pageSubtitle = isAdmin
    ? 'Manage all project appointments and schedules'
    : 'Your scheduled appointments with Care General Construction';

  // ═════════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════════

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          {/* Nav arrows */}
          <div className="flex items-center gap-1">
            <button
              onClick={navigatePrev}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <button
              onClick={navigateNext}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>

          <div className="hidden sm:block">
            <h1 className="text-xl font-bold text-gray-900">{getHeaderDateDisplay()}</h1>
            <p className="text-xs text-gray-500 mt-0.5">{pageSubtitle}</p>
          </div>

          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View mode toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                  viewMode === mode
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Cal.com settings (admin only) */}
          {isAdmin && (
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
              title="Cal.com Settings"
            >
              <Settings size={18} className="text-gray-500" />
            </button>
          )}

          {/* Book Meeting via Cal.com */}
          {calComUsername && (
            <button
              onClick={() => setShowCalComModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:border-gray-300 transition-all"
            >
              <Video size={16} />
              Book Meeting
            </button>
          )}

          {/* New Event (admin only) */}
          {isAdmin && (
            <button
              onClick={() => {
                resetForm();
                setEditingEvent(null);
                setShowEventModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-care-orange text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-all shadow-sm"
            >
              <Plus size={16} />
              New Event
            </button>
          )}
        </div>
      </div>

      {/* Mobile date display */}
      <div className="sm:hidden text-lg font-semibold text-gray-900 mb-4">
        {getHeaderDateDisplay()}
      </div>

      {/* ── Main content ────────────────────────────── */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Calendar grid */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
          {/* ── MONTH VIEW ──────────────────────────── */}
          {viewMode === 'month' && (
            <>
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

              <div className="flex-1 grid grid-cols-7 grid-rows-6">
                {calendarDays.map((date, idx) => {
                  if (!date) return <div key={idx} className="border-b border-r border-gray-50" />;
                  const dayEvents = getEventsForDate(date);
                  const isCurrent = isCurrentMonth(date);
                  const isTodayDate = isToday(date);

                  return (
                    <div
                      key={idx}
                      onClick={() => handleDateClick(date)}
                      className={`min-h-[100px] p-2 border-b border-r border-gray-50 transition-colors ${
                        isAdmin ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'
                      } ${!isCurrent ? 'bg-gray-50/50' : ''}`}
                    >
                      <div
                        className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                          isTodayDate
                            ? 'bg-care-orange text-white'
                            : isCurrent
                            ? 'text-gray-900'
                            : 'text-gray-400'
                        }`}
                      >
                        {date.getDate()}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((ev) => renderEventPill(ev, true))}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-gray-500 font-medium pl-1">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── WEEK VIEW ───────────────────────────── */}
          {viewMode === 'week' && (
            <div className="flex-1 overflow-auto">
              {/* Day headers */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-100 sticky top-0 bg-white z-10">
                <div className="py-3" />
                {weekDays.map((date, i) => (
                  <div
                    key={i}
                    className={`py-3 text-center border-l border-gray-100 ${
                      isToday(date) ? 'bg-orange-50/50' : ''
                    }`}
                  >
                    <div className="text-[10px] font-semibold text-gray-500 uppercase">
                      {DAYS[date.getDay()]}
                    </div>
                    <div
                      className={`text-sm font-bold mt-0.5 ${
                        isToday(date) ? 'text-care-orange' : 'text-gray-900'
                      }`}
                    >
                      {date.getDate()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time grid */}
              {TIME_SLOTS.map((slot) => (
                <div
                  key={slot}
                  className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-50 min-h-[60px]"
                >
                  <div className="pr-2 pt-1 text-right text-[10px] text-gray-400 font-medium">
                    {formatTimeLabel(slot)}
                  </div>
                  {weekDays.map((date, i) => {
                    const dayEvents = getEventsForDate(date).filter(
                      (e) => e.startTime.startsWith(slot.split(':')[0])
                    );
                    return (
                      <div
                        key={i}
                        onClick={() => handleDateClick(date)}
                        className={`border-l border-gray-50 p-0.5 ${
                          isAdmin ? 'cursor-pointer hover:bg-gray-50' : ''
                        } ${isToday(date) ? 'bg-orange-50/30' : ''}`}
                      >
                        {dayEvents.map((ev) => renderEventPill(ev))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* ── DAY VIEW ────────────────────────────── */}
          {viewMode === 'day' && (
            <div className="flex-1 overflow-auto">
              <div className="px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
                <h2 className="text-sm font-bold text-gray-900">
                  {DAYS[currentDate.getDay()]},{' '}
                  {MONTHS[currentDate.getMonth()]} {currentDate.getDate()}
                </h2>
              </div>
              {TIME_SLOTS.map((slot) => {
                const slotEvents = getEventsForDate(currentDate).filter(
                  (e) => e.startTime.startsWith(slot.split(':')[0])
                );
                return (
                  <div
                    key={slot}
                    onClick={() => handleDateClick(currentDate)}
                    className={`flex border-b border-gray-50 min-h-[64px] ${
                      isAdmin ? 'cursor-pointer hover:bg-gray-50' : ''
                    }`}
                  >
                    <div className="w-16 shrink-0 pr-2 pt-2 text-right text-xs text-gray-400 font-medium">
                      {formatTimeLabel(slot)}
                    </div>
                    <div className="flex-1 border-l border-gray-100 p-1 space-y-1">
                      {slotEvents.map((ev) => {
                        const c = getColorForType(ev.type);
                        return (
                          <div
                            key={ev.id}
                            onClick={(e) => handleEventClick(ev, e)}
                            className={`rounded-xl border ${c.bg} ${c.border} p-3 ${
                              isAdmin ? 'cursor-pointer hover:shadow-sm' : ''
                            }`}
                          >
                            <div className={`text-sm font-semibold ${c.text}`}>{ev.title}</div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {ev.startTime}
                                {ev.endTime ? ` – ${ev.endTime}` : ''}
                              </span>
                              {ev.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin size={12} />
                                  {ev.location}
                                </span>
                              )}
                            </div>
                            {ev.attendeeIds?.length > 0 && (
                              <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-400">
                                <Users size={10} />
                                {ev.attendeeIds.map((id) => getUserName(id)).join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Sidebar: Upcoming ─────────────────────── */}
        <div className="hidden xl:block w-72 space-y-4 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">
              {isAdmin ? 'Upcoming Events' : 'Upcoming Appointments'}
            </h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No upcoming events</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((ev) => {
                  const c = getColorForType(ev.type);
                  const evDate = new Date(ev.date + 'T00:00:00');
                  return (
                    <div
                      key={ev.id}
                      className={`rounded-xl border ${c.bg} ${c.border} p-3 ${
                        isAdmin ? 'cursor-pointer hover:shadow-sm' : ''
                      }`}
                      onClick={(e) => isAdmin && handleEventClick(ev, e as any)}
                    >
                      <div className={`text-xs font-bold ${c.text}`}>{ev.title}</div>
                      <div className="text-[10px] text-gray-500 mt-1">
                        {MONTHS[evDate.getMonth()]} {evDate.getDate()} · {ev.startTime}
                        {ev.endTime ? ` – ${ev.endTime}` : ''}
                      </div>
                      {ev.attendeeIds?.length > 0 && (
                        <div className="text-[10px] text-gray-400 mt-1 truncate">
                          {ev.attendeeIds.map((id) => getUserName(id)).join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cal.com quick link */}
          {calComUsername && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Video size={14} className="text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900">Quick Booking</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Share this link so clients can book time with you.
              </p>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <Link2 size={12} className="text-gray-400 shrink-0" />
                <span className="text-xs text-gray-600 font-mono truncate">
                  cal.com/{calComUsername}
                </span>
                <button onClick={copyCalComLink} className="ml-auto shrink-0">
                  <Copy size={12} className="text-gray-400 hover:text-care-orange" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/*  MODALS                                         */}
      {/* ═══════════════════════════════════════════════ */}

      {/* ── Create / Edit Event Modal (admin only) ──── */}
      {showEventModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowEventModal(false);
              setEditingEvent(null);
            }}
          />
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="bg-gray-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-care-orange rounded-xl flex items-center justify-center">
                  <CalendarIcon size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {editingEvent ? 'Edit Event' : 'New Event'}
                  </h2>
                  <p className="text-xs text-white/50">
                    {editingEvent ? 'Update event details' : 'Schedule a new event'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEventModal(false);
                  setEditingEvent(null);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form body */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Event title"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-0"
                />
              </div>

              {/* Date + Times */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm((p) => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Start
                  </label>
                  <input
                    type="time"
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm((p) => ({ ...p, startTime: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    End
                  </label>
                  <input
                    type="time"
                    value={eventForm.endTime}
                    onChange={(e) => setEventForm((p) => ({ ...p, endTime: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-0"
                  />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Type
                </label>
                <select
                  value={eventForm.type}
                  onChange={(e) =>
                    setEventForm((p) => ({ ...p, type: e.target.value as CalendarEvent['type'] }))
                  }
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-0"
                >
                  <option value="meeting">Meeting</option>
                  <option value="inspection">Inspection</option>
                  <option value="site-visit">Site Visit</option>
                  <option value="delivery">Delivery</option>
                  <option value="deadline">Deadline</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder="Address or meeting link"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-0"
                />
              </div>

              {/* Project */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Project
                </label>
                <select
                  value={eventForm.projectId}
                  onChange={(e) => setEventForm((p) => ({ ...p, projectId: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-0"
                >
                  <option value="">No project</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Attendees */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Attendees
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                  {users
                    .filter((u) => u.id !== currentUser.id)
                    .map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={eventForm.attendeeIds.includes(u.id)}
                          onChange={() => {
                            setEventForm((p) => ({
                              ...p,
                              attendeeIds: p.attendeeIds.includes(u.id)
                                ? p.attendeeIds.filter((id) => id !== u.id)
                                : [...p.attendeeIds, u.id],
                            }));
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-care-orange focus:ring-care-orange"
                        />
                        <span className="text-sm text-gray-700">{u.name}</span>
                        <span className="text-[10px] text-gray-400 capitalize ml-auto">
                          {u.role}
                        </span>
                      </label>
                    ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Optional notes…"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-0 resize-none"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between">
              {editingEvent ? (
                <button
                  onClick={() => handleDeleteEvent(editingEvent.id)}
                  className="flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              ) : (
                <div />
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEventModal(false);
                    setEditingEvent(null);
                  }}
                  className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEvent}
                  disabled={!eventForm.title.trim() || saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-care-orange text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  <Check size={16} />
                  {saving ? 'Saving…' : editingEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cal.com Booking Modal ───────────────────── */}
      {showCalComModal && calComUsername && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCalComModal(false)}
          />
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

      {/* ── Settings Modal (admin only) ─────────────── */}
      {showSettingsModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSettingsModal(false)}
          />
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