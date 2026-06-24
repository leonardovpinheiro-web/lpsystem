import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Eye, Loader2 } from "lucide-react";
import ProgramPreview, {
  type PreviewProgram,
  type PreviewWorkout,
  type PreviewExercise,
} from "@/components/admin/preview/ProgramPreview";
import ActiveWorkoutPreview from "@/components/admin/preview/ActiveWorkoutPreview";

const DEMO_PROGRAM_ID = "8b97d96b-c0b7-4afb-94f5-8027ee3428ab";

export default function Demo() {
  const [program, setProgram] = useState<PreviewProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [view, setView] = useState<"program" | "workout">("program");
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErrored(false);

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
        .eq("id", DEMO_PROGRAM_ID)
        .single();

      if (cancelled) return;

      if (error || !data) {
        console.error("Error loading demo program:", error);
        setErrored(true);
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
  }, []);

  const activeWorkout =
    program?.workouts.find((w) => w.id === activeWorkoutId) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-semibold truncate">
                Sistema LP — amostra de treino
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Pré-visualização de como o aluno vê o treino na plataforma
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Carregando amostra...
          </div>
        ) : errored || !program ? (
          <p className="text-center text-muted-foreground py-12">
            Não foi possível carregar a amostra. Tente novamente em instantes.
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
      </main>
    </div>
  );
}
