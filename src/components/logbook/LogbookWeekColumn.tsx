import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";

interface LogbookEntry {
  id: string;
  exercise_name: string;
  exercise_order: number;
  original_exercise_id: string | null;
  video_url: string | null;
  set1_weight: number | null;
  set1_reps: number | null;
  set2_weight: number | null;
  set2_reps: number | null;
  set3_weight: number | null;
  set3_reps: number | null;
  set4_weight: number | null;
  set4_reps: number | null;
}

interface LogbookWeek {
  id: string;
  week_number: number;
  workout_id: string;
  notes?: string | null;
  workout: { name: string };
  entries: LogbookEntry[];
}

interface Exercise {
  id: string;
  name: string;
  order: number;
  video_url: string | null;
}

interface LogbookWeekColumnProps {
  week: LogbookWeek;
  collapsed: boolean;
  onToggle: () => void;
  allExercises: Exercise[];
  getEntryForExercise: (week: LogbookWeek, exerciseId: string) => LogbookEntry | undefined;
  variant: "readonly" | "editable";
  onInputChange?: (entryId: string, field: string, value: string, weekNumber: number) => void;
  onInputBlur?: (entryId: string, field: string, value: string) => void;
}

export default function LogbookWeekColumn({
  week,
  collapsed,
  onToggle,
  allExercises,
  getEntryForExercise,
  variant,
  onInputChange,
  onInputBlur,
}: LogbookWeekColumnProps) {
  if (collapsed) {
    return (
      <div className="flex-shrink-0 w-12 border-r border-border last:border-r-0">
        <button
          onClick={onToggle}
          className="w-full h-full min-h-[calc(14*0.25rem+8*0.25rem+3rem*var(--exercise-count,1))] flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors cursor-pointer py-4"
          style={{ "--exercise-count": allExercises.length } as React.CSSProperties}
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-bold text-muted-foreground [writing-mode:vertical-lr] rotate-180">
            S{week.week_number}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 min-w-[320px] border-r border-border last:border-r-0">
      {/* Week header */}
      <div
        className="h-14 flex items-center justify-center gap-2 border-b border-border bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
        onClick={onToggle}
      >
        <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-lg font-bold">Semana {week.week_number}</h3>
      </div>

      {/* Series headers */}
      <div className="h-8 flex border-b border-border bg-muted/30">
        {[1, 2, 3, 4].map((setNum) => (
          <div key={setNum} className="flex-1 flex items-center justify-center gap-1 border-r border-border last:border-r-0">
            <span className="text-xs text-muted-foreground font-medium">S{setNum}</span>
            <span className="text-[10px] text-muted-foreground">(kg/rep)</span>
          </div>
        ))}
      </div>

      {/* Exercise rows */}
      {allExercises.map((exercise, index) => {
        const entry = getEntryForExercise(week, exercise.id);
        return (
          <div
            key={`${week.id}-${exercise.id}`}
            className={`h-12 flex ${index % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
          >
            {[1, 2, 3, 4].map((setNum) => (
              <div
                key={`set-${setNum}`}
                className="flex-1 flex items-center justify-center gap-1 border-r border-border last:border-r-0 px-1"
              >
                {entry ? (
                  variant === "editable" ? (
                    <>
                      <Input
                        type="number"
                        step="0.5"
                        className="h-8 w-12 text-center text-xs p-1"
                        value={entry[`set${setNum}_weight` as keyof LogbookEntry] ?? ""}
                        onChange={(e) =>
                          onInputChange?.(entry.id, `set${setNum}_weight`, e.target.value, week.week_number)
                        }
                        onBlur={(e) =>
                          onInputBlur?.(entry.id, `set${setNum}_weight`, e.target.value)
                        }
                        placeholder="kg"
                      />
                      <Input
                        type="number"
                        className="h-8 w-10 text-center text-xs p-1"
                        value={entry[`set${setNum}_reps` as keyof LogbookEntry] ?? ""}
                        onChange={(e) =>
                          onInputChange?.(entry.id, `set${setNum}_reps`, e.target.value, week.week_number)
                        }
                        onBlur={(e) =>
                          onInputBlur?.(entry.id, `set${setNum}_reps`, e.target.value)
                        }
                        placeholder="r"
                      />
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium">
                        {entry[`set${setNum}_weight` as keyof LogbookEntry] ?? "-"}
                      </span>
                      <span className="text-xs text-muted-foreground">/</span>
                      <span className="text-sm">
                        {entry[`set${setNum}_reps` as keyof LogbookEntry] ?? "-"}
                      </span>
                    </>
                  )
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {/* Week notes */}
      {week.notes && (
        <div className="h-auto min-h-[40px] p-2 bg-muted/30 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Comentário:</span> {week.notes}
          </p>
        </div>
      )}
    </div>
  );
}
