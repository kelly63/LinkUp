import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Check, User } from 'lucide-react';
import { children as childrenApi, Child } from '../lib/api';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';

const SPORTS = ['Baseball', 'Softball', 'Soccer', 'Basketball', 'Volleyball', 'Football', 'Lacrosse', 'Field Hockey', 'Track and Field', 'Golf', 'Tennis', 'Swimming', 'Wrestling', 'Cross Country'];
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Competitive', 'Elite'];

function ChildForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<Child>;
  onSave: (data: Omit<Child, '_id'>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [age, setAge] = useState(initial?.age?.toString() || '');
  const [sports, setSports] = useState<string[]>(initial?.sports || []);
  const [skillLevel, setSkillLevel] = useState(initial?.skillLevel || '');
  const [notes, setNotes] = useState(initial?.notes || '');

  const toggle = (s: string) => setSports(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  return (
    <div className="bg-white rounded-2xl p-4 border-2 border-emerald-300 shadow-md space-y-3">
      <input
        type="text"
        placeholder="Child's name *"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-emerald-400 focus:outline-none transition-colors"
      />
      <input
        type="number"
        placeholder="Age"
        value={age}
        onChange={e => setAge(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 focus:border-emerald-400 focus:outline-none transition-colors"
      />
      <div>
        <p className="text-sm text-slate-600 mb-2 font-medium">Sports</p>
        <div className="flex flex-wrap gap-2">
          {SPORTS.map(s => (
            <button
              key={s}
              onClick={() => toggle(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                sports.includes(s) ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm text-slate-600 mb-2 font-medium">Skill Level</p>
        <div className="flex flex-wrap gap-2">
          {SKILL_LEVELS.map(l => (
            <button
              key={l}
              onClick={() => setSkillLevel(skillLevel === l ? '' : l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                skillLevel === l ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <textarea
        placeholder="Notes (optional — e.g. goals, injuries, schedule)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={2}
        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none transition-colors resize-none text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (!name.trim()) { toast.error('Child name is required'); return; }
            onSave({ name: name.trim(), age: age ? Number(age) : null, sports, skillLevel, notes });
          }}
          disabled={saving}
          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          {saving
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><Check className="w-4 h-4" /> Save</>}
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function ChildProfilesView() {
  const { token, user, updateUser } = useAuth();
  const [childList, setChildList] = useState<Child[]>((user as any)?.children || []);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshChildren = (updated: Child[]) => {
    setChildList(updated);
    if (user) updateUser({ ...user, children: updated } as any);
  };

  const handleAdd = async (data: Omit<Child, '_id'>) => {
    if (!token) return;
    setSaving(true);
    try {
      const { children } = await childrenApi.add(token, data);
      refreshChildren(children);
      setShowAdd(false);
      toast.success(`${data.name} added!`);
    } catch (err: any) {
      toast.error(err.message || 'Could not add child');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (childId: string, data: Omit<Child, '_id'>) => {
    if (!token) return;
    setSaving(true);
    try {
      const { children } = await childrenApi.update(token, childId, data);
      refreshChildren(children);
      setEditingId(null);
      toast.success('Updated!');
    } catch (err: any) {
      toast.error(err.message || 'Could not update');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (childId: string, name: string) => {
    if (!token) return;
    setDeletingId(childId);
    try {
      const { children } = await childrenApi.remove(token, childId);
      refreshChildren(children);
      toast.success(`${name} removed`);
    } catch (err: any) {
      toast.error(err.message || 'Could not remove');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 px-6 pt-4 pb-6">
        <h2 className="text-white font-bold text-xl">My Children</h2>
        <p className="text-emerald-300 text-sm mt-1">Manage your kids' profiles for personalized matches</p>
      </div>

      <div className="px-6 py-5 space-y-4">
        {childList.map(child => (
          <div key={child._id}>
            {editingId === child._id ? (
              <ChildForm
                initial={child}
                onSave={data => handleEdit(child._id, data)}
                onCancel={() => setEditingId(null)}
                saving={saving}
              />
            ) : (
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {child.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{child.name}</p>
                      {child.age && <p className="text-sm text-slate-500">Age {child.age}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(child._id)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                      <Pencil className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(child._id, child.name)}
                      disabled={deletingId === child._id}
                      className="p-2 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
                {child.sports.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {child.sports.map(s => (
                      <span key={s} className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-0.5 rounded-full border border-emerald-200">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                {child.skillLevel && (
                  <p className="text-xs text-slate-500 mt-1.5">
                    Skill level: <span className="font-medium text-slate-700">{child.skillLevel}</span>
                  </p>
                )}
                {child.notes && <p className="text-xs text-slate-400 mt-1.5 italic">{child.notes}</p>}
              </div>
            )}
          </div>
        ))}

        {showAdd ? (
          <ChildForm onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full py-4 border-2 border-dashed border-emerald-300 rounded-2xl flex items-center justify-center gap-2 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add a child
          </button>
        )}

        {childList.length === 0 && !showAdd && (
          <div className="text-center py-4">
            <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No children added yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
