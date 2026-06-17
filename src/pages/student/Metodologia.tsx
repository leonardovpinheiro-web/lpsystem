import { useState, useCallback, useMemo } from "react";
import { lessons, type Lesson } from "@/data/lessons";
import { LessonList } from "@/components/LessonList";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useUserProgress } from "@/hooks/useVideoProgress";

export default function Metodologia() {
  const { progress, saveProgress } = useUserProgress();
  const [currentLesson, setCurrentLesson] = useState<Lesson>(lessons[0]);

  const watchedIds = useMemo(() => {
    const s = new Set<string>();
    Object.values(progress).forEach((p) => {
      if (p.completed_at || p.max_percent >= 90) s.add(p.lesson_id);
    });
    return s;
  }, [progress]);

  const handleSelect = useCallback((lesson: Lesson) => {
    setCurrentLesson(lesson);
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Metodologia</h1>
        <p className="text-sm text-muted-foreground">Assista às aulas da metodologia de treino.</p>
      </div>

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
