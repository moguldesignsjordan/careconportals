import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Plus, ExternalLink } from 'lucide-react';
import { UserRole } from '../types';

interface Event {
  id: string;
  title: string;
  date: string; // ISO string
  time: string;
  location: string;
  type: 'inspection' | 'meeting' | 'delivery' | 'visit';
}

interface CalendarModuleProps {
  role: UserRole;
}

const MOCK_EVENTS: Event[] = [
  { id: '1', title: 'Rough-in Inspection', date: new Date().toISOString(), time: '02:00 PM', location: 'Connor Residence', type: 'inspection' },
  { id: '2', title: 'Drywall Delivery', date: new Date(Date.now() + 86400000).toISOString(), time: '09:00 AM', location: 'Connor Residence', type: 'delivery' },
  { id: '3', title: 'Project Kickoff: Basement', date: new Date(Date.now() + 172800000).toISOString(), time: '11:30 AM', location: 'Office / Zoom', type: 'meeting' },
];

const CalendarModule: React.FC<CalendarModuleProps> = ({ role }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getTypeColor = (type: Event['type']) => {
    switch (type) {
      case 'inspection': return 'bg-blue-500';
      case 'delivery': return 'bg-care-orange';
      case 'meeting': return 'bg-purple-500';
      case 'visit': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-black/5 border border-gray-100 overflow-hidden flex flex-col lg:flex-row">
      {/* Calendar Grid Section */}
      <div className="p-8 lg:w-2/3 border-b lg:border-b-0 lg:border-r border-gray-50">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tight text-gray-900">{monthNames[currentDate.getMonth()]}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{currentDate.getFullYear()}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors"><ChevronLeft size={20} /></button>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors"><ChevronRight size={20} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-[10px] font-black uppercase tracking-widest text-gray-300 py-2">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-16 md:h-24"></div>
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();
            const hasEvent = MOCK_EVENTS.some(e => new Date(e.date).getDate() === day && new Date(e.date).getMonth() === currentDate.getMonth());
            
            return (
              <div key={day} className={`h-16 md:h-24 rounded-2xl p-2 border transition-all ${isToday ? 'border-care-orange bg-care-orange/5' : 'border-gray-50 hover:border-gray-200'}`}>
                <span className={`text-xs font-black ${isToday ? 'text-care-orange' : 'text-gray-400'}`}>{day}</span>
                {hasEvent && (
                  <div className="mt-1 flex gap-1 flex-wrap">
                    {MOCK_EVENTS.filter(e => new Date(e.date).getDate() === day).map(e => (
                      <div key={e.id} className={`w-1.5 h-1.5 rounded-full ${getTypeColor(e.type)}`}></div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Events / Scheduling Section */}
      <div className="p-8 lg:w-1/3 bg-gray-50/30">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Upcoming</h3>
          {role !== UserRole.CLIENT && (
            <button className="text-care-orange hover:text-care-orange/80 transition-colors">
              <Plus size={20} />
            </button>
          )}
        </div>

        <div className="space-y-4">
          {MOCK_EVENTS.map(event => (
            <div key={event.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 group hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-3">
                <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full text-white ${getTypeColor(event.type)}`}>
                  {event.type}
                </span>
                <span className="text-[10px] font-bold text-gray-300">{event.time}</span>
              </div>
              <h4 className="font-black text-gray-900 text-sm mb-2">{event.title}</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin size={12} />
                  <span className="text-[10px] font-bold">{event.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-8 border-t border-gray-100">
          <a 
            href="https://calendar.google.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-4 bg-[#1A1A1A] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-care-orange transition-all"
          >
            <ExternalLink size={14} />
            Sync Google Calendar
          </a>
          <p className="text-center mt-4 text-[9px] font-bold text-gray-300 uppercase tracking-widest">
            Powered by Cal.com Integration
          </p>
        </div>
      </div>
    </div>
  );
};

export default CalendarModule;