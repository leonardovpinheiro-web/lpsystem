import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { Plus, Trash2, ArrowUp, ArrowDown, Play, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ExerciseAutocomplete from "./ExerciseAutocomplete";

interface Exercise {
  id: string;
  workout_id: string;
  order_index: number;
  name: string;
  sets: string;
  reps: string;
  technique: string | null;
  rest_seconds: string | null;
  notes: string | null;
  video_url: string | null;
}

const getYouTubeEmbedUrl = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
};

interface ExerciseTableProps {
  workoutId: string;
}

export default function ExerciseTable({ workoutId }: ExerciseTableProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());
  const [videoModal, setVideoModal] = useState<{ open: boolean; url: string; name: string }>({
    open: false,
    url: "",
    name: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchExercises();
  }, [workoutId]);

  const fetchExercises = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .eq("workout_id", workoutId)
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Error fetching exercises:", error);
    } else {
      setExercises(data);
    }
    setLoading(false);
  };

  const handleAddExercise = async () => {
    const maxOrder = exercises.length > 0 
      ? Math.max(...exercises.map(e => e.order_index)) 
      : -1;

    const { data, error } = await supabase
      .from("exercises")
      .insert({
        workout_id: workoutId,
        order_index: maxOrder + 1,
        name: "Novo Exercício",
        sets: "3",
        reps: "8-12",
      })
      .select()
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao adicionar exercício",
      });
    } else if (data) {
      setExercises(prev => [...prev, data]);
    }
  };

  // Save function that actually persists to database
  const saveExerciseField = useCallback(async (
    exerciseId: string,
    field: keyof Exercise,
    value: string | null
  ) => {
    const fieldKey = `${exerciseId}-${field}`;
    setSavingFields(prev => new Set(prev).add(fieldKey));

    const { error } = await supabase
      .from("exercises")
      .update({ [field]: value })
      .eq("id", exerciseId);

    setSavingFields(prev => {
      const newSet = new Set(prev);
      newSet.delete(fieldKey);
      return newSet;
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar a alteração",
      });
    }
  }, [toast]);

  // Debounced save - triggers 500ms after last keystroke
  const debouncedSave = useDebouncedCallback(saveExerciseField, 500);

  // Update local state and trigger debounced save
  const handleFieldChange = (
    exerciseId: string,
    field: keyof Exercise,
    value: string | null
  ) => {
    // Update local state immediately for responsive UI
    setExercises(prev => prev.map(ex => 
      ex.id === exerciseId ? { ...ex, [field]: value } : ex
    ));
    
    // Trigger debounced save
    debouncedSave(exerciseId, field, value);
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    const { error } = await supabase
      .from("exercises")
      .delete()
      .eq("id", exerciseId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao excluir exercício",
      });
    } else {
      // Remove from local state immediately
      setExercises(prev => prev.filter(ex => ex.id !== exerciseId));
    }
  };

  const handleMoveExercise = async (exerciseId: string, direction: "up" | "down") => {
    const currentIndex = exercises.findIndex(e => e.id === exerciseId);
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === exercises.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const otherExercise = exercises[newIndex];
    const currentExercise = exercises[currentIndex];

    // Update local state immediately for responsive UI
    const newExercises = [...exercises];
    const tempOrder = currentExercise.order_index;
    newExercises[currentIndex] = { ...currentExercise, order_index: otherExercise.order_index };
    newExercises[newIndex] = { ...otherExercise, order_index: tempOrder };
    newExercises.sort((a, b) => a.order_index - b.order_index);
    setExercises(newExercises);

    // Save to database immediately
    const [result1, result2] = await Promise.all([
      supabase
        .from("exercises")
        .update({ order_index: otherExercise.order_index })
        .eq("id", currentExercise.id),
      supabase
        .from("exercises")
        .update({ order_index: currentExercise.order_index })
        .eq("id", otherExercise.id),
    ]);

    if (result1.error || result2.error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao reordenar exercício",
      });
      // Revert on error
      fetchExercises();
    }
  };

  const handleExerciseNameChange = (exerciseId: string, name: string, videoUrl: string | null) => {
    setExercises(prev => prev.map(ex => 
      ex.id === exerciseId ? { ...ex, name, video_url: videoUrl } : ex
    ));
  };

  const handleExerciseNameBlur = async (exerciseId: string) => {
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (!exercise) return;

    const { error } = await supabase
      .from("exercises")
      .update({ name: exercise.name, video_url: exercise.video_url })
      .eq("id", exerciseId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar exercício",
      });
    }
  };

  const handleExerciseSelect = async (exerciseId: string, name: string, videoUrl: string | null) => {
    // Update local state immediately
    setExercises(prev => prev.map(ex => 
      ex.id === exerciseId ? { ...ex, name, video_url: videoUrl } : ex
    ));

    // Save to database immediately
    const { error } = await supabase
      .from("exercises")
      .update({ name, video_url: videoUrl })
      .eq("id", exerciseId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao salvar exercício",
      });
      fetchExercises();
    }
  };

  const isSaving = savingFields.size > 0;

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {isSaving && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
          <Loader2 className="w-3 h-3 animate-spin" />
          Salvando...
        </div>
      )}
      <table className="excel-table min-w-full">
        <thead>
          <tr>
            <th className="w-12">#</th>
            <th className="min-w-[200px]">Exercício</th>
            <th className="w-16">Vídeo</th>
            <th className="w-20">Séries</th>
            <th className="w-24">Reps</th>
            <th className="w-24">Técnica</th>
            <th className="w-24">Descanso</th>
            <th className="min-w-[150px]">Observações</th>
            <th className="w-24">Ações</th>
          </tr>
        </thead>
        <tbody>
          {exercises.map((exercise, index) => (
            <tr key={exercise.id}>
              <td className="text-center font-medium text-muted-foreground">
                {index + 1}
              </td>
              <td>
                <ExerciseAutocomplete
                  value={exercise.name}
                  videoUrl={exercise.video_url}
                  onChange={(name, videoUrl) => handleExerciseNameChange(exercise.id, name, videoUrl)}
                  onBlur={() => handleExerciseNameBlur(exercise.id)}
                  onSelect={(name, videoUrl) => handleExerciseSelect(exercise.id, name, videoUrl)}
                  className="excel-input"
                />
              </td>
              <td className="text-center">
                {exercise.video_url ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-primary hover:text-primary/80"
                    onClick={() => setVideoModal({ open: true, url: exercise.video_url!, name: exercise.name })}
                    title="Ver vídeo do exercício"
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td>
                <Input
                  value={exercise.sets}
                  onChange={(e) => handleFieldChange(exercise.id, "sets", e.target.value)}
                  className="excel-input text-center"
                />
              </td>
              <td>
                <Input
                  value={exercise.reps}
                  onChange={(e) => handleFieldChange(exercise.id, "reps", e.target.value)}
                  className="excel-input text-center"
                />
              </td>
              <td>
                <Input
                  value={exercise.technique || ""}
                  onChange={(e) => handleFieldChange(exercise.id, "technique", e.target.value || null)}
                  className="excel-input text-center"
                  placeholder="-"
                />
              </td>
              <td>
                <Input
                  value={exercise.rest_seconds || ""}
                  onChange={(e) => handleFieldChange(exercise.id, "rest_seconds", e.target.value || null)}
                  className="excel-input text-center"
                  placeholder="-"
                />
              </td>
              <td>
                <Input
                  value={exercise.notes || ""}
                  onChange={(e) => handleFieldChange(exercise.id, "notes", e.target.value || null)}
                  className="excel-input"
                  placeholder="-"
                />
              </td>
              <td>
                <div className="flex items-center gap-1 justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleMoveExercise(exercise.id, "up")}
                    disabled={index === 0}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleMoveExercise(exercise.id, "down")}
                    disabled={index === exercises.length - 1}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDeleteExercise(exercise.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="p-4 border-t border-border">
        <Button variant="outline" onClick={handleAddExercise} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Exercício
        </Button>
      </div>

      <Dialog open={videoModal.open} onOpenChange={(open) => setVideoModal({ ...videoModal, open })}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>{videoModal.name}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full">
            {videoModal.url && getYouTubeEmbedUrl(videoModal.url) ? (
              <iframe
                src={getYouTubeEmbedUrl(videoModal.url)!}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-muted rounded-lg">
                <p className="text-muted-foreground">Vídeo não disponível</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
