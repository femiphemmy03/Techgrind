import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../services/api';

export default function NotificationsList() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications').then(({ data }) => setNotifications(data.notifications)).finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!notifications.length) return null;

  return (
    <div className="card mb-6">
      <h3 className="font-semibold mb-3 flex items-center gap-2"><Bell size={16} className="text-tggreen" /> Notifications</h3>
      <div className="space-y-3">
        {notifications.map((n) => (
          <div key={n.id} className="border-t border-surfaceborder pt-3 first:border-t-0 first:pt-0">
            <p className="text-sm font-medium">{n.title}</p>
            <p className="text-sm text-muted mt-1">{n.body}</p>
            <p className="text-xs text-muted mt-1">{new Date(n.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
