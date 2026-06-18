import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { lessons } from "@/data/lessons";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Circle, PlayCircle, Unlock, Loader2, ArrowDown, ArrowUp, Filter } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Profile {
  user_id: string;
  email: string | null;
  full_name: string | null;
}

interface ProgressRow {
  user_id: string;
  lesson_id: string;
  max_percent: number;
  started_at: string;
  completed_at: string | null;
}

export default function MetodologiaProgress() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());

  const [sortBy, setSortBy] = useState<"progress-asc" | "progress-desc" | "name-asc" | "name-desc">("progress-asc");
  const [filterStatus, setFilterStatus] = useState<"all" | "not-started" | "in-progress" | "completed" | "unlocked" | "not-unlocked">("all");

  useEffect(() => {
    const load = async () => {
      const [{ data: activeStudents }, { data: ps }, { data: pr }] = await Promise.all([
        supabase.from("students").select("user_id").eq("status", "active"),
        (supabase.from("profiles") as any).select("user_id, email, full_name, onboarding_completed_at").order("created_at", { ascending: false }),
        supabase.from("video_progress").select("user_id, lesson_id, max_percent, started_at, completed_at"),
      ]);
      const activeIds = new Set((activeStudents ?? []).map((s: any) => s.user_id));
      const activeProfiles = (ps ?? []).filter((p: any) => activeIds.has(p.user_id));
      setProfiles(activeProfiles as Profile[]);
      setUnlockedIds(new Set(activeProfiles.filter((p: any) => p.onboarding_completed_at).map((p: any) => p.user_id)));
      setProgress((pr ?? []) as ProgressRow[]);
      setLoading(false);
    };
    load();
  }, []);

  const handleUnlock = async (userId: string) => {
    setUnlockingId(userId);
    try {
      const nowIso = new Date().toISOString();
      const rows = lessons.map((l) => ({
        user_id: userId,
        lesson_id: l.id,
        max_percent: 100,
        completed_at: nowIso,
      }));
      const { error: vpErr } = await supabase
        .from("video_progress")
        .upsert(rows, { onConflict: "user_id,lesson_id" });
      if (vpErr) throw vpErr;

      const { error: profErr } = await supabase
        .from("profiles")
        .update({ onboarding_completed_at: nowIso } as any)
        .eq("user_id", userId);
      if (profErr) throw profErr;

      setProgress((prev) => {
        const others = prev.filter((p) => p.user_id !== userId);
        const newRows = lessons.map((l) => ({
          user_id: userId,
          lesson_id: l.id,
          max_percent: 100,
          started_at: nowIso,
          completed_at: nowIso,
        }));
        return [...others, ...newRows];
      });
      setUnlockedIds((prev) => new Set(prev).add(userId));
      toast({ title: "Acesso liberado", description: "Todas as aulas foram marcadas como assistidas." });
    } catch (e: any) {
      toast({ title: "Erro ao liberar acesso", description: e.message, variant: "destructive" });
    } finally {
      setUnlockingId(null);
    }
  };


  const progressByUser = useMemo(() => {
    const map: Record<string, Record<string, ProgressRow>> = {};
    progress.forEach((p) => {
      if (!map[p.user_id]) map[p.user_id] = {};
      map[p.user_id][p.lesson_id] = p;
    });
    return map;
  }, [progress]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = profiles.filter((p) => p.user_id !== user?.id);
    if (q) {
      list = list.filter(
        (p) =>
          (p.email ?? "").toLowerCase().includes(q) ||
          (p.full_name ?? "").toLowerCase().includes(q)
      );
    }

    if (filterStatus !== "all") {
      list = list.filter((p) => {
        const userProg = progressByUser[p.user_id] ?? {};
        const completed = lessons.filter((l) => (userProg[l.id]?.max_percent ?? 0) >= 90).length;
        const started = lessons.filter((l) => (userProg[l.id]?.max_percent ?? 0) > 0).length;
        switch (filterStatus) {
          case "not-started": return started === 0;
          case "in-progress": return started > 0 && completed < lessons.length;
          case "completed": return completed === lessons.length;
          case "unlocked": return unlockedIds.has(p.user_id);
          case "not-unlocked": return !unlockedIds.has(p.user_id);
          default: return true;
        }
      });
    }

    list.sort((a, b) => {
      const progA = progressByUser[a.user_id] ?? {};
      const progB = progressByUser[b.user_id] ?? {};
      const completedA = lessons.filter((l) => (progA[l.id]?.max_percent ?? 0) >= 90).length;
      const completedB = lessons.filter((l) => (progB[l.id]?.max_percent ?? 0) >= 90).length;
      const pctA = (completedA / lessons.length) * 100;
      const pctB = (completedB / lessons.length) * 100;

      switch (sortBy) {
        case "progress-asc": return pctA - pctB;
        case "progress-desc": return pctB - pctA;
        case "name-asc": return (a.full_name || a.email || "").localeCompare(b.full_name || b.email || "");
        case "name-desc": return (b.full_name || b.email || "").localeCompare(a.full_name || a.email || "");
        default: return 0;
      }
    });

    return list;
  }, [profiles, search, user, filterStatus, sortBy, progressByUser, unlockedIds]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Progresso — Metodologia</h1>
        <p className="text-sm text-muted-foreground">Acompanhe quanto cada aluno assistiu de cada aula.</p>
      </div>

      <div className="rounded-xl bg-card border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold">Alunos</h2>
            <p className="text-sm text-muted-foreground">{filtered.length} aluno(s)</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Input
              placeholder="Buscar por email ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">Todos os status</option>
              <option value="not-started">Não iniciado</option>
              <option value="in-progress">Em andamento</option>
              <option value="completed">Concluído</option>
              <option value="unlocked">Liberado</option>
              <option value="not-unlocked">Não liberado</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="progress-asc">Menor progresso</option>
              <option value="progress-desc">Maior progresso</option>
              <option value="name-asc">Nome (A-Z)</option>
              <option value="name-desc">Nome (Z-A)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                {lessons.map((l, i) => (
                  <TableHead key={l.id} className="min-w-[140px]">
                    <div className="text-xs">Aula {i + 1}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[140px]">{l.title}</div>
                  </TableHead>
                ))}
                <TableHead>Concluídas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={lessons.length + 3} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={lessons.length + 3} className="text-center text-muted-foreground py-8">Nenhum aluno encontrado.</TableCell></TableRow>
              ) : (
                filtered.map((p) => {
                  const userProg = progressByUser[p.user_id] ?? {};
                  const completed = lessons.filter((l) => (userProg[l.id]?.max_percent ?? 0) >= 90).length;
                  return (
                    <TableRow key={p.user_id}>
                      <TableCell>
                        <div className="font-medium">{p.full_name || "(sem nome)"}</div>
                        <div className="text-xs text-muted-foreground">{p.email}</div>
                      </TableCell>
                      {lessons.map((l) => {
                        const row = userProg[l.id];
                        const pct = row?.max_percent ?? 0;
                        const isCompleted = pct >= 90;
                        const isStarted = pct > 0;
                        return (
                          <TableCell key={l.id}>
                            <div className="flex items-center gap-2">
                              {isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                              ) : isStarted ? (
                                <PlayCircle className="h-4 w-4 text-primary shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <Progress value={pct} className="h-2" />
                                <div className="text-xs text-muted-foreground mt-1">{pct}%</div>
                              </div>
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="font-medium">{completed}/{lessons.length}</TableCell>
                      <TableCell className="text-right">
                        {unlockedIds.has(p.user_id) ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Liberado
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={unlockingId === p.user_id}
                            onClick={() => handleUnlock(p.user_id)}
                          >
                            {unlockingId === p.user_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Unlock className="h-4 w-4" />
                            )}
                            Liberar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
