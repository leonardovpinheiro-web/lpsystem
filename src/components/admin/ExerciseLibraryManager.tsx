import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Video, Loader2, Search } from "lucide-react";
import VideoPlayerModal from "@/components/VideoPlayerModal";

interface Exercise {
  id: string;
  name: string;
  video_url: string | null;
}

export default function ExerciseLibraryManager() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseVideo, setNewExerciseVideo] = useState("");
  const [adding, setAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState({ url: "", name: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("exercise_library")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching exercises:", error);
    } else {
      setExercises(data || []);
    }
    setLoading(false);
  };

  const handleAddExercise = async () => {
    if (!newExerciseName.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nome do exercício é obrigatório",
      });
      return;
    }

    setAdding(true);

    const { error } = await supabase.from("exercise_library").insert({
      name: newExerciseName.trim(),
      video_url: newExerciseVideo.trim() || null,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao adicionar exercício",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Exercício adicionado à biblioteca",
      });
      setNewExerciseName("");
      setNewExerciseVideo("");
      fetchExercises();
    }

    setAdding(false);
  };

  const handleDeleteExercise = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este exercício da biblioteca?")) return;

    const { error } = await supabase.from("exercise_library").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao excluir exercício",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Exercício excluído da biblioteca",
      });
      fetchExercises();
    }
  };

  const openVideoModal = (url: string, name: string) => {
    setSelectedVideo({ url, name });
    setVideoModalOpen(true);
  };

  const filteredExercises = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Biblioteca de Exercícios</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new exercise form */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Nome do exercício"
            value={newExerciseName}
            onChange={(e) => setNewExerciseName(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="URL do vídeo (opcional)"
            value={newExerciseVideo}
            onChange={(e) => setNewExerciseVideo(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleAddExercise} disabled={adding}>
            {adding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </>
            )}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar exercício..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Exercise list */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredExercises.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {searchTerm ? "Nenhum exercício encontrado" : "Nenhum exercício na biblioteca"}
          </p>
        ) : (
          <div className="max-h-[400px] overflow-y-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[100px] text-center">Vídeo</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExercises.map((exercise) => (
                  <TableRow key={exercise.id}>
                    <TableCell className="font-medium">{exercise.name}</TableCell>
                    <TableCell className="text-center">
                      {exercise.video_url ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openVideoModal(exercise.video_url!, exercise.name)}
                        >
                          <Video className="w-4 h-4 text-primary" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteExercise(exercise.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Total: {exercises.length} exercícios
        </p>
      </CardContent>

      <VideoPlayerModal
        open={videoModalOpen}
        onOpenChange={setVideoModalOpen}
        videoUrl={selectedVideo.url}
        title={selectedVideo.name}
      />
    </Card>
  );
}
