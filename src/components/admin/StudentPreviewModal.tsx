import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Loader2 } from "lucide-react";
import ProgramPreview, {
  type PreviewProgram,
  type PreviewWorkout,
  type PreviewExercise,
} from "./preview/ProgramPreview";
import ActiveWorkoutPreview from "./preview/ActiveWorkoutPreview";

interface StudentPreviewModalProps {
  programId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StudentPreviewModal({
  programId,
  open,
  onOpenChange,
}: StudentPreviewModalProps) {
  const [program, setProgram] = useState<PreviewProgram | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"program" | "workout">("program");
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setView("program");
    setActiveWorkoutId(null);
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("training_programs")
        .select(
          `
          id,
          name,
          aerobic_info,
          workouts (
            id,
            name,
            order_index,
            exercises (
              id,
              order_index,
              name,
              sets,
              reps,
              technique,
              rest_seconds,
              notes,
              video_url
            )
          )
        `
        )
        .eq("id", programId)
        .single();

      if (cancelled) return;

      if (error || !data) {
        console.error("Error loading preview program:", error);
        setProgram(null);
      } else {
        const sorted: PreviewProgram = {
          id: data.id,
          name: data.name,
          aerobic_info: data.aerobic_info,
          workouts: ((data.workouts as PreviewWorkout[]) || [])
            .sort((a, b) => a.order_index - b.order_index)
            .map((w) => ({
              ...w,
              exercises: ((w.exercises as PreviewExercise[]) || []).sort(
                (a, b) => a.order_index - b.order_index
              ),
            })),
        };
        setProgram(sorted);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, programId]);

  const activeWorkout =
    program?.workouts.find((w) => w.id === activeWorkoutId) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-6 py-3">
          <DialogTitle className="flex items-center gap-2 text-base font-medium">
            <Eye className="w-4 h-4 text-primary" />
            Pré-visualização — modo aluno
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Carregando prévia...
            </div>
          ) : !program ? (
            <p className="text-center text-muted-foreground py-12">
              Não foi possível carregar o programa.
            </p>
          ) : view === "workout" && activeWorkout ? (
            <ActiveWorkoutPreview
              workout={activeWorkout}
              onBack={() => {
                setView("program");
                setActiveWorkoutId(null);
              }}
            />
          ) : (
            <ProgramPreview
              program={program}
              onStartWorkout={(id) => {
                setActiveWorkoutId(id);
                setView("workout");
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
