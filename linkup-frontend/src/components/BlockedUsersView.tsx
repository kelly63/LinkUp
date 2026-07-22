import { ArrowLeft, Ban, UserCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { users as usersApi, avatarThumb } from '../lib/api';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

interface BlockedUsersViewProps {
  onBack: () => void;
}

export function BlockedUsersView({ onBack }: BlockedUsersViewProps) {
  const { token } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<{ _id: string; name: string; avatar?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    usersApi.getBlockedUsers(token)
      .then(({ blockedUsers }) => setBlockedUsers(blockedUsers))
      .catch(() => toast.error('Could not load blocked users'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleUnblock = async (userId: string, name: string) => {
    if (!token) return;
    setUnblocking(userId);
    try {
      await usersApi.unblockUser(token, userId);
      setBlockedUsers((prev) => prev.filter((u) => u._id !== userId));
      toast.success(`${name} has been unblocked`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not unblock user');
    } finally {
      setUnblocking(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-2">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h2 className="text-slate-900">Blocked Users</h2>
        </div>
      </div>

      <div className="p-6 max-w-md mx-auto">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading…</div>
        ) : blockedUsers.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Ban className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-slate-900 font-semibold mb-2">No Blocked Users</h3>
            <p className="text-sm text-slate-500">You haven't blocked anyone. Blocked users can't message you or view your profile.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{blockedUsers.length} blocked</p>
            </div>
            <div className="divide-y divide-slate-100">
              {blockedUsers.map((u) => (
                <div key={u._id} className="px-5 py-4 flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-slate-400 to-slate-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden">
                    {u.avatar
                      ? <img src={avatarThumb(u.avatar, 80)!} alt={u.name} className="w-full h-full object-cover" />
                      : getInitials(u.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{u.name}</p>
                    <p className="text-xs text-slate-500">Blocked</p>
                  </div>
                  <button
                    onClick={() => handleUnblock(u._id, u.name)}
                    disabled={unblocking === u._id}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    <UserCheck className="w-4 h-4" />
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">
          Blocked users cannot message you, view your profile, or find you in search.
        </p>
      </div>
    </div>
  );
}
