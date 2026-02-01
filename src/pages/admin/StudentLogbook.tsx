import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardList, Play } from "lucide-react";
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
}

interface WorkoutExercise {
  id: string;
  name: string;
  order_index: number;
  video_url: string | null;
}

interface LogbookWeek {
  id: string;
  week_number: number;
  workout_id: string;
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

interface StudentInfo {
  id: string;
  profile: {
    full_name: string;
    email: string;
  };
}

export default function StudentLogbook() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<string>("");
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [weeks, setWeeks] = useState<LogbookWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>("");

  useEffect(() => {
    if (studentId) {
      fetchStudentData();
    }
  }, [studentId]);

  useEffect(() => {
    if (selectedWorkout) {
      fetchLogbookWeeks();
      fetchWorkoutExercises();
    }
  }, [selectedWorkout]);

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

  const fetchStudentData = async () => {
    // Fetch student info
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select(`
        id,
        user_id
      `)
      .eq("id", studentId)
      .single();

    if (studentError || !studentData) {
      console.error("Error fetching student:", studentError);
      setLoading(false);
      return;
    }

    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", studentData.user_id)
      .single();

    setStudent({
      id: studentData.id,
      profile: profileData || { full_name: "Unknown", email: "" },
    });

    // Fetch workouts
    const { data: programsData } = await supabase
      .from("training_programs")
      .select(`
        id,
        name,
        workouts (
          id,
          name
        )
      `)
      .eq("student_id", studentId);

    const allWorkouts: Workout[] = [];
    programsData?.forEach((program) => {
      program.workouts?.forEach((workout: { id: string; name: string }) => {
        allWorkouts.push({
          id: workout.id,
          name: workout.name,
        });
      });
    });

    setWorkouts(allWorkouts);
    if (allWorkouts.length > 0) {
      setSelectedWorkout(allWorkouts[0].id);
    }
    setLoading(false);
  };

  const fetchLogbookWeeks = async () => {
    const { data, error } = await supabase
      .from("logbook_weeks")
      .select(`
        id,
        week_number,
        workout_id,
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
  };

  const openVideo = (url: string | null, exerciseName?: string) => {
    if (!url) return;
    setSelectedVideoUrl(url);
    setSelectedExerciseName(exerciseName || "");
    setVideoModalOpen(true);
  };

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/students")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Carregando...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/students")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Aluno não encontrado</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/students")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Logbook - {student.profile.full_name}</h1>
            <p className="text-muted-foreground">{student.profile.email}</p>
          </div>
        </div>
        {workouts.length > 0 && (
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
        )}
      </div>

      {workouts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhum treino encontrado
            </h3>
            <p className="text-muted-foreground">
              Este aluno não possui treinos atribuídos.
            </p>
          </CardContent>
        </Card>
      ) : weeks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhum registro no logbook
            </h3>
            <p className="text-muted-foreground">
              O aluno ainda não registrou nenhuma semana de treino.
            </p>
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
                      key={exercise.id}
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
                    <div key={week.id} className="flex-shrink-0 min-w-[320px] border-r border-border last:border-r-0">
                      {/* Week header */}
                      <div className="h-14 flex items-center justify-center border-b border-border bg-muted/50">
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
                            className={`h-12 flex ${
                              index % 2 === 0 ? "bg-background" : "bg-muted/20"
                            }`}
                          >
                            {[1, 2, 3, 4].map((setNum) => (
                              <div
                                key={`set-${setNum}`}
                                className="flex-1 flex items-center justify-center gap-2 border-r border-border last:border-r-0 px-2"
                              >
                                {entry ? (
                                  <>
                                    <span className="text-sm font-medium">
                                      {entry[`set${setNum}_weight` as keyof LogbookEntry] ?? "-"}
                                    </span>
                                    <span className="text-xs text-muted-foreground">/</span>
                                    <span className="text-sm">
                                      {entry[`set${setNum}_reps` as keyof LogbookEntry] ?? "-"}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
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
