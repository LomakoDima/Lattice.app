import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Link2, AlertCircle, Calendar } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CategoryChips } from '../ui/CategoryChips';
import { useAuth } from '../../contexts/useAuth';
import { useNavigation } from '../../contexts/NavigationContext';
import { apiCreateTask, apiListGoals } from '../../lib/workspaceApi';
import { DEFAULT_CATEGORY } from '../../constants/categories';

type GoalOption = { id: string; title: string };

const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-nexus-void/90 px-4 py-3 text-[15px] text-white placeholder:text-neutral-600 transition focus:border-nexus-accent/40 focus:outline-none focus:ring-1 focus:ring-nexus-accent/50';

const labelClass = 'mb-2 block font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500';

const chevronStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238a8a8f'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
} as const;

export function CreateTask() {
  const { user } = useAuth();
  const { setCurrentScreen } = useNavigation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalId, setGoalId] = useState<string>('');
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORY);
  const [goals, setGoals] = useState<GoalOption[]>([]);
  const [deadline, setDeadline] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const prefill = sessionStorage.getItem('nexus-prefill-goal');
    if (prefill) {
      setGoalId(prefill);
      sessionStorage.removeItem('nexus-prefill-goal');
    }
  }, []);

  // Load active goals from the API
  useEffect(() => {
    if (!user?.id) { setGoals([]); return; }
    apiListGoals({ limit: 200 })
      .then(({ goals: rows }) => {
        setGoals(
          rows
            .filter((g) => g.status === 'active')
            .map((g) => ({ id: g.id, title: g.title }))
        );
      })
      .catch(() => setGoals([]));
  }, [user?.id]);

  const linkedGoalTitle = useMemo(() => goals.find((g) => g.id === goalId)?.title, [goals, goalId]);

  const goBack = () => setCurrentScreen('dashboard');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user?.id) return;

    setCreating(true);
    setError('');

    try {
      await apiCreateTask({
        title: title.trim(),
        description: description.trim(),
        category,
        goal_id: goalId || null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
      });
      setTitle('');
      setDescription('');
      setGoalId('');
      setCategory(DEFAULT_CATEGORY);
      setDeadline('');
      setCurrentScreen('tasks');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative mx-auto max-w-2xl pb-16">
      <div className="relative space-y-6">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to overview
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card glass className="relative overflow-hidden p-6 sm:p-8">
            <div className="mb-6 flex flex-col gap-1 border-b border-white/[0.06] pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-nexus-accent/90">Create</p>
                <h2 className="font-display mt-1 text-lg font-semibold text-white">New task</h2>
              </div>
              {linkedGoalTitle ? (
                <p className="font-mono text-[10px] text-neutral-500">
                  <span className="text-neutral-600">Goal · </span>
                  <span className="text-neutral-300">{linkedGoalTitle}</span>
                </p>
              ) : null}
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="task-title" className={labelClass}>
                  Title <span className="text-red-400/90">*</span>
                </label>
                <input
                  id="task-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Draft onboarding copy"
                  required
                  autoComplete="off"
                  className={inputClass}
                />
                <p className="mt-2 font-mono text-[10px] text-neutral-600">
                  Use a clear, actionable title—ideally completable in one focus session.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <span id="task-category-label" className={labelClass}>Category</span>
                  <CategoryChips
                    value={category}
                    onChange={setCategory}
                    labelledBy="task-category-label"
                    className="mt-2"
                  />
                </div>

                <div>
                  <label htmlFor="task-goal" className={`${labelClass} flex items-center gap-2`}>
                    <Link2 className="h-3 w-3 text-neutral-600" />
                    Goal <span className="font-normal text-neutral-600">(optional)</span>
                  </label>
                  <select
                    id="task-goal"
                    value={goalId}
                    onChange={(e) => setGoalId(e.target.value)}
                    className={`${inputClass} cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
                    style={chevronStyle}
                  >
                    <option value="">No goal</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                  {goals.length === 0 ? (
                    <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                      No active goals —{' '}
                      <button
                        type="button"
                        className="text-nexus-accent underline decoration-nexus-accent/40 underline-offset-2 hover:text-[#d4f76f]"
                        onClick={() => setCurrentScreen('create-goal')}
                      >
                        create a goal
                      </button>{' '}
                      first.
                    </p>
                  ) : null}
                </div>
              </div>

              <div>
                <label htmlFor="task-desc" className={labelClass}>Notes</label>
                <textarea
                  id="task-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Acceptance criteria, links, constraints…"
                  rows={5}
                  className={`${inputClass} resize-y min-h-[120px]`}
                />
              </div>

              <div>
                <label htmlFor="task-deadline" className={labelClass}>
                  Deadline <span className="font-normal text-neutral-600">(optional)</span>
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <input
                    id="task-deadline"
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className={`${inputClass} pl-10 font-mono text-sm [color-scheme:dark]`}
                  />
                </div>
                <p className="mt-2 font-mono text-[10px] text-neutral-600">Entered in your local time; stored in UTC.</p>
              </div>
            </div>
          </Card>

          {error ? (
            <div
              className="flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-nexus-ink/50 p-5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[10px] text-neutral-600">
              {title.trim() ? 'Ready to save.' : 'Enter a title to continue.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="ghost" size="lg" onClick={goBack}>Cancel</Button>
              <Button type="submit" variant="primary" size="lg" isLoading={creating} disabled={!title.trim()}>
                Create task
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
