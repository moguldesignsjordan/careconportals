// src/components/GoogleCalendarConnect.tsx
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Link2, 
  Unlink, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  ChevronDown,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { googleCalendarService, GoogleCalendarList } from '../services/googleCalendar';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

interface GoogleCalendarConnectProps {
  onConnectionChange?: (connected: boolean) => void;
  compact?: boolean;
}

const GoogleCalendarConnect: React.FC<GoogleCalendarConnectProps> = ({ 
  onConnectionChange,
  compact = false,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [calendars, setCalendars] = useState<GoogleCalendarList['items']>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string>('primary');
  const [showCalendarDropdown, setShowCalendarDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    const connected = googleCalendarService.isConnected();
    setIsConnected(connected);
    
    if (connected) {
      setSelectedCalendar(googleCalendarService.getSelectedCalendarId());
      await fetchCalendars();
    }
  };

  const fetchCalendars = async () => {
    try {
      const calendarList = await googleCalendarService.getCalendarList();
      setCalendars(calendarList.items || []);
      setLastSync(new Date());
    } catch (err) {
      console.error('Failed to fetch calendars:', err);
      // Token might be invalid
      if ((err as Error).message.includes('Not authenticated')) {
        setIsConnected(false);
        googleCalendarService.clearTokens();
      }
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Configure provider with calendar scopes
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      
      // Force account selection
      provider.setCustomParameters({
        prompt: 'consent',
        access_type: 'offline',
      });

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (credential?.accessToken) {
        // Store the token (expires in 1 hour typically)
        googleCalendarService.setTokens(credential.accessToken, 3600);
        setIsConnected(true);
        onConnectionChange?.(true);
        await fetchCalendars();
      } else {
        throw new Error('No access token received');
      }
    } catch (err: any) {
      console.error('Failed to connect to Google Calendar:', err);
      setError(err.message || 'Failed to connect to Google Calendar');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    googleCalendarService.clearTokens();
    setIsConnected(false);
    setCalendars([]);
    setSelectedCalendar('primary');
    onConnectionChange?.(false);
  };

  const handleCalendarSelect = (calendarId: string) => {
    setSelectedCalendar(calendarId);
    googleCalendarService.setSelectedCalendarId(calendarId);
    setShowCalendarDropdown(false);
  };

  const handleRefresh = async () => {
    setIsConnecting(true);
    try {
      await handleConnect();
    } finally {
      setIsConnecting(false);
    }
  };

  const selectedCalendarName = calendars.find(c => c.id === selectedCalendar)?.summary || 'Primary Calendar';

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {isConnected ? (
          <>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle size={16} />
              <span className="text-xs font-medium">Google Calendar Connected</span>
            </div>
            <button
              onClick={handleDisconnect}
              className="text-xs text-gray-500 hover:text-red-500 transition-colors"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {isConnecting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Calendar size={14} className="text-blue-500" />
            )}
            Connect Google Calendar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Calendar size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Google Calendar</h3>
            <p className="text-xs text-gray-500">
              {isConnected ? 'Connected and syncing' : 'Connect to sync your events'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {isConnected ? (
          <>
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-green-500" />
                <div>
                  <p className="text-sm font-bold text-green-800">Connected</p>
                  {lastSync && (
                    <p className="text-xs text-green-600">
                      Last synced: {lastSync.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isConnecting}
                className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                title="Refresh connection"
              >
                <RefreshCw size={16} className={`text-green-600 ${isConnecting ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Calendar Selection */}
            {calendars.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Active Calendar
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowCalendarDropdown(!showCalendarDropdown)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900">{selectedCalendarName}</span>
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>

                  {showCalendarDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
                      {calendars.map((calendar) => (
                        <button
                          key={calendar.id}
                          onClick={() => handleCalendarSelect(calendar.id)}
                          className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors ${
                            calendar.id === selectedCalendar ? 'bg-gray-50' : ''
                          }`}
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: calendar.backgroundColor || '#4285f4' }}
                          />
                          <span className="text-sm text-gray-900 flex-1 text-left">
                            {calendar.summary}
                            {calendar.primary && (
                              <span className="ml-2 text-xs text-gray-500">(Primary)</span>
                            )}
                          </span>
                          {calendar.id === selectedCalendar && (
                            <CheckCircle size={14} className="text-green-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Disconnect Button */}
            <button
              onClick={handleDisconnect}
              className="w-full flex items-center justify-center gap-2 p-3 bg-gray-100 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <Unlink size={16} />
              Disconnect Google Calendar
            </button>
          </>
        ) : (
          <>
            {/* Benefits */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Link2 size={14} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Two-way sync</p>
                  <p className="text-xs text-gray-500">Events sync between your app and Google Calendar</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar size={14} className="text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">All your events in one place</p>
                  <p className="text-xs text-gray-500">See personal and work events together</p>
                </div>
              </div>
            </div>

            {/* Connect Button */}
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full flex items-center justify-center gap-2 p-4 bg-[#1A1A1A] text-white rounded-xl text-sm font-bold hover:bg-care-orange transition-colors disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Connect with Google
                </>
              )}
            </button>

            <p className="text-xs text-gray-400 text-center">
              We'll request access to view and manage your calendar events
            </p>
          </>
        )}
      </div>

      {/* Footer Link */}
      {isConnected && (
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-blue-500 transition-colors"
          >
            Open Google Calendar
            <ExternalLink size={12} />
          </a>
        </div>
      )}
    </div>
  );
};

export default GoogleCalendarConnect;