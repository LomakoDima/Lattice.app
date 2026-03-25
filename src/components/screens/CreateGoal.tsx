import { useState } from 'react';
import { Calendar, Target, ArrowLeft } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CategoryChips } from '../ui/CategoryChips';
import { useAuth } from '../../contexts/useAuth';
import { useNavigation } from '../../contexts/NavigationContext';
import { makeGoalRow, upsertGoal } from '../../lib/localWorkspace';
import { DEFAULT_CATEGORY } from '../../constants/categories';

const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-nexus-void/90 px-4 py-3 text-[15px] text-white placeholder:text-neutral-600 transition focus:border-nexus-accent/40 focus:outline-none focus:ring-1 focus:ring-nexus-accent/50';

const labelClass = 'mb-2 block font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500';

export function CreateGoal() {
  const { user } = useAuth();
  const { setCurrentScreen } = useNavigation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const goBack = () => {
    setCurrentScreen('dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError('');

    if (!user?.id) {
      setError('Sign in required.');
      setSaving(false);
      return;
    }

    const row = makeGoalRow({
      userId: user.id,
      title: title.trim(),
      description: description.trim(),
      category,
      targetDate: targetDate || null,
    });
    upsertGoal(user.id, row);

    setTitle('');
    setDescription('');
    setTargetDate('');
    setCategory(DEFAULT_CATEGORY);
    setSaving(false);
    goBack();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-12">
      <button
        type="button"
        onClick={goBack}
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to overview
      </button>

      <header>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-nexus-accent/25 bg-nexus-accent/[0.07] px-3 py-1">
          <Target className="h-4 w-4 text-nexus-accent" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-nexus-accent/90">Goal</span>
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">New goal</h1>
        <p className="mt-2 text-neutral-500">
          Define high-level outcomes in Lattice; break them down into tasks and focus sessions when you execute.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card glass className="p-6 sm:p-8">
          <div className="space-y-6">
            <div>
              <label htmlFor="goal-title" className={labelClass}>
                Title
              </label>
              <input
                id="goal-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Ship MVP to first 100 users"
                required
                className={inputClass}
              />
            </div>

            <div>
              <span id="goal-category-label" className={labelClass}>
                Category
              </span>
              <CategoryChips
                value={category}
                onChange={setCategory}
                labelledBy="goal-category-label"
                className="mt-2"
              />
            </div>

            <div>
              <label htmlFor="goal-desc" className={labelClass}>
                Objective
              </label>
              <textarea
                id="goal-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What success looks like, scope boundaries, and how you will measure completion."
                rows={5}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label htmlFor="goal-date" className={labelClass}>
                Target date <span className="text-neutral-600">(optional)</span>
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                <input
                  id="goal-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className={`${inputClass} pl-10 font-mono text-sm [color-scheme:dark]`}
                />
              </div>
            </div>
          </div>
        </Card>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="primary" size="lg" isLoading={saving} disabled={!title.trim()}>
            Create goal
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={goBack}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
