import { Check, PlayCircle } from "lucide-react";
import type { Lesson } from "@/data/lessons";
import { cn } from "@/lib/utils";

interface LessonListProps {
  lessons: Lesson[];
  currentId: string;
  watchedIds: Set<string>;
  onSelect: (lesson: Lesson) => void;
}

export function LessonList({ lessons, currentId, watchedIds, onSelect }: LessonListProps) {
  return (
    <nav className="flex flex-col gap-1">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 pb-2">
        Metodologia de treino
      </h2>
      {lessons.map((lesson, index) => {
        const isActive = lesson.id === currentId;
        const isWatched = watchedIds.has(lesson.id);

        return (
          <button
            key={lesson.id}
            onClick={() => onSelect(lesson)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-all duration-200 group",
              "hover:bg-secondary/80",
              isActive
                ? "bg-primary/10 border border-primary/20"
                : "border border-transparent"
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isWatched
                  ? "bg-emerald-500/15 text-emerald-600"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isWatched && !isActive ? (
                <Check className="h-4 w-4" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-medium truncate",
                  isActive ? "text-primary" : "text-foreground"
                )}
              >
                {lesson.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lesson.duration}
              </p>
            </div>

            {isActive && (
              <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
