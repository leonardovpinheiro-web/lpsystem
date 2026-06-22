import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ArrowLeft, ChevronDown, ChevronUp, Play, Check } from "lucide-react";
import VideoPlayerModal from "@/components/VideoPlayerModal";
import type { PreviewExercise, PreviewWorkout } from "./ProgramPreview";

interface ActiveWorkoutPreviewProps {
  workout: PreviewWorkout;
  onBack: () => void;
}

export default function ActiveWorkoutPreview({ workout, onBack }: ActiveWorkoutPreviewProps) {
  const [expandedExercise, setExpandedExercise] = useState<string | null>(
    workout.exercises[0]?.id ?? null
  );
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>("");

  const exercises: PreviewExercise[] = workout.exercises;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{workout.name}</h1>
          <p className="text-muted-foreground">
            Semana 1 • Registre suas séries
          </p>
        </div>
      </div>

      <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
        Pré-visualização — os campos estão desabilitados e nada é salvo.
      </div>

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
                    <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Última semana:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: numSets }, (_, i) => i + 1).map((setNum) => (
                          <div key={setNum} className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-primary">S{setNum}:</span>
                            <span className="text-muted-foreground">— kg × —</span>
                          </div>
                        ))}
                      </div>
                    </div>

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
                                placeholder="Kg"
                                className="h-10 text-center"
                                disabled
                              />
                            </div>
                            <div className="flex-1">
                              <Input
                                type="number"
                                placeholder="Reps"
                                className="h-10 text-center"
                                disabled
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {exercise.notes && (
                      <div className="mt-3 p-2 bg-muted/30 rounded text-sm text-muted-foreground">
                        <span className="font-medium">Obs:</span> {exercise.notes}
                      </div>
                    )}

                    {exercise.rest_seconds && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Descanso (s): {exercise.rest_seconds}
                      </p>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Comentários sobre o treino (opcional)
        </label>
        <Textarea
          placeholder="Como foi o treino? Alguma observação importante?"
          className="min-h-[80px]"
          disabled
        />
      </div>

      <div className="pt-2">
        <Button className="w-full h-12 text-lg" disabled>
          <Check className="w-5 h-5 mr-2" />
          Finalizar Treino
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Pré-visualização — alterações não são salvas
        </p>
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
