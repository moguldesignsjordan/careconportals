// src/components/CalendarPage.tsx
import React, { useState } from 'react';
import {
  Settings,
  ExternalLink,
  Calendar as CalendarIcon,
  X,
  Check,
  Info,
  Eye,
  EyeOff,
} from 'lucide-react';
import { User, Project, CalendarEvent } from '../types';

interface CalendarPageProps {
  currentUser: User;
}

const CalendarPage: React.FC<CalendarPageProps> = ({ currentUser }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [calendarId, setCalendarId] = useState(() => {
    return localStorage.getItem('google_calendar_id') || '';
  });
  const [tempCalendarId, setTempCalendarId] = useState(calendarId);
  const [viewMode, setViewMode] = useState<'MONTH' | 'WEEK' | 'AGENDA'>(() => {
    return (localStorage.getItem('google_calendar_view') as 'MONTH' | 'WEEK' | 'AGENDA') || 'MONTH';
  });
  const [showWeekends, setShowWeekends] = useState(() => {
    return localStorage.getItem('google_calendar_weekends') !== 'false';
  });
  const [colorTheme, setColorTheme] = useState(() => {
    return localStorage.getItem('google_calendar_theme') || 'F15A2B'; // Care orange
  });

  // Build the Google Calendar embed URL
  const buildCalendarUrl = () => {
    if (!calendarId) return null;

    const params = new URLSearchParams({
      src: calendarId,
      ctz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      mode: viewMode,
      showTitle: '0',
      showNav: '1',
      showDate: '1',
      showPrint: '0',
      showTabs: '1',
      showCalendars: '0',
      showTz: '0',
      wkst: '1', // Week starts on Sunday
      bgcolor: '#ffffff',
      color: `#${colorTheme}`,
    });

    if (!showWeekends) {
      params.set('showWeekends', '0');
    }

    return `https://calendar.google.com/calendar/embed?${params.toString()}`;
  };

  const handleSaveSettings = () => {
    setCalendarId(tempCalendarId);
    localStorage.setItem('google_calendar_id', tempCalendarId);
    localStorage.setItem('google_calendar_view', viewMode);
    localStorage.setItem('google_calendar_weekends', showWeekends.toString());
    localStorage.setItem('google_calendar_theme', colorTheme);
    setShowSettings(false);
  };

  const handleViewModeChange = (mode: 'MONTH' | 'WEEK' | 'AGENDA') => {
    setViewMode(mode);
    localStorage.setItem('google_calendar_view', mode);
  };

  const calendarUrl = buildCalendarUrl();

  const colorOptions = [
    { value: 'F15A2B', label: 'Orange (Brand)', preview: '#F15A2B' },
    { value: '4285f4', label: 'Blue', preview: '#4285f4' },
    { value: '0f9d58', label: 'Green', preview: '#0f9d58' },
    { value: 'db4437', label: 'Red', preview: '#db4437' },
    { value: '9c27b0', label: 'Purple', preview: '#9c27b0' },
    { value: '607d8b', label: 'Gray', preview: '#607d8b' },
  ];

  return (
    <div className="space-y-6 h-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">
            Schedule & Events
          </p>
          <h1 className="text-2xl font-black text-gray-900">Google Calendar</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleViewModeChange('MONTH')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'MONTH' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => handleViewModeChange('WEEK')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'WEEK' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => handleViewModeChange('AGENDA')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'AGENDA' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              Agenda
            </button>
          </div>

          <button
            onClick={() => setShowSettings(true)}
            className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
            title="Calendar Settings"
          >
            <Settings size={18} className="text-gray-500" />
          </button>

          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-xs font-bold hover:bg-care-orange transition-colors"
          >
            <ExternalLink size={14} />
            Open Google Calendar
          </a>
        </div>
      </div>

      {/* Calendar Container */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
        {calendarUrl ? (
          <iframe
            key={`${calendarId}-${viewMode}-${showWeekends}-${colorTheme}`}
            src={calendarUrl}
            style={{ border: 0, width: '100%', height: '100%' }}
            frameBorder="0"
            scrolling="no"
            title="Google Calendar"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
              <CalendarIcon size={40} className="text-white" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Connect Your Google Calendar</h2>
            <p className="text-gray-500 text-center max-w-md mb-8">
              Display your Google Calendar events directly in this dashboard. Click the button below to configure your calendar.
            </p>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-xl text-sm font-bold hover:bg-care-orange transition-colors"
            >
              <Settings size={18} />
              Configure Calendar
            </button>

            {/* Quick Help */}
            <div className="mt-8 p-4 bg-blue-50 rounded-xl max-w-lg">
              <div className="flex items-start gap-3">
                <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-bold mb-1">How to find your Calendar ID:</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700">
                    <li>Open Google Calendar</li>
                    <li>Click the ⚙️ gear icon → Settings</li>
                    <li>Select your calendar on the left</li>
                    <li>Scroll to "Integrate calendar"</li>
                    <li>Copy the "Calendar ID" (usually your email)</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          />
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-[#1A1A1A] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-care-orange rounded-xl flex items-center justify-center">
                  <CalendarIcon size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black">Calendar Settings</h2>
                  <p className="text-[10px] text-white/50 uppercase tracking-widest">
                    Configure your Google Calendar
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Calendar ID Input */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Google Calendar ID *
                </label>
                <input
                  type="text"
                  value={tempCalendarId}
                  onChange={(e) => setTempCalendarId(e.target.value)}
                  placeholder="your-email@gmail.com or calendar ID"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-0 font-mono"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Usually your email address, or a specific calendar ID from Google Calendar settings.
                </p>
              </div>

              {/* Instructions */}
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <div className="flex items-start gap-3">
                  <Info size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold text-amber-800 mb-2">Important: Make your calendar public</p>
                    <p className="text-amber-700 mb-2">
                      For the calendar to display here, you need to make it publicly accessible:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-amber-700 text-xs">
                      <li>Go to <a href="https://calendar.google.com/calendar/r/settings" target="_blank" rel="noopener noreferrer" className="underline font-medium">Google Calendar Settings</a></li>
                      <li>Select your calendar on the left</li>
                      <li>Under "Access permissions for events", check "Make available to public"</li>
                      <li>Choose "See all event details"</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* View Mode */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Default View
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['MONTH', 'WEEK', 'AGENDA'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      className={`px-4 py-3 rounded-xl border-2 text-sm font-bold capitalize transition-all ${
                        viewMode === mode
                          ? 'border-care-orange bg-care-orange/10 text-care-orange'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      {mode.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Show Weekends Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  {showWeekends ? <Eye size={18} className="text-gray-500" /> : <EyeOff size={18} className="text-gray-500" />}
                  <div>
                    <p className="text-sm font-bold text-gray-900">Show Weekends</p>
                    <p className="text-xs text-gray-500">Display Saturday and Sunday</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWeekends(!showWeekends)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    showWeekends ? 'bg-care-orange' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      showWeekends ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Color Theme */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Accent Color
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setColorTheme(color.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${
                        colorTheme === color.value
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: color.preview }}
                      />
                      <span className="text-xs font-medium text-gray-700">{color.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-between">
              <button
                onClick={() => {
                  setTempCalendarId('');
                  setCalendarId('');
                  localStorage.removeItem('google_calendar_id');
                  setShowSettings(false);
                }}
                className="px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                Disconnect
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setTempCalendarId(calendarId);
                    setShowSettings(false);
                  }}
                  className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={!tempCalendarId.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-bold hover:bg-care-orange transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={16} />
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;