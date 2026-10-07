import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { api } from '../services/api';

export default function NotificationsList() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications').then(({ data }) => setNotifications(data.notifications)).finally(() => setLoading(false));
  }, []);

  // Only removes it from this person's own feed — doesn't delete the notification itself,
  // so a broadcast still shows normally for everyone else who hasn't dismissed it.
  const dismiss = async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id)); // optimistic
    try {
      await api.delete(`/notifications/${id}`);
    } catch {
      api.get('/notifications').then(({ data }) => setNotifications(data.notifications)); // put it back
    }
  };

  if (loading) return null;
  if (!notifications.length) return null;

  return (
    <div className="card mb-6">
      <h3 className="font-semibold mb-3 flex items-center gap-2"><Bell size={16} className="text-tggreen" /> Notifications</h3>
      <div className="space-y-3">
        {notifications.map((n) => (
          <div key={n.id} className="border-t border-surfaceborder pt-3 first:border-t-0 first:pt-0 flex justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-sm text-muted mt-1">{n.body}</p>
              <p className="text-xs text-muted mt-1">{new Date(n.created_at).toLocaleString()}</p>
            </div>
            <button onClick={() => dismiss(n.id)} title="Dismiss" className="shrink-0">
              <X size={14} className="text-muted hover:text-offwhite" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}