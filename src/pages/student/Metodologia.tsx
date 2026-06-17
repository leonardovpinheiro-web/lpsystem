import { useState, useCallback, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { lessons, type Lesson } from "@/data/lessons";
import { LessonList } from "@/components/LessonList";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useUserProgress } from "@/hooks/useVideoProgress";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Lock } from "lucide-react";

const UNLOCK_THRESHOLD = 75;

export default function Metodologia() {
  const { progress, saveProgress } = useUserProgress();
  const { isAdmin, onboardingCompleted, markOnboardingComplete } = useAuth();
  const [currentLesson, setCurrentLesson] = useState<Lesson>(lessons[0]);

  const watchedIds = useMemo(() => {
    const s = new Set<string>();
    lessons.forEach((l) => {
      const pct = progress[l.id]?.max_percent ?? 0;
      if (pct >= UNLOCK_THRESHOLD) s.add(l.id);
    });
    return s;
  }, [progress]);

  const completedCount = watchedIds.size;
  const totalCount = lessons.length;
  const allWatched = completedCount === totalCount;
  const showGate = !isAdmin && !onboardingCompleted;

  useEffect(() => {
    if (showGate && allWatched) {
      markOnboardingComplete();
    }
  }, [showGate, allWatched, markOnboardingComplete]);

  const handleSelect = useCallback((lesson: Lesson) => {
    setCurrentLesson(lesson);
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Metodologia</h1>
        <p className="text-sm text-muted-foreground">Assista às aulas da metodologia de treino.</p>
      </div>

      {showGate && !allWatched && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Assista pelo menos {UNLOCK_THRESHOLD}% de cada aula para liberar o restante da plataforma.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Progress value={(completedCount / totalCount) * 100} className="flex-1" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {completedCount} / {totalCount} aulas
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isAdmin && onboardingCompleted && showGate === false && allWatched && (
        <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/5 p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm flex-1">Plataforma liberada! Você pode acessar todas as áreas.</p>
          <Button asChild size="sm">
            <Link to="/">Ir para meus treinos</Link>
          </Button>
        </div>
      )}

      <div className="flex gap-6">
        <aside className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-6 rounded-xl bg-card border p-4">
            <LessonList
              lessons={lessons}
              currentId={currentLesson.id}
              watchedIds={watchedIds}
              onSelect={handleSelect}
            />
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="rounded-xl bg-card border p-4 sm:p-6">
            <VideoPlayer lesson={currentLesson} onProgress={saveProgress} />
          </div>
        </main>
      </div>

      <div className="lg:hidden mt-6">
        <div className="rounded-xl bg-card border p-4">
          <LessonList
            lessons={lessons}
            currentId={currentLesson.id}
            watchedIds={watchedIds}
            onSelect={handleSelect}
          />
        </div>
      </div>
    </div>
  );
}
