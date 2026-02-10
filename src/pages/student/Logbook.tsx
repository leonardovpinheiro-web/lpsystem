import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Plus, Dumbbell, Play } from "lucide-react";
import LogbookWeekColumn from "@/components/logbook/LogbookWeekColumn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import VideoPlayerModal from "@/components/VideoPlayerModal";
interface Workout {
  id: string;
  name: string;
  program: {
    name: string;
  };
}

interface LogbookWeek {
  id: string;
  week_number: number;
  workout_id: string;
  notes: string | null;
  workout: {
    name: string;
  };
  entries: LogbookEntry[];
}

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

interface WorkoutExercise {
  id: string;
  name: string;
  order_index: number;
  video_url: string | null;
}

export default function Logbook() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<string>("");
  const [weeks, setWeeks] = useState<LogbookWeek[]>([]);
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<string>>(new Set());
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [activeWeek, setActiveWeek] = useState<string>("1");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>("");
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchWorkouts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedWorkout) {
      fetchLogbookWeeks();
      fetchWorkoutExercises();
    }
  }, [selectedWorkout]);

  const fetchWorkouts = async () => {
    const { data: studentData } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user?.id)
      .single();

    if (!studentData) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("training_programs")
      .select(`
        id,
        name,
        workouts (
          id,
          name
        )
      `)
      .eq("student_id", studentData.id)
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching workouts:", error);
      setLoading(false);
      return;
    }

    const allWorkouts: Workout[] = [];
    data?.forEach((program) => {
      program.workouts?.forEach((workout: { id: string; name: string }) => {
        allWorkouts.push({
          id: workout.id,
          name: workout.name,
          program: { name: program.name },
        });
      });
    });

    setWorkouts(allWorkouts);
    if (allWorkouts.length > 0 && !selectedWorkout) {
      setSelectedWorkout(allWorkouts[0].id);
    }
    setLoading(false);
  };

  const fetchWorkoutExercises = async () => {
    const { data, error } = await supabase
      .from("exercises")
      .select("id, name, order_index, video_url")
      .eq("workout_id", selectedWorkout)
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Error fetching workout exercises:", error);
      return;
    }

    setWorkoutExercises(data || []);
  };

  const fetchLogbookWeeks = async () => {
    const { data, error } = await supabase
      .from("logbook_weeks")
      .select(`
        id,
        week_number,
        workout_id,
        notes,
        workout:workouts(name),
        entries:logbook_week_entries(
          id,
          exercise_name,
          exercise_order,
          original_exercise_id,
          set1_weight,
          set1_reps,
          set2_weight,
          set2_reps,
          set3_weight,
          set3_reps,
          set4_weight,
          set4_reps
        )
      `)
      .eq("workout_id", selectedWorkout)
      .order("week_number", { ascending: true });

    if (error) {
      console.error("Error fetching logbook weeks:", error);
      return;
    }

    // Fetch video URLs for exercises
    const exerciseIds = new Set<string>();
    data?.forEach((week) => {
      (week.entries as any[])?.forEach((entry) => {
        if (entry.original_exercise_id) {
          exerciseIds.add(entry.original_exercise_id);
        }
      });
    });

    let videoMap: Record<string, string | null> = {};
    if (exerciseIds.size > 0) {
      const { data: exercisesData } = await supabase
        .from("exercises")
        .select("id, video_url")
        .in("id", Array.from(exerciseIds));

      exercisesData?.forEach((ex) => {
        videoMap[ex.id] = ex.video_url;
      });
    }

    const formattedWeeks = (data || []).map((week) => ({
      ...week,
      workout: week.workout as { name: string },
      entries: ((week.entries as any[]) || [])
        .map((entry) => ({
          ...entry,
          video_url: entry.original_exercise_id ? videoMap[entry.original_exercise_id] : null,
        }))
        .sort((a, b) => a.exercise_order - b.exercise_order) as LogbookEntry[],
    }));

    setWeeks(formattedWeeks);
    if (formattedWeeks.length > 0) {
      setActiveWeek(formattedWeeks[formattedWeeks.length - 1].week_number.toString());
    }
  };

  const createNewWeek = async () => {
    setCreating(true);

    try {
      // Get student id
      const { data: studentData } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!studentData) throw new Error("Student not found");

      // Get workout and its exercises
      const { data: workoutData } = await supabase
        .from("workouts")
        .select(`
          id,
          program_id,
          exercises (
            id,
            name,
            order_index
          )
        `)
        .eq("id", selectedWorkout)
        .single();

      if (!workoutData) throw new Error("Workout not found");

      // Calculate next week number
      const nextWeekNumber = weeks.length > 0 
        ? Math.max(...weeks.map((w) => w.week_number)) + 1 
        : 1;

      // Create the week
      const { data: newWeek, error: weekError } = await supabase
        .from("logbook_weeks")
        .insert({
          student_id: studentData.id,
          program_id: workoutData.program_id,
          workout_id: selectedWorkout,
          week_number: nextWeekNumber,
        })
        .select()
        .single();

      if (weekError) throw weekError;

      // Create entries for each exercise
      const exercises = workoutData.exercises as { id: string; name: string; order_index: number }[];
      const entries = exercises.map((exercise) => ({
        week_id: newWeek.id,
        exercise_name: exercise.name,
        exercise_order: exercise.order_index,
        original_exercise_id: exercise.id,
      }));

      const { error: entriesError } = await supabase
        .from("logbook_week_entries")
        .insert(entries);

      if (entriesError) throw entriesError;

      toast({
        title: "Semana criada!",
        description: `Semana ${nextWeekNumber} adicionada ao logbook.`,
      });

      fetchLogbookWeeks();
      setActiveWeek(nextWeekNumber.toString());
    } catch (error) {
      console.error("Error creating week:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao criar nova semana",
      });
    } finally {
      setCreating(false);
    }
  };

  const updateEntry = useCallback(
    async (
      entryId: string,
      field: string,
      value: string
    ) => {
      const numValue = value === "" ? null : parseFloat(value);

      const { error } = await supabase
        .from("logbook_week_entries")
        .update({ [field]: numValue })
        .eq("id", entryId);

      if (error) {
        console.error("Error updating entry:", error);
        toast({
          variant: "destructive",
          title: "Erro ao salvar",
          description: "Não foi possível salvar a alteração.",
        });
      }
    },
    [toast]
  );

  const handleInputChange = (
    entryId: string,
    field: string,
    value: string,
    weekNumber: number
  ) => {
    // Update local state immediately for responsive UI
    setWeeks((prev) =>
      prev.map((week) =>
        week.week_number === weekNumber
          ? {
              ...week,
              entries: week.entries.map((entry) =>
                entry.id === entryId
                  ? { ...entry, [field]: value === "" ? null : parseFloat(value) }
                  : entry
              ),
            }
          : week
      )
    );
  };

  const handleInputBlur = (entryId: string, field: string, value: string) => {
    updateEntry(entryId, field, value);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Logbook</h1>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-8 bg-muted rounded w-1/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Logbook</h1>
          <p className="text-muted-foreground">Registro de treinos</p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <Dumbbell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhum treino disponível
            </h3>
            <p className="text-muted-foreground">
              Aguarde seu treinador criar um programa de treinos para você.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentWeek = weeks.find((w) => w.week_number.toString() === activeWeek);

  // Use exercises from the current workout prescription (always up to date)
  const allExercises = workoutExercises.map((e) => ({
    id: e.id,
    name: e.name,
    order: e.order_index,
    video_url: e.video_url,
  }));

  const getEntryForExercise = (week: LogbookWeek, exerciseId: string) => {
    return week.entries.find((e) => e.original_exercise_id === exerciseId);
  };

  const openVideo = (url: string | null, exerciseName?: string) => {
    if (!url) return;
    setSelectedVideoUrl(url);
    setSelectedExerciseName(exerciseName || "");
    setVideoModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Logbook</h1>
          <p className="text-muted-foreground">Registro de cargas e repetições</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedWorkout} onValueChange={setSelectedWorkout}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione um treino" />
            </SelectTrigger>
            <SelectContent>
              {workouts.map((workout) => (
                <SelectItem key={workout.id} value={workout.id}>
                  {workout.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={createNewWeek} disabled={creating}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Semana
          </Button>
        </div>
      </div>

      {weeks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhuma semana registrada
            </h3>
            <p className="text-muted-foreground mb-4">
              Clique em "Nova Semana" para iniciar o registro do seu treino.
            </p>
            <Button onClick={createNewWeek} disabled={creating}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Semana
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="overflow-x-auto">
              <div className="flex gap-0">
                {/* Fixed exercise column */}
                <div className="flex-shrink-0 min-w-[180px] border-r border-border">
                  <div className="h-14 border-b border-border" />
                  <div className="h-8 border-b border-border bg-muted/30" />
                  {allExercises.map((exercise, index) => (
                    <div
                      key={exercise.name}
                      className={`h-12 flex items-center justify-between px-3 border-b border-border ${
                        index % 2 === 0 ? "bg-background" : "bg-muted/20"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2 font-medium text-sm">
                        <span className="w-5 h-5 bg-primary/10 rounded flex items-center justify-center text-xs font-medium text-primary">
                          {exercise.order + 1}
                        </span>
                        <span className="truncate max-w-[100px]">{exercise.name}</span>
                      </span>
                      {exercise.video_url && (
                        <button
                          onClick={() => openVideo(exercise.video_url, exercise.name)}
                          className="p-1 rounded hover:bg-primary/10 transition-colors"
                          title="Ver vídeo de execução"
                        >
                          <Play className="w-4 h-4 text-primary" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Scrollable weeks columns */}
                <div className="flex overflow-x-auto">
                  {weeks.map((week) => (
                    <LogbookWeekColumn
                      key={week.id}
                      week={week}
                      collapsed={collapsedWeeks.has(week.id)}
                      onToggle={() => {
                        setCollapsedWeeks((prev) => {
                          const next = new Set(prev);
                          if (next.has(week.id)) next.delete(week.id);
                          else next.add(week.id);
                          return next;
                        });
                      }}
                      allExercises={allExercises}
                      getEntryForExercise={getEntryForExercise}
                      variant="editable"
                      onInputChange={handleInputChange}
                      onInputBlur={handleInputBlur}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <VideoPlayerModal
        open={videoModalOpen}
        onOpenChange={setVideoModalOpen}
        videoUrl={selectedVideoUrl}
        title={selectedExerciseName}
      />
    </div>
  );
}
