import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Play, Loader2, GripVertical } from "lucide-react";
import ExerciseAutocomplete from "./ExerciseAutocomplete";
import VideoPlayerModal from "@/components/VideoPlayerModal";

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

interface PendingSave {
  exerciseId: string;
  field: keyof Exercise;
  value: string | null;
}

export interface ExerciseTableRef {
  flushPendingSaves: () => Promise<void>;
}

interface ExerciseTableProps {
  workoutId: string;
}

const ExerciseTable = forwardRef<ExerciseTableRef, ExerciseTableProps>(({ workoutId }, ref) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>("");
  const [draggedExerciseId, setDraggedExerciseId] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Track pending saves with their timeouts
  const pendingSavesRef = useRef<Map<string, { timeout: NodeJS.Timeout; save: PendingSave }>>(new Map());
  const isMountedRef = useRef(true);

  // Expose flush method to parent
  useImperativeHandle(ref, () => ({
    flushPendingSaves: async () => {
      await flushAllPendingSaves();
    }
  }));

  // Flush all pending saves
  const flushAllPendingSaves = useCallback(async () => {
    const pendingSaves = Array.from(pendingSavesRef.current.values());
    
    // Clear all timeouts
    pendingSavesRef.current.forEach(({ timeout }) => clearTimeout(timeout));
    pendingSavesRef.current.clear();
    
    if (pendingSaves.length === 0) return;

    // Execute all pending saves in parallel
    const savePromises = pendingSaves.map(async ({ save }) => {
      const fieldKey = `${save.exerciseId}-${save.field}`;
      setSavingFields(prev => new Set(prev).add(fieldKey));
      
      const { error } = await supabase
        .from("exercises")
        .update({ [save.field]: save.value })
        .eq("id", save.exerciseId);
      
      if (isMountedRef.current) {
        setSavingFields(prev => {
          const newSet = new Set(prev);
          newSet.delete(fieldKey);
          return newSet;
        });
      }

      if (error) {
        console.error("Error saving exercise field:", error);
      }
      
      return { error, save };
    });

    const results = await Promise.all(savePromises);
    const errors = results.filter(r => r.error);
    
    if (errors.length > 0 && isMountedRef.current) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: `Não foi possível salvar ${errors.length} alteração(ões)`,
      });
    }
  }, [toast]);

  // Cleanup on unmount - flush pending saves
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      // Flush all pending saves synchronously on unmount
      const pendingSaves = Array.from(pendingSavesRef.current.values());
      pendingSavesRef.current.forEach(({ timeout }) => clearTimeout(timeout));
      pendingSavesRef.current.clear();
      
      // Fire and forget - we can't await in cleanup
      pendingSaves.forEach(({ save }) => {
        supabase
          .from("exercises")
          .update({ [save.field]: save.value })
          .eq("id", save.exerciseId)
          .then(({ error }) => {
            if (error) console.error("Error saving on unmount:", error);
          });
      });
    };
  }, []);

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
    // Flush pending saves before adding new exercise
    await flushAllPendingSaves();
    
    const maxOrder = exercises.length > 0 
      ? Math.max(...exercises.map(e => e.order_index)) 
      : -1;

    const { data, error } = await supabase
      .from("exercises")
      .insert({
        workout_id: workoutId,
        order_index: maxOrder + 1,
        name: "",
        sets: "",
        reps: "",
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

    if (isMountedRef.current) {
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
    }
  }, [toast]);

  // Debounced save with proper pending tracking
  const debouncedSave = useCallback((
    exerciseId: string,
    field: keyof Exercise,
    value: string | null
  ) => {
    const fieldKey = `${exerciseId}-${field}`;
    
    // Clear existing timeout for this field
    const existing = pendingSavesRef.current.get(fieldKey);
    if (existing) {
      clearTimeout(existing.timeout);
    }
    
    // Set new timeout
    const timeout = setTimeout(() => {
      pendingSavesRef.current.delete(fieldKey);
      saveExerciseField(exerciseId, field, value);
    }, 500);
    
    pendingSavesRef.current.set(fieldKey, {
      timeout,
      save: { exerciseId, field, value }
    });
  }, [saveExerciseField]);

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

  // Drag and drop handlers
  const handleDragStart = (exerciseId: string) => {
    setDraggedExerciseId(exerciseId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetExerciseId: string) => {
    if (!draggedExerciseId || draggedExerciseId === targetExerciseId) {
      setDraggedExerciseId(null);
      return;
    }

    const draggedIndex = exercises.findIndex(e => e.id === draggedExerciseId);
    const targetIndex = exercises.findIndex(e => e.id === targetExerciseId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedExerciseId(null);
      return;
    }

    // Create new array with reordered exercises
    const newExercises = [...exercises];
    const [draggedExercise] = newExercises.splice(draggedIndex, 1);
    newExercises.splice(targetIndex, 0, draggedExercise);

    // Assign new order_index values
    const updatedExercises = newExercises.map((exercise, index) => ({
      ...exercise,
      order_index: index,
    }));

    // Update local state immediately
    setExercises(updatedExercises);
    setDraggedExerciseId(null);

    // Save all changes to database in parallel
    const updatePromises = updatedExercises.map((exercise) =>
      supabase
        .from("exercises")
        .update({ order_index: exercise.order_index })
        .eq("id", exercise.id)
    );

    const results = await Promise.all(updatePromises);
    const hasError = results.some((r) => r.error);

    if (hasError) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao reordenar exercícios",
      });
      // Revert on error
      fetchExercises();
    }
  };

  const handleDragEnd = () => {
    setDraggedExerciseId(null);
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

  const openVideo = (url: string | null, exerciseName?: string) => {
    if (!url) return;
    setSelectedVideoUrl(url);
    setSelectedExerciseName(exerciseName || "");
    setVideoModalOpen(true);
  };

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
            <th className="w-8"></th>
            <th className="w-12">#</th>
            <th className="min-w-[200px]">Exercício</th>
            <th className="w-16">Vídeo</th>
            <th className="w-20">Séries</th>
            <th className="w-24">Reps</th>
            <th className="w-24">Técnica</th>
            <th className="w-24">Descanso (s)</th>
            <th className="min-w-[150px]">Observações</th>
            <th className="w-16">Ações</th>
          </tr>
        </thead>
        <tbody>
          {exercises.map((exercise, index) => (
            <tr
              key={exercise.id}
              draggable
              onDragStart={() => handleDragStart(exercise.id)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(exercise.id)}
              onDragEnd={handleDragEnd}
              className={draggedExerciseId === exercise.id ? "opacity-50" : ""}
            >
              <td className="cursor-grab active:cursor-grabbing">
                <GripVertical className="w-4 h-4 text-muted-foreground mx-auto" />
              </td>
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
                    onClick={() => openVideo(exercise.video_url, exercise.name)}
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
                <div className="flex items-center justify-center">
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

      <VideoPlayerModal
        open={videoModalOpen}
        onOpenChange={setVideoModalOpen}
        videoUrl={selectedVideoUrl}
        title={selectedExerciseName}
      />
    </div>
  );
});

ExerciseTable.displayName = "ExerciseTable";

export default ExerciseTable;
