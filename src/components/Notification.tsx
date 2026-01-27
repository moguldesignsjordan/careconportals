
import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { Notification as NotificationItem } from '../types';

interface NotificationProps {
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
}

const Notification: React.FC<NotificationProps> = ({ notifications, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      {notifications.map((n) => (
        <Toast key={n.id} item={n} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const Toast: React.FC<{ item: NotificationItem; onDismiss: (id: string) => void }> = ({ item, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), 5000);
    return () => clearTimeout(timer);
  }, [item.id, onDismiss]);

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const icons = {
    success: <CheckCircle size={18} className="text-green-500" />,
    error: <XCircle size={18} className="text-red-500" />,
    info: <AlertCircle size={18} className="text-blue-500" />,
  };

  return (
    <div className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl animate-in slide-in-from-right-8 fade-in duration-300 min-w-[300px] max-w-md ${styles[item.type]}`}>
      <div className="shrink-0">{icons[item.type]}</div>
      <p className="flex-1 text-sm font-bold tracking-tight">{item.message}</p>
      <button 
        onClick={() => onDismiss(item.id)}
        className="p-1 hover:bg-black/5 rounded-lg transition-colors text-current/50"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Notification;
