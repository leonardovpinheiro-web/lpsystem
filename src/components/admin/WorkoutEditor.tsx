import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import ExerciseTable, { ExerciseTableRef } from "./ExerciseTable";

interface Workout {
  id: string;
  name: string;
  order_index: number;
  program_id: string;
}

interface WorkoutEditorProps {
  programId: string;
  onBack: () => void;
}

export default function WorkoutEditor({ programId, onBack }: WorkoutEditorProps) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewWorkout, setShowNewWorkout] = useState(false);
  const [newWorkoutName, setNewWorkoutName] = useState("");
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  const [programName, setProgramName] = useState("");
  const { toast } = useToast();
  
  // Store refs to ExerciseTable components for flushing
  const exerciseTableRefs = useRef<Map<string, ExerciseTableRef>>(new Map());

  useEffect(() => {
    fetchWorkouts();
    fetchProgram();
  }, [programId]);

  const fetchProgram = async () => {
    const { data, error } = await supabase
      .from("training_programs")
      .select("name")
      .eq("id", programId)
      .single();

    if (data) {
      setProgramName(data.name);
    }
  };

  const fetchWorkouts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .eq("program_id", programId)
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Error fetching workouts:", error);
    } else {
      setWorkouts(data);
      // Expand first workout by default
      if (data.length > 0 && !expandedWorkout) {
        setExpandedWorkout(data[0].id);
      }
    }
    setLoading(false);
  };

  const handleCreateWorkout = async () => {
    if (!newWorkoutName.trim()) return;

    const maxOrder = workouts.length > 0 
      ? Math.max(...workouts.map(w => w.order_index)) 
      : -1;

    const { data, error } = await supabase
      .from("workouts")
      .insert({
        program_id: programId,
        name: newWorkoutName.trim(),
        order_index: maxOrder + 1,
      })
      .select()
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao criar treino",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Treino criado com sucesso",
      });
      setShowNewWorkout(false);
      setNewWorkoutName("");
      fetchWorkouts();
      setExpandedWorkout(data.id);
    }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    if (!confirm("Tem certeza que deseja excluir este treino?")) return;

    const { error } = await supabase
      .from("workouts")
      .delete()
      .eq("id", workoutId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao excluir treino",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Treino excluído",
      });
      fetchWorkouts();
    }
  };

  // Save workout name to database
  const saveWorkoutName = useCallback(async (workoutId: string, newName: string) => {
    const { error } = await supabase
      .from("workouts")
      .update({ name: newName })
      .eq("id", workoutId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao renomear treino",
      });
    }
  }, [toast]);

  // Debounced save for workout name
  const { debouncedCallback: debouncedSaveWorkoutName, flush: flushWorkoutName } = useDebouncedCallback(saveWorkoutName, 500);

  // Update local state and trigger debounced save
  const handleRenameWorkout = (workoutId: string, newName: string) => {
    // Update local state immediately
    setWorkouts(prev => prev.map(w => 
      w.id === workoutId ? { ...w, name: newName } : w
    ));
    // Trigger debounced save
    debouncedSaveWorkoutName(workoutId, newName);
  };

  // Handle expanding/collapsing workouts - flush pending saves first
  const handleToggleWorkout = async (workoutId: string) => {
    // If we're collapsing the current workout, flush its pending saves
    if (expandedWorkout === workoutId) {
      const tableRef = exerciseTableRefs.current.get(workoutId);
      if (tableRef) {
        await tableRef.flushPendingSaves();
      }
      flushWorkoutName();
      setExpandedWorkout(null);
    } else {
      // If we're switching to a different workout, flush the previous one first
      if (expandedWorkout) {
        const prevTableRef = exerciseTableRefs.current.get(expandedWorkout);
        if (prevTableRef) {
          await prevTableRef.flushPendingSaves();
        }
        flushWorkoutName();
      }
      setExpandedWorkout(workoutId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{programName}</h1>
          <p className="text-muted-foreground">Edite os treinos do programa</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowNewWorkout(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Treino
        </Button>
      </div>

      <div className="space-y-4">
        {workouts.map((workout) => (
          <Card key={workout.id} className="overflow-hidden">
            <CardHeader
              className="cursor-pointer bg-secondary/50 py-3"
              onClick={() => handleToggleWorkout(workout.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <Input
                    value={workout.name}
                    onChange={(e) => handleRenameWorkout(workout.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="font-semibold bg-transparent border-0 focus:ring-1 w-auto"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWorkout(workout.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                  {expandedWorkout === workout.id ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
            {expandedWorkout === workout.id && (
              <CardContent className="p-0">
                <ExerciseTable 
                  workoutId={workout.id} 
                  ref={(ref) => {
                    if (ref) {
                      exerciseTableRefs.current.set(workout.id, ref);
                    } else {
                      exerciseTableRefs.current.delete(workout.id);
                    }
                  }}
                />
              </CardContent>
            )}
          </Card>
        ))}

        {workouts.length === 0 && !loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">
                Nenhum treino criado ainda
              </p>
              <Button onClick={() => setShowNewWorkout(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Treino
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showNewWorkout} onOpenChange={setShowNewWorkout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Treino</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Ex: Treino A - Pernas"
              value={newWorkoutName}
              onChange={(e) => setNewWorkoutName(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewWorkout(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateWorkout}>Criar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
