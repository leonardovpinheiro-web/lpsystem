import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Play,
  Check,
  Save,
  Clock,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import VideoPlayerModal from "@/components/VideoPlayerModal";

interface Exercise {
  id: string;
  name: string;
  order_index: number;
  sets: string;
  reps: string;
  video_url: string | null;
  technique: string | null;
  rest_seconds: string | null;
  notes: string | null;
}

interface LastWeekData {
  set1_weight: number | null;
  set1_reps: number | null;
  set2_weight: number | null;
  set2_reps: number | null;
  set3_weight: number | null;
  set3_reps: number | null;
  set4_weight: number | null;
  set4_reps: number | null;
}

interface SetData {
  weight: string;
  reps: string;
}

export default function ActiveWorkout() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [workout, setWorkout] = useState<{ id: string; name: string; program_id: string } | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [lastWeekData, setLastWeekData] = useState<Record<string, LastWeekData>>({});
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, SetData[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [currentWeekId, setCurrentWeekId] = useState<string | null>(null);
  const [currentWeekNumber, setCurrentWeekNumber] = useState<number>(1);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>("");
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<Record<string, SetData[]>>({});

  useEffect(() => {
    if (user && workoutId) {
      fetchWorkoutData();
    }
  }, [user, workoutId]);

  // Timer for elapsed workout time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchWorkoutData = async () => {
    try {
      // Get student id
      const { data: studentData } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!studentData) {
        setLoading(false);
        return;
      }
      setStudentId(studentData.id);

      // Get workout with exercises
      const { data: workoutData, error: workoutError } = await supabase
        .from("workouts")
        .select(`
          id,
          name,
          program_id,
          exercises (
            id,
            name,
            order_index,
            sets,
            reps,
            video_url,
            technique,
            rest_seconds,
            notes
          )
        `)
        .eq("id", workoutId)
        .single();

      if (workoutError || !workoutData) {
        console.error("Error fetching workout:", workoutError);
        setLoading(false);
        return;
      }

      setWorkout({
        id: workoutData.id,
        name: workoutData.name,
        program_id: workoutData.program_id,
      });

      const sortedExercises = (workoutData.exercises as Exercise[])
        .sort((a, b) => a.order_index - b.order_index);
      setExercises(sortedExercises);

      // Expand first exercise
      if (sortedExercises.length > 0) {
        setExpandedExercise(sortedExercises[0].id);
      }

      // Fetch existing weeks to find or create a current one
      const { data: existingWeeks } = await supabase
        .from("logbook_weeks")
        .select(`
          id,
          week_number,
          completed_at,
          entries:logbook_week_entries(
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
        .eq("workout_id", workoutId)
        .eq("student_id", studentData.id)
        .order("week_number", { ascending: false });

      let weekId: string;
      let weekNumber: number;
      let previousWeekData: Record<string, LastWeekData> = {};

      if (existingWeeks && existingWeeks.length > 0) {
        const lastWeek = existingWeeks[0] as any;
        
        // Week is complete if it was explicitly finished by the student (completed_at is set)
        const isWeekComplete = lastWeek.completed_at !== null;

        if (isWeekComplete) {
          // Week is complete, store its data for reference and create a new week
          (lastWeek.entries as any[]).forEach((entry) => {
            if (entry.original_exercise_id) {
              previousWeekData[entry.original_exercise_id] = {
                set1_weight: entry.set1_weight,
                set1_reps: entry.set1_reps,
                set2_weight: entry.set2_weight,
                set2_reps: entry.set2_reps,
                set3_weight: entry.set3_weight,
                set3_reps: entry.set3_reps,
                set4_weight: entry.set4_weight,
                set4_reps: entry.set4_reps,
              };
            }
          });
          setLastWeekData(previousWeekData);

          // Create new week
          weekNumber = lastWeek.week_number + 1;
          const { data: newWeek, error: weekError } = await supabase
            .from("logbook_weeks")
            .insert({
              student_id: studentData.id,
              program_id: workoutData.program_id,
              workout_id: workoutData.id,
              week_number: weekNumber,
            })
            .select()
            .single();

          if (weekError) throw weekError;
          weekId = newWeek.id;

          // Create entries for new week
          const entriesData = sortedExercises.map((ex) => ({
            week_id: weekId,
            exercise_name: ex.name,
            exercise_order: ex.order_index,
            original_exercise_id: ex.id,
          }));
          await supabase.from("logbook_week_entries").insert(entriesData);
        } else {
          // Week exists and is NOT complete - use it and load existing data
          weekId = lastWeek.id;
          weekNumber = lastWeek.week_number;

          // Get the most recent COMPLETED week's data for reference
          // Find the first week with completed_at set (should be existingWeeks[1] if ordered by week_number DESC)
          const completedWeek = existingWeeks.find((w: any) => w.completed_at !== null);
          if (completedWeek) {
            ((completedWeek as any).entries as any[])?.forEach((entry) => {
              if (entry.original_exercise_id) {
                previousWeekData[entry.original_exercise_id] = {
                  set1_weight: entry.set1_weight,
                  set1_reps: entry.set1_reps,
                  set2_weight: entry.set2_weight,
                  set2_reps: entry.set2_reps,
                  set3_weight: entry.set3_weight,
                  set3_reps: entry.set3_reps,
                  set4_weight: entry.set4_weight,
                  set4_reps: entry.set4_reps,
                };
              }
            });
            setLastWeekData(previousWeekData);
          }

          // Load existing data from current week into form
          const initialEntries: Record<string, SetData[]> = {};
          sortedExercises.forEach((ex) => {
            const numSets = parseInt(ex.sets) || 4;
            const existingEntry = (lastWeek.entries as any[])?.find(
              (e) => e.original_exercise_id === ex.id
            );
            
            initialEntries[ex.id] = Array.from({ length: Math.min(numSets, 4) }, (_, i) => ({
              weight: existingEntry?.[`set${i + 1}_weight`]?.toString() || "",
              reps: existingEntry?.[`set${i + 1}_reps`]?.toString() || "",
            }));
          });
          setEntries(initialEntries);
          setCurrentWeekId(weekId);
          setCurrentWeekNumber(weekNumber);
          setLoading(false);
          return;
        }
      } else {
        // Create first week
        weekNumber = 1;
        const { data: newWeek, error: weekError } = await supabase
          .from("logbook_weeks")
          .insert({
            student_id: studentData.id,
            program_id: workoutData.program_id,
            workout_id: workoutData.id,
            week_number: weekNumber,
          })
          .select()
          .single();

        if (weekError) throw weekError;
        weekId = newWeek.id;

        // Create entries
        const entriesData = sortedExercises.map((ex) => ({
          week_id: weekId,
          exercise_name: ex.name,
          exercise_order: ex.order_index,
          original_exercise_id: ex.id,
        }));
        await supabase.from("logbook_week_entries").insert(entriesData);
      }

      setCurrentWeekId(weekId);
      setCurrentWeekNumber(weekNumber);

      // Initialize entries with empty sets
      const initialEntries: Record<string, SetData[]> = {};
      sortedExercises.forEach((ex) => {
        const numSets = parseInt(ex.sets) || 4;
        initialEntries[ex.id] = Array.from({ length: Math.min(numSets, 4) }, () => ({
          weight: "",
          reps: "",
        }));
      });
      setEntries(initialEntries);

      setLoading(false);
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  };

  // Auto-save function
  const saveToDatabase = useCallback(async (exerciseId: string, setsData: SetData[]) => {
    if (!currentWeekId) return;

    setAutoSaving(true);
    try {
      const updateData: Record<string, number | null> = {};
      setsData.forEach((set, index) => {
        const setNum = index + 1;
        if (setNum <= 4) {
          updateData[`set${setNum}_weight`] = set.weight ? parseFloat(set.weight) : null;
          updateData[`set${setNum}_reps`] = set.reps ? parseInt(set.reps) : null;
        }
      });

      await supabase
        .from("logbook_week_entries")
        .update(updateData)
        .eq("week_id", currentWeekId)
        .eq("original_exercise_id", exerciseId);

    } catch (error) {
      console.error("Error auto-saving:", error);
    } finally {
      setAutoSaving(false);
    }
  }, [currentWeekId]);

  // Debounced save
  const debouncedSave = useCallback((exerciseId: string, setsData: SetData[]) => {
    pendingSaveRef.current[exerciseId] = setsData;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      // Save all pending changes
      Object.entries(pendingSaveRef.current).forEach(([exId, data]) => {
        saveToDatabase(exId, data);
      });
      pendingSaveRef.current = {};
    }, 500);
  }, [saveToDatabase]);

  const updateSetValue = (exerciseId: string, setIndex: number, field: "weight" | "reps", value: string) => {
    setEntries((prev) => {
      const exerciseSets = [...(prev[exerciseId] || [])];
      if (!exerciseSets[setIndex]) {
        exerciseSets[setIndex] = { weight: "", reps: "" };
      }
      exerciseSets[setIndex] = { ...exerciseSets[setIndex], [field]: value };
      
      // Trigger auto-save
      debouncedSave(exerciseId, exerciseSets);
      
      return { ...prev, [exerciseId]: exerciseSets };
    });
  };

  const getLastWeekValue = (exerciseId: string, setNum: number, field: "weight" | "reps"): string => {
    const data = lastWeekData[exerciseId];
    if (!data) return "-";
    const key = `set${setNum}_${field}` as keyof LastWeekData;
    const value = data[key];
    return value !== null ? String(value) : "-";
  };

  const finishWorkout = async () => {
    if (!workout || !currentWeekId) return;

    setSaving(true);
    try {
      // Save any pending changes immediately
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Final save for all exercises
      for (const exercise of exercises) {
        const exerciseEntries = entries[exercise.id] || [];
        const updateData: Record<string, number | null> = {};

        exerciseEntries.forEach((set, index) => {
          const setNum = index + 1;
          if (setNum <= 4) {
            updateData[`set${setNum}_weight`] = set.weight ? parseFloat(set.weight) : null;
            updateData[`set${setNum}_reps`] = set.reps ? parseInt(set.reps) : null;
          }
        });

        if (Object.keys(updateData).length > 0) {
          await supabase
            .from("logbook_week_entries")
            .update(updateData)
            .eq("week_id", currentWeekId)
            .eq("original_exercise_id", exercise.id);
        }
      }

      // Mark the week as completed and save notes
      await supabase
        .from("logbook_weeks")
        .update({ 
          completed_at: new Date().toISOString(),
          notes: workoutNotes.trim() || null
        })
        .eq("id", currentWeekId);

      toast({
        title: "Treino finalizado!",
        description: `Dados salvos na Semana ${currentWeekNumber} do logbook.`,
      });

      navigate("/logbook");
    } catch (error) {
      console.error("Error saving workout:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar o treino.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Carregando...</h1>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Treino não encontrado</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{workout.name}</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded-full">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-mono font-medium text-primary">
                {formatTime(elapsedTime)}
              </span>
            </div>
          </div>
          <p className="text-muted-foreground">
            Semana {currentWeekNumber} • Registre suas séries
          </p>
        </div>
        {autoSaving && (
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Save className="w-4 h-4 animate-pulse" />
            <span>Salvando...</span>
          </div>
        )}
      </div>

      {/* Exercise list */}
      <div className="space-y-3">
        {exercises.map((exercise, index) => {
          const isExpanded = expandedExercise === exercise.id;
          const numSets = Math.min(parseInt(exercise.sets) || 4, 4);

          return (
            <Collapsible
              key={exercise.id}
              open={isExpanded}
              onOpenChange={(open) => setExpandedExercise(open ? exercise.id : null)}
            >
              <Card className={isExpanded ? "ring-2 ring-primary" : ""}>
                <CollapsibleTrigger asChild>
                  <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{index + 1}</span>
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold">{exercise.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {exercise.sets} séries × {exercise.reps} reps
                          {exercise.technique && ` • ${exercise.technique}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {exercise.video_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVideoUrl(exercise.video_url);
                            setSelectedExerciseName(exercise.name);
                            setVideoModalOpen(true);
                          }}
                        >
                          <Play className="w-4 h-4 text-primary" />
                        </Button>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4 px-4">
                    {/* Last week reference */}
                    {lastWeekData[exercise.id] && (
                      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-2">Última semana:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Array.from({ length: numSets }, (_, i) => i + 1).map((setNum) => {
                            const weight = getLastWeekValue(exercise.id, setNum, "weight");
                            const reps = getLastWeekValue(exercise.id, setNum, "reps");
                            const hasData = weight !== "-" || reps !== "-";
                            return (
                              <div key={setNum} className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-primary">S{setNum}:</span>
                                <span className={hasData ? "text-foreground" : "text-muted-foreground"}>
                                  {weight} kg × {reps}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Sets input */}
                    <div className="space-y-3">
                      {Array.from({ length: numSets }, (_, i) => i + 1).map((setNum) => (
                        <div
                          key={setNum}
                          className="flex items-center gap-3 p-3 bg-background border rounded-lg"
                        >
                          <div className="w-12 h-8 bg-primary/10 rounded flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">S{setNum}</span>
                          </div>
                          <div className="flex-1 flex gap-2">
                            <div className="flex-1">
                              <Input
                                type="number"
                                inputMode="decimal"
                                placeholder="Kg"
                                className="h-10 text-center"
                                value={entries[exercise.id]?.[setNum - 1]?.weight || ""}
                                onChange={(e) => updateSetValue(exercise.id, setNum - 1, "weight", e.target.value)}
                              />
                            </div>
                            <div className="flex-1">
                              <Input
                                type="number"
                                inputMode="numeric"
                                placeholder="Reps"
                                className="h-10 text-center"
                                value={entries[exercise.id]?.[setNum - 1]?.reps || ""}
                                onChange={(e) => updateSetValue(exercise.id, setNum - 1, "reps", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Notes */}
                    {exercise.notes && (
                      <div className="mt-3 p-2 bg-muted/30 rounded text-sm text-muted-foreground">
                        <span className="font-medium">Obs:</span> {exercise.notes}
                      </div>
                    )}

                    {/* Rest time */}
                    {exercise.rest_seconds && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Descanso: {exercise.rest_seconds}
                      </p>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Workout notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Comentários sobre o treino (opcional)
        </label>
        <Textarea
          placeholder="Como foi o treino? Alguma observação importante?"
          value={workoutNotes}
          onChange={(e) => setWorkoutNotes(e.target.value)}
          className="min-h-[80px]"
        />
      </div>

      {/* Fixed footer button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <div className="max-w-lg mx-auto">
          <Button
            className="w-full h-12 text-lg"
            onClick={finishWorkout}
            disabled={saving}
          >
            {saving ? (
              "Salvando..."
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Finalizar Treino
              </>
            )}
          </Button>
        </div>
      </div>

      <VideoPlayerModal
        open={videoModalOpen}
        onOpenChange={setVideoModalOpen}
        videoUrl={selectedVideoUrl}
        title={selectedExerciseName}
      />
    </div>
  );
}