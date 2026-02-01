import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Dumbbell, ClipboardList, BookOpen } from "lucide-react";

interface Stats {
  totalStudents: number;
  activeStudents: number;
  totalPrograms: number;
  totalSessions: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    activeStudents: 0,
    totalPrograms: 0,
    totalSessions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [studentsRes, activeRes, programsRes, sessionsRes] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }),
      supabase.from("students").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("training_programs").select("id", { count: "exact", head: true }),
      supabase.from("training_sessions").select("id", { count: "exact", head: true }),
    ]);

    setStats({
      totalStudents: studentsRes.count || 0,
      activeStudents: activeRes.count || 0,
      totalPrograms: programsRes.count || 0,
      totalSessions: sessionsRes.count || 0,
    });
    setLoading(false);
  };

  const statCards = [
    {
      title: "Total de Alunos",
      value: stats.totalStudents,
      icon: Users,
      description: `${stats.activeStudents} ativos`,
    },
    {
      title: "Programas de Treino",
      value: stats.totalPrograms,
      icon: Dumbbell,
      description: "criados",
    },
    {
      title: "Treinos Registrados",
      value: stats.totalSessions,
      icon: ClipboardList,
      description: "no logbook",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do seu sistema de treinos
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {loading ? "-" : stat.value}
                </div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/students"
              className="block p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <span className="font-medium">Gerenciar Alunos</span>
              </div>
            </a>
            <a
              href="/workouts"
              className="block p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Dumbbell className="w-5 h-5 text-primary" />
                <span className="font-medium">Criar Treinos</span>
              </div>
            </a>
            <a
              href="/guides"
              className="block p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-primary" />
                <span className="font-medium">Editar Guias</span>
              </div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sobre o Sistema</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Este sistema permite criar e gerenciar treinos de musculação para
              seus alunos de forma simples e organizada.
            </p>
            <p>
              Use a interface de tabela estilo Excel para criar treinos
              rapidamente, e seus alunos poderão visualizar e registrar seus
              treinos pelo celular.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
