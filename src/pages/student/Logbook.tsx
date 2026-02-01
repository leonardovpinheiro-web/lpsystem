import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Plus, Dumbbell } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Workout {
  id: string;
  name: string;
  program: {
    name: string;
  };
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
  set1_weight: number | null;
  set1_reps: number | null;
  set2_weight: number | null;
  set2_reps: number | null;
  set3_weight: number | null;
  set3_reps: number | null;
  set4_weight: number | null;
  set4_reps: number | null;
}

export default function Logbook() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<string>("");
  const [weeks, setWeeks] = useState<LogbookWeek[]>([]);
  const [activeWeek, setActiveWeek] = useState<string>("1");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchWorkouts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedWorkout) {
      fetchLogbookWeeks();
    }
  }, [selectedWorkout]);

  const fetchWorkouts = async () => {
    const { data: studentData } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user?.id)
      .single();

    if (!studentData) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("training_programs")
      .select(`
        id,
        name,
        workouts (
          id,
          name
        )
      `)
      .eq("student_id", studentData.id)
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching workouts:", error);
      setLoading(false);
      return;
    }

    const allWorkouts: Workout[] = [];
    data?.forEach((program) => {
      program.workouts?.forEach((workout: { id: string; name: string }) => {
        allWorkouts.push({
          id: workout.id,
          name: workout.name,
          program: { name: program.name },
        });
      });
    });

    setWorkouts(allWorkouts);
    if (allWorkouts.length > 0 && !selectedWorkout) {
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

    const formattedWeeks = (data || []).map((week) => ({
      ...week,
      workout: week.workout as { name: string },
      entries: ((week.entries as LogbookEntry[]) || []).sort(
        (a, b) => a.exercise_order - b.exercise_order
      ),
    }));

    setWeeks(formattedWeeks);
    if (formattedWeeks.length > 0) {
      setActiveWeek(formattedWeeks[formattedWeeks.length - 1].week_number.toString());
    }
  };

  const createNewWeek = async () => {
    setCreating(true);

    try {
      // Get student id
      const { data: studentData } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!studentData) throw new Error("Student not found");

      // Get workout and its exercises
      const { data: workoutData } = await supabase
        .from("workouts")
        .select(`
          id,
          program_id,
          exercises (
            id,
            name,
            order_index
          )
        `)
        .eq("id", selectedWorkout)
        .single();

      if (!workoutData) throw new Error("Workout not found");

      // Calculate next week number
      const nextWeekNumber = weeks.length > 0 
        ? Math.max(...weeks.map((w) => w.week_number)) + 1 
        : 1;

      // Create the week
      const { data: newWeek, error: weekError } = await supabase
        .from("logbook_weeks")
        .insert({
          student_id: studentData.id,
          program_id: workoutData.program_id,
          workout_id: selectedWorkout,
          week_number: nextWeekNumber,
        })
        .select()
        .single();

      if (weekError) throw weekError;

      // Create entries for each exercise
      const exercises = workoutData.exercises as { id: string; name: string; order_index: number }[];
      const entries = exercises.map((exercise) => ({
        week_id: newWeek.id,
        exercise_name: exercise.name,
        exercise_order: exercise.order_index,
        original_exercise_id: exercise.id,
      }));

      const { error: entriesError } = await supabase
        .from("logbook_week_entries")
        .insert(entries);

      if (entriesError) throw entriesError;

      toast({
        title: "Semana criada!",
        description: `Semana ${nextWeekNumber} adicionada ao logbook.`,
      });

      fetchLogbookWeeks();
      setActiveWeek(nextWeekNumber.toString());
    } catch (error) {
      console.error("Error creating week:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao criar nova semana",
      });
    } finally {
      setCreating(false);
    }
  };

  const updateEntry = useCallback(
    async (
      entryId: string,
      field: string,
      value: string
    ) => {
      const numValue = value === "" ? null : parseFloat(value);

      const { error } = await supabase
        .from("logbook_week_entries")
        .update({ [field]: numValue })
        .eq("id", entryId);

      if (error) {
        console.error("Error updating entry:", error);
        toast({
          variant: "destructive",
          title: "Erro ao salvar",
          description: "Não foi possível salvar a alteração.",
        });
      }
    },
    [toast]
  );

  const handleInputChange = (
    entryId: string,
    field: string,
    value: string,
    weekNumber: number
  ) => {
    // Update local state immediately for responsive UI
    setWeeks((prev) =>
      prev.map((week) =>
        week.week_number === weekNumber
          ? {
              ...week,
              entries: week.entries.map((entry) =>
                entry.id === entryId
                  ? { ...entry, [field]: value === "" ? null : parseFloat(value) }
                  : entry
              ),
            }
          : week
      )
    );
  };

  const handleInputBlur = (entryId: string, field: string, value: string) => {
    updateEntry(entryId, field, value);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Logbook</h1>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-8 bg-muted rounded w-1/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Logbook</h1>
          <p className="text-muted-foreground">Registro de treinos</p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <Dumbbell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhum treino disponível
            </h3>
            <p className="text-muted-foreground">
              Aguarde seu treinador criar um programa de treinos para você.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentWeek = weeks.find((w) => w.week_number.toString() === activeWeek);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Logbook</h1>
          <p className="text-muted-foreground">Registro de cargas e repetições</p>
        </div>
        <div className="flex items-center gap-3">
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
          <Button onClick={createNewWeek} disabled={creating}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Semana
          </Button>
        </div>
      </div>

      {weeks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhuma semana registrada
            </h3>
            <p className="text-muted-foreground mb-4">
              Clique em "Nova Semana" para iniciar o registro do seu treino.
            </p>
            <Button onClick={createNewWeek} disabled={creating}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Semana
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <Tabs value={activeWeek} onValueChange={setActiveWeek}>
              <TabsList className="flex-wrap h-auto gap-1">
                {weeks.map((week) => (
                  <TabsTrigger
                    key={week.id}
                    value={week.week_number.toString()}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Semana {week.week_number}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {currentWeek && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium text-muted-foreground min-w-[180px]">
                        Exercício
                      </th>
                      <th className="text-center p-2 font-medium text-muted-foreground" colSpan={2}>
                        Série 1
                      </th>
                      <th className="text-center p-2 font-medium text-muted-foreground" colSpan={2}>
                        Série 2
                      </th>
                      <th className="text-center p-2 font-medium text-muted-foreground" colSpan={2}>
                        Série 3
                      </th>
                      <th className="text-center p-2 font-medium text-muted-foreground" colSpan={2}>
                        Série 4
                      </th>
                    </tr>
                    <tr className="border-b bg-muted/30">
                      <th></th>
                      <th className="text-center p-1 text-xs text-muted-foreground font-normal">Kg</th>
                      <th className="text-center p-1 text-xs text-muted-foreground font-normal">Reps</th>
                      <th className="text-center p-1 text-xs text-muted-foreground font-normal">Kg</th>
                      <th className="text-center p-1 text-xs text-muted-foreground font-normal">Reps</th>
                      <th className="text-center p-1 text-xs text-muted-foreground font-normal">Kg</th>
                      <th className="text-center p-1 text-xs text-muted-foreground font-normal">Reps</th>
                      <th className="text-center p-1 text-xs text-muted-foreground font-normal">Kg</th>
                      <th className="text-center p-1 text-xs text-muted-foreground font-normal">Reps</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentWeek.entries.map((entry, index) => (
                      <tr
                        key={entry.id}
                        className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}
                      >
                        <td className="p-2 font-medium">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-5 h-5 bg-primary/10 rounded flex items-center justify-center text-xs font-medium text-primary">
                              {entry.exercise_order + 1}
                            </span>
                            {entry.exercise_name}
                          </span>
                        </td>
                        {[1, 2, 3, 4].map((setNum) => (
                          <>
                            <td key={`${entry.id}-set${setNum}-weight`} className="p-1">
                              <Input
                                type="number"
                                step="0.5"
                                className="h-8 w-16 text-center"
                                value={entry[`set${setNum}_weight` as keyof LogbookEntry] ?? ""}
                                onChange={(e) =>
                                  handleInputChange(
                                    entry.id,
                                    `set${setNum}_weight`,
                                    e.target.value,
                                    currentWeek.week_number
                                  )
                                }
                                onBlur={(e) =>
                                  handleInputBlur(entry.id, `set${setNum}_weight`, e.target.value)
                                }
                              />
                            </td>
                            <td key={`${entry.id}-set${setNum}-reps`} className="p-1">
                              <Input
                                type="number"
                                className="h-8 w-14 text-center"
                                value={entry[`set${setNum}_reps` as keyof LogbookEntry] ?? ""}
                                onChange={(e) =>
                                  handleInputChange(
                                    entry.id,
                                    `set${setNum}_reps`,
                                    e.target.value,
                                    currentWeek.week_number
                                  )
                                }
                                onBlur={(e) =>
                                  handleInputBlur(entry.id, `set${setNum}_reps`, e.target.value)
                                }
                              />
                            </td>
                          </>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
