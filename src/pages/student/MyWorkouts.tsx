import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Clock,
  Play,
  Wind,
  BookOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import VideoPlayerModal from "@/components/VideoPlayerModal";

interface Workout {
  id: string;
  name: string;
  order_index: number;
  exercises: Exercise[];
}

interface Exercise {
  id: string;
  order_index: number;
  name: string;
  sets: string;
  reps: string;
  technique: string | null;
  rest_seconds: string | null;
  notes: string | null;
  video_url: string | null;
}

interface Program {
  id: string;
  name: string;
  is_active: boolean;
  aerobic_info: string | null;
  workouts: Workout[];
}


export default function MyWorkouts() {
  const [program, setProgram] = useState<Program | null>(null);
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>("");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchProgram();
    }
  }, [user]);

  const fetchProgram = async () => {
    setLoading(true);

    // First get student id
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user?.id)
      .single();

    if (studentError || !studentData) {
      setLoading(false);
      return;
    }

    // Fetch active program with workouts and exercises
    const { data: programData, error: programError } = await supabase
      .from("training_programs")
      .select(`
        id,
        name,
        is_active,
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
      `)
      .eq("student_id", studentData.id)
      .eq("is_active", true)
      .single();

    if (programError) {
      console.error("Error fetching program:", programError);
    } else if (programData) {
      // Sort workouts and exercises
      const sortedProgram = {
        ...programData,
        workouts: (programData.workouts as Workout[])
          .sort((a, b) => a.order_index - b.order_index)
          .map(workout => ({
            ...workout,
            exercises: (workout.exercises as Exercise[]).sort((a, b) => a.order_index - b.order_index),
          })),
      };
      setProgram(sortedProgram);
      
      // Expand first workout by default
      if (sortedProgram.workouts.length > 0) {
        setExpandedWorkout(sortedProgram.workouts[0].id);
      }
    }

    setLoading(false);
  };

  const goToLogbook = () => {
    navigate(`/logbook`);
  };

  const openVideo = (url: string | null, exerciseName?: string) => {
    if (!url) return;
    setSelectedVideoUrl(url);
    setSelectedExerciseName(exerciseName || "");
    setVideoModalOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Meus Treinos</h1>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
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

  if (!program) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Meus Treinos</h1>
          <p className="text-muted-foreground">Visualize sua prescrição de treino</p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <Dumbbell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhum treino disponível
            </h3>
            <p className="text-muted-foreground">
              Seu treinador ainda não criou um programa de treino para você.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Meus Treinos</h1>
        <p className="text-muted-foreground">{program.name}</p>
      </div>

      {/* Methodology Info Card */}
      <Card className="border-muted bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Confira a <strong>metodologia de treino</strong> acessando a seção <strong>Plataforma</strong> na barra lateral. Vídeos de 3-5 minutos sobre como extrair o máximo do seu treino.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Na seção <strong>Guia de treino</strong> você encontra as principais informações resumidas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aerobic Info Card - Read Only */}
      {program.aerobic_info && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <Wind className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-primary mb-1">Aeróbico</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {program.aerobic_info}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {program.workouts.map((workout) => (
          <Card key={workout.id} className="overflow-hidden">
            <button
              className="w-full p-4 flex items-center justify-between bg-secondary/50 hover:bg-secondary/70 transition-colors"
              onClick={() =>
                setExpandedWorkout(
                  expandedWorkout === workout.id ? null : workout.id
                )
              }
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">{workout.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {workout.exercises.length} exercícios
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/workout/${workout.id}`);
                  }}
                  size="sm"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Iniciar Treino
                </Button>
                {expandedWorkout === workout.id ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </button>

            {expandedWorkout === workout.id && (
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="excel-table min-w-full">
                    <thead>
                      <tr>
                        <th className="w-12">#</th>
                        <th>Exercício</th>
                        <th className="w-16">Vídeo</th>
                        <th className="w-20">Séries</th>
                        <th className="w-24">Reps</th>
                        <th className="w-24">Técnica</th>
                        <th className="w-24">
                          <Clock className="w-4 h-4 inline mr-1" />
                          Descanso
                        </th>
                        <th>Obs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workout.exercises.map((exercise, index) => (
                        <tr key={exercise.id}>
                          <td className="text-center font-medium text-muted-foreground">
                            {index + 1}
                          </td>
                          <td className="font-medium">{exercise.name}</td>
                          <td className="text-center">
                            {exercise.video_url ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-primary hover:text-primary/80"
                                onClick={() => openVideo(exercise.video_url, exercise.name)}
                                title="Ver vídeo do exercício"
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="text-center">{exercise.sets}</td>
                          <td className="text-center">{exercise.reps}</td>
                          <td className="text-center text-muted-foreground">
                            {exercise.technique || "-"}
                          </td>
                          <td className="text-center text-muted-foreground">
                            {exercise.rest_seconds || "-"}
                          </td>
                          <td className="text-muted-foreground text-sm">
                            {exercise.notes || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
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
