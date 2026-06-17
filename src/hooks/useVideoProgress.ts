import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ProgressRow {
  lesson_id: string;
  max_percent: number;
  started_at: string;
  completed_at: string | null;
}

export function useUserProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Record<string, ProgressRow>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setProgress({});
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("video_progress")
      .select("lesson_id, max_percent, started_at, completed_at")
      .eq("user_id", user.id);
    const map: Record<string, ProgressRow> = {};
    (data ?? []).forEach((r) => { map[r.lesson_id] = r as ProgressRow; });
    setProgress(map);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const saveProgress = useCallback(async (lessonId: string, percent: number) => {
    if (!user) return;
    const rounded = Math.min(100, Math.max(0, Math.round(percent)));
    const current = progress[lessonId];
    if (current && rounded <= current.max_percent) return;

    const completed = rounded >= 90;
    const payload: any = {
      user_id: user.id,
      lesson_id: lessonId,
      max_percent: rounded,
    };
    if (completed && !current?.completed_at) {
      payload.completed_at = new Date().toISOString();
    }

    const { data } = await supabase
      .from("video_progress")
      .upsert(payload, { onConflict: "user_id,lesson_id" })
      .select("lesson_id, max_percent, started_at, completed_at")
      .maybeSingle();

    if (data) setProgress((prev) => ({ ...prev, [lessonId]: data as ProgressRow }));
  }, [user, progress]);

  return { progress, loading, saveProgress, refresh };
}
