import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Play,
  Wind,
  HelpCircle,
  X,
} from "lucide-react";
import VideoPlayerModal from "@/components/VideoPlayerModal";

export interface PreviewExercise {
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

export interface PreviewWorkout {
  id: string;
  name: string;
  order_index: number;
  exercises: PreviewExercise[];
}

export interface PreviewProgram {
  id: string;
  name: string;
  aerobic_info: string | null;
  workouts: PreviewWorkout[];
}

interface ProgramPreviewProps {
  program: PreviewProgram;
  onStartWorkout: (workoutId: string) => void;
}

export default function ProgramPreview({ program, onStartWorkout }: ProgramPreviewProps) {
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(
    program.workouts[0]?.id ?? null
  );
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>("");
  const [showTechniqueHelp, setShowTechniqueHelp] = useState<string | null>(null);
  const techniqueHelpRef = useRef<HTMLDivElement>(null);

  const openVideo = (url: string | null, exerciseName?: string) => {
    if (!url) return;
    setSelectedVideoUrl(url);
    setSelectedExerciseName(exerciseName || "");
    setVideoModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Meus Treinos</h1>
        <p className="text-muted-foreground">{program.name}</p>
      </div>

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

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <h3 className="font-semibold text-primary mb-1">
                  Controle abdominal: fazer todos os dias em jejum
                </h3>
                <p className="text-sm text-muted-foreground">
                  O controle abdominal fortalece o abdômen e facilita a definição
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">1. Vácuo abdominal</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      openVideo("https://vimeo.com/913771959?fl=pl&fe=sh", "Vácuo abdominal")
                    }
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Ver vídeo
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground pl-4">
                  Realizar 10 séries de 10-15 segundos cada vácuo
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">2. Prancha abdominal</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => openVideo("https://vimeo.com/909742876", "Prancha abdominal")}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Ver vídeo
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground pl-4">
                  Realizar 3 séries de 30-60 segundos - o quanto aguentar
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {program.workouts.map((workout) => (
          <Card key={workout.id} className="overflow-hidden">
            <button
              className="w-full p-4 flex items-center justify-between bg-secondary/50 hover:bg-secondary/70 transition-colors"
              onClick={() =>
                setExpandedWorkout(expandedWorkout === workout.id ? null : workout.id)
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
                    onStartWorkout(workout.id);
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
                        <th className="w-24 relative">
                          <span className="inline-flex items-center gap-1">
                            Técnica
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowTechniqueHelp(
                                  showTechniqueHelp === workout.id ? null : workout.id
                                );
                              }}
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                            </button>
                          </span>
                          {showTechniqueHelp === workout.id && (
                            <div
                              ref={techniqueHelpRef}
                              className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 w-64 rounded-md border bg-popover p-3 text-popover-foreground shadow-md text-xs font-normal text-left"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <p>
                                  Acesse o <strong>Guia de treino</strong> (barra lateral) e
                                  compreenda como aplicar a técnica indicada por RIR.
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowTechniqueHelp(null);
                                  }}
                                  className="text-muted-foreground hover:text-foreground shrink-0"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </th>
                        <th className="w-24">Descanso (s)</th>
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
