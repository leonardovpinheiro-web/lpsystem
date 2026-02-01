import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, ArrowUp, ArrowDown } from "lucide-react";

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
}

interface ExerciseTableProps {
  workoutId: string;
}

export default function ExerciseTable({ workoutId }: ExerciseTableProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
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

    const { error } = await supabase
      .from("exercises")
      .insert({
        workout_id: workoutId,
        order_index: maxOrder + 1,
        name: "Novo Exercício",
        sets: "3",
        reps: "8-12",
      });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao adicionar exercício",
      });
    } else {
      fetchExercises();
    }
  };

  const handleUpdateExercise = async (
    exerciseId: string,
    field: keyof Exercise,
    value: string
  ) => {
    const { error } = await supabase
      .from("exercises")
      .update({ [field]: value })
      .eq("id", exerciseId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar exercício",
      });
    }
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
      fetchExercises();
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

    // Swap order_index values
    await Promise.all([
      supabase
        .from("exercises")
        .update({ order_index: otherExercise.order_index })
        .eq("id", currentExercise.id),
      supabase
        .from("exercises")
        .update({ order_index: currentExercise.order_index })
        .eq("id", otherExercise.id),
    ]);

    fetchExercises();
  };

  const updateLocalExercise = (exerciseId: string, field: keyof Exercise, value: string) => {
    setExercises(exercises.map(ex => 
      ex.id === exerciseId ? { ...ex, [field]: value } : ex
    ));
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
      <table className="excel-table min-w-full">
        <thead>
          <tr>
            <th className="w-12">#</th>
            <th className="min-w-[200px]">Exercício</th>
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
                <Input
                  value={exercise.name}
                  onChange={(e) => updateLocalExercise(exercise.id, "name", e.target.value)}
                  onBlur={(e) => handleUpdateExercise(exercise.id, "name", e.target.value)}
                  className="excel-input"
                />
              </td>
              <td>
                <Input
                  value={exercise.sets}
                  onChange={(e) => updateLocalExercise(exercise.id, "sets", e.target.value)}
                  onBlur={(e) => handleUpdateExercise(exercise.id, "sets", e.target.value)}
                  className="excel-input text-center"
                />
              </td>
              <td>
                <Input
                  value={exercise.reps}
                  onChange={(e) => updateLocalExercise(exercise.id, "reps", e.target.value)}
                  onBlur={(e) => handleUpdateExercise(exercise.id, "reps", e.target.value)}
                  className="excel-input text-center"
                />
              </td>
              <td>
                <Input
                  value={exercise.technique || ""}
                  onChange={(e) => updateLocalExercise(exercise.id, "technique", e.target.value)}
                  onBlur={(e) => handleUpdateExercise(exercise.id, "technique", e.target.value)}
                  className="excel-input text-center"
                  placeholder="-"
                />
              </td>
              <td>
                <Input
                  value={exercise.rest_seconds || ""}
                  onChange={(e) => updateLocalExercise(exercise.id, "rest_seconds", e.target.value)}
                  onBlur={(e) => handleUpdateExercise(exercise.id, "rest_seconds", e.target.value)}
                  className="excel-input text-center"
                  placeholder="-"
                />
              </td>
              <td>
                <Input
                  value={exercise.notes || ""}
                  onChange={(e) => updateLocalExercise(exercise.id, "notes", e.target.value)}
                  onBlur={(e) => handleUpdateExercise(exercise.id, "notes", e.target.value)}
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
    </div>
  );
}
