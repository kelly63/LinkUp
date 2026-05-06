import { useState } from 'react';
import { X, Plus, Trash2, Check, Pencil, Briefcase } from 'lucide-react';
import { coaches as coachesApi, CoachService } from '../lib/api';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';

const PRESET_SERVICES = [
  '1-on-1 Sessions',
  'Group Sessions',
  'Clinics',
  'Team Coaching',
  'Skills Camps',
  'Online Coaching',
  'Video Analysis',
  'Recruiting Prep',
];

function ServiceForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<CoachService>;
  onSave: (s: CoachService) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [price, setPrice] = useState(initial?.price || '');
  const [duration, setDuration] = useState(initial?.duration || '');

  return (
    <div className="bg-white rounded-2xl p-4 border-2 border-emerald-300 shadow-md space-y-3">
      {/* Quick-pick presets */}
      {!initial?.name && (
        <div>
          <p className="text-xs text-slate-500 font-medium mb-2">Quick add</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_SERVICES.map(s => (
              <button
                key={s}
                onClick={() => setName(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  name === s ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      <input
        type="text"
        placeholder="Service name *"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-emerald-400 focus:outline-none transition-colors"
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={2}
        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none resize-none text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Price (e.g. $75/hr)"
          value={price}
          onChange={e => setPrice(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-slate-900 text-sm focus:border-emerald-400 focus:outline-none transition-colors"
        />
        <input
          type="text"
          placeholder="Duration (e.g. 60 min)"
          value={duration}
          onChange={e => setDuration(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-slate-900 text-sm focus:border-emerald-400 focus:outline-none transition-colors"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (!name.trim()) { toast.error('Service name is required'); return; }
            onSave({ name: name.trim(), description, price, duration });
          }}
          disabled={saving}
          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check className="w-4 h-4" /> Save</>}
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface CoachServicesViewProps {
  onClose: () => void;
}

export function CoachServicesView({ onClose }: CoachServicesViewProps) {
  const { token, user, updateUser } = useAuth();
  const [services, setServices] = useState<CoachService[]>((user as any)?.services || []);
  const [showAdd, setShowAdd] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const persist = async (updated: CoachService[]) => {
    if (!token) return;
    setSaving(true);
    try {
      const { user: u } = await coachesApi.updateProfile(token, { services: updated } as any);
      setServices((u as any).services || updated);
      updateUser(u);
    } catch (err: any) {
      toast.error(err.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (s: CoachService) => {
    const updated = [...services, s];
    await persist(updated);
    setShowAdd(false);
    toast.success('Service added');
  };

  const handleEdit = async (index: number, s: CoachService) => {
    const updated = services.map((svc, i) => i === index ? s : svc);
    await persist(updated);
    setEditingIndex(null);
    toast.success('Updated');
  };

  const handleDelete = async (index: number) => {
    const updated = services.filter((_, i) => i !== index);
    await persist(updated);
    toast.success('Removed');
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 px-6 pt-4 pb-6 flex items-center gap-3">
        <button onClick={onClose} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-white" />
        </button>
        <div>
          <h2 className="text-white font-bold text-xl">My Services</h2>
          <p className="text-emerald-300 text-sm">What you offer as a coach or trainer</p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-3">
        {services.map((svc, i) => (
          <div key={i}>
            {editingIndex === i ? (
              <ServiceForm
                initial={svc}
                onSave={s => handleEdit(i, s)}
                onCancel={() => setEditingIndex(null)}
                saving={saving}
              />
            ) : (
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900">{svc.name}</p>
                    {svc.description && <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{svc.description}</p>}
                    <div className="flex flex-wrap gap-3 mt-2">
                      {svc.price && (
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
                          {svc.price}
                        </span>
                      )}
                      {svc.duration && (
                        <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-0.5 rounded-full border border-slate-200">
                          {svc.duration}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setEditingIndex(i)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                      <Pencil className="w-4 h-4 text-slate-400" />
                    </button>
                    <button onClick={() => handleDelete(i)} className="p-2 hover:bg-red-50 rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {showAdd ? (
          <ServiceForm onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full py-4 border-2 border-dashed border-emerald-300 rounded-2xl flex items-center justify-center gap-2 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add a service
          </button>
        )}

        {services.length === 0 && !showAdd && (
          <div className="text-center py-6">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No services listed yet</p>
            <p className="text-slate-400 text-xs mt-1">Tell parents what you offer</p>
          </div>
        )}
      </div>
    </div>
  );
}
