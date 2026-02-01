import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Check } from "lucide-react";

interface Exercise {
  id: string;
  order_index: number;
  name: string;
  sets: string;
  reps: string;
  technique: string | null;
  notes: string | null;
}

interface LogEntry {
  exerciseId: string;
  setNumber: number;
  weight: string;
  repsDone: string;
  notes: string;
}

export default function NewSession() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [workoutName, setWorkoutName] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [logEntries, setLogEntries] = useState<{ [key: string]: LogEntry[] }>({});
  const [sessionNotes, setSessionNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workoutId) {
      fetchWorkout();
    }
  }, [workoutId]);

  const fetchWorkout = async () => {
    const { data, error } = await supabase
      .from("workouts")
      .select(`
        name,
        exercises (
          id,
          order_index,
          name,
          sets,
          reps,
          technique,
          notes
        )
      `)
      .eq("id", workoutId)
      .single();

    if (error) {
      console.error("Error fetching workout:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar treino",
      });
      navigate("/");
      return;
    }

    setWorkoutName(data.name);
    const sortedExercises = (data.exercises as Exercise[]).sort(
      (a, b) => a.order_index - b.order_index
    );
    setExercises(sortedExercises);

    // Initialize log entries based on sets
    const initialEntries: { [key: string]: LogEntry[] } = {};
    sortedExercises.forEach((exercise) => {
      const numSets = parseInt(exercise.sets) || 3;
      initialEntries[exercise.id] = Array.from({ length: numSets }, (_, i) => ({
        exerciseId: exercise.id,
        setNumber: i + 1,
        weight: "",
        repsDone: "",
        notes: "",
      }));
    });
    setLogEntries(initialEntries);

    setLoading(false);
  };

  const updateEntry = (
    exerciseId: string,
    setIndex: number,
    field: "weight" | "repsDone" | "notes",
    value: string
  ) => {
    setLogEntries((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((entry, i) =>
        i === setIndex ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Get student id
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (studentError || !studentData) {
        throw new Error("Erro ao encontrar perfil de aluno");
      }

      // Create session
      const { data: sessionData, error: sessionError } = await supabase
        .from("training_sessions")
        .insert({
          student_id: studentData.id,
          workout_id: workoutId,
          notes: sessionNotes || null,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError) {
        throw sessionError;
      }

      // Create logbook entries
      const entries = Object.values(logEntries)
        .flat()
        .filter((entry) => entry.weight || entry.repsDone)
        .map((entry) => ({
          session_id: sessionData.id,
          exercise_id: entry.exerciseId,
          set_number: entry.setNumber,
          weight: entry.weight ? parseFloat(entry.weight) : null,
          reps_done: entry.repsDone ? parseInt(entry.repsDone) : null,
          notes: entry.notes || null,
        }));

      if (entries.length > 0) {
        const { error: entriesError } = await supabase
          .from("logbook_entries")
          .insert(entries);

        if (entriesError) {
          throw entriesError;
        }
      }

      toast({
        title: "Treino salvo!",
        description: "Seu treino foi registrado com sucesso.",
      });

      navigate("/logbook");
    } catch (error) {
      console.error("Error saving session:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao salvar treino",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Carregando...</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{workoutName}</h1>
          <p className="text-muted-foreground">Registre suas cargas e repetições</p>
        </div>
      </div>

      <div className="space-y-4">
        {exercises.map((exercise, exerciseIndex) => (
          <Card key={exercise.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center text-sm font-medium text-primary">
                  {exerciseIndex + 1}
                </span>
                <CardTitle className="text-lg">{exercise.name}</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                {exercise.sets} séries × {exercise.reps} reps
                {exercise.technique && ` • ${exercise.technique}`}
              </p>
              {exercise.notes && (
                <p className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  {exercise.notes}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground">
                  <div>Série</div>
                  <div>Peso (kg)</div>
                  <div>Reps</div>
                  <div>Obs</div>
                </div>
                {logEntries[exercise.id]?.map((entry, setIndex) => (
                  <div key={setIndex} className="grid grid-cols-4 gap-2">
                    <div className="flex items-center justify-center text-sm font-medium">
                      {entry.setNumber}
                    </div>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="0"
                      value={entry.weight}
                      onChange={(e) =>
                        updateEntry(exercise.id, setIndex, "weight", e.target.value)
                      }
                      className="h-9 text-center"
                    />
                    <Input
                      type="number"
                      placeholder="0"
                      value={entry.repsDone}
                      onChange={(e) =>
                        updateEntry(exercise.id, setIndex, "repsDone", e.target.value)
                      }
                      className="h-9 text-center"
                    />
                    <Input
                      placeholder="-"
                      value={entry.notes}
                      onChange={(e) =>
                        updateEntry(exercise.id, setIndex, "notes", e.target.value)
                      }
                      className="h-9"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Observações do treino</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Como foi o treino? Alguma observação importante?"
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t lg:left-64">
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            "Salvando..."
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Finalizar Treino
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
