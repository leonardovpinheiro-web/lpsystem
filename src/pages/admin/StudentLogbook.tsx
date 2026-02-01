import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardList } from "lucide-react";
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
  const [weeks, setWeeks] = useState<LogbookWeek[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId) {
      fetchStudentData();
    }
  }, [studentId]);

  useEffect(() => {
    if (selectedWorkout) {
      fetchLogbookWeeks();
    }
  }, [selectedWorkout]);

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
        <div className="space-y-6">
          {weeks.map((week) => (
            <Card key={week.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Semana {week.week_number}</CardTitle>
              </CardHeader>
              <CardContent>
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
                      {week.entries.map((entry, index) => (
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
                            <React.Fragment key={`${entry.id}-set${setNum}`}>
                              <td className="p-2 text-center">
                                {entry[`set${setNum}_weight` as keyof LogbookEntry] ?? "-"}
                              </td>
                              <td className="p-2 text-center">
                                {entry[`set${setNum}_reps` as keyof LogbookEntry] ?? "-"}
                              </td>
                            </React.Fragment>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
