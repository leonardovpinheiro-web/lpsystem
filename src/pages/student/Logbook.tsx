import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardList, ChevronDown, ChevronUp, Calendar } from "lucide-react";

interface LogbookEntry {
  id: string;
  set_number: number;
  weight: number | null;
  reps_done: number | null;
  notes: string | null;
  exercise: {
    name: string;
  };
}

interface Session {
  id: string;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  workout: {
    name: string;
  };
  logbook_entries: LogbookEntry[];
}

export default function Logbook() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
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

    const { data, error } = await supabase
      .from("training_sessions")
      .select(`
        id,
        started_at,
        completed_at,
        notes,
        workout:workouts(name),
        logbook_entries(
          id,
          set_number,
          weight,
          reps_done,
          notes,
          exercise:exercises(name)
        )
      `)
      .eq("student_id", studentData.id)
      .order("started_at", { ascending: false });

    if (error) {
      console.error("Error fetching sessions:", error);
    } else {
      setSessions(data as Session[]);
      if (data.length > 0) {
        setExpandedSession(data[0].id);
      }
    }

    setLoading(false);
  };

  // Group entries by exercise
  const groupEntriesByExercise = (entries: LogbookEntry[]) => {
    const grouped: { [key: string]: LogbookEntry[] } = {};
    entries.forEach((entry) => {
      const name = entry.exercise?.name || "Unknown";
      if (!grouped[name]) {
        grouped[name] = [];
      }
      grouped[name].push(entry);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Logbook</h1>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Logbook</h1>
        <p className="text-muted-foreground">
          Histórico de treinos realizados
        </p>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhum treino registrado
            </h3>
            <p className="text-muted-foreground">
              Inicie um treino para começar a registrar seu progresso.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card key={session.id} className="overflow-hidden">
              <button
                className="w-full p-4 flex items-center justify-between bg-secondary/50 hover:bg-secondary/70 transition-colors"
                onClick={() =>
                  setExpandedSession(
                    expandedSession === session.id ? null : session.id
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">{session.workout?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(session.started_at), "EEEE, d 'de' MMMM", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
                {expandedSession === session.id ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>

              {expandedSession === session.id && (
                <CardContent className="p-4">
                  {Object.entries(groupEntriesByExercise(session.logbook_entries)).map(
                    ([exerciseName, entries]) => (
                      <div key={exerciseName} className="mb-4 last:mb-0">
                        <h4 className="font-medium mb-2">{exerciseName}</h4>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="font-medium text-muted-foreground">
                            Série
                          </div>
                          <div className="font-medium text-muted-foreground">
                            Peso
                          </div>
                          <div className="font-medium text-muted-foreground">
                            Reps
                          </div>
                          {entries
                            .sort((a, b) => a.set_number - b.set_number)
                            .map((entry) => (
                              <>
                                <div key={`${entry.id}-set`}>{entry.set_number}</div>
                                <div key={`${entry.id}-weight`}>
                                  {entry.weight ? `${entry.weight}kg` : "-"}
                                </div>
                                <div key={`${entry.id}-reps`}>
                                  {entry.reps_done || "-"}
                                </div>
                              </>
                            ))}
                        </div>
                      </div>
                    )
                  )}
                  {session.notes && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        {session.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
