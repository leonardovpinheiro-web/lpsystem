import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, BookOpen, Edit, Trash2 } from "lucide-react";

interface Guide {
  id: string;
  title: string;
  content: string;
  order_index: number;
}

export default function GuidesAdmin() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchGuides();
  }, []);

  const fetchGuides = async () => {
    const { data, error } = await supabase
      .from("training_guides")
      .select("*")
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Error fetching guides:", error);
    } else {
      setGuides(data);
    }
    setLoading(false);
  };

  const openNewGuide = () => {
    setEditingGuide(null);
    setTitle("");
    setContent("");
    setShowEditor(true);
  };

  const openEditGuide = (guide: Guide) => {
    setEditingGuide(guide);
    setTitle(guide.title);
    setContent(guide.content);
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha todos os campos",
      });
      return;
    }

    if (editingGuide) {
      const { error } = await supabase
        .from("training_guides")
        .update({ title: title.trim(), content: content.trim() })
        .eq("id", editingGuide.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao atualizar guia",
        });
      } else {
        toast({ title: "Sucesso", description: "Guia atualizado" });
        setShowEditor(false);
        fetchGuides();
      }
    } else {
      const maxOrder = guides.length > 0 
        ? Math.max(...guides.map(g => g.order_index)) 
        : -1;

      const { error } = await supabase
        .from("training_guides")
        .insert({
          title: title.trim(),
          content: content.trim(),
          order_index: maxOrder + 1,
        });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao criar guia",
        });
      } else {
        toast({ title: "Sucesso", description: "Guia criado" });
        setShowEditor(false);
        fetchGuides();
      }
    }
  };

  const handleDelete = async (guideId: string) => {
    if (!confirm("Tem certeza que deseja excluir este guia?")) return;

    const { error } = await supabase
      .from("training_guides")
      .delete()
      .eq("id", guideId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao excluir guia",
      });
    } else {
      toast({ title: "Sucesso", description: "Guia excluído" });
      fetchGuides();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Guia de Treino</h1>
          <p className="text-muted-foreground">
            Crie conteúdos educativos para seus alunos
          </p>
        </div>
        <Button onClick={openNewGuide}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Guia
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-1/3 mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : guides.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhum guia criado</h3>
            <p className="text-muted-foreground mb-4">
              Crie guias para ajudar seus alunos
            </p>
            <Button onClick={openNewGuide}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Guia
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {guides.map((guide) => (
            <Card key={guide.id} className="workout-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{guide.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {guide.content.substring(0, 150)}...
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditGuide(guide)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(guide.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGuide ? "Editar Guia" : "Novo Guia"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                placeholder="Ex: Guia de Séries de Aquecimento"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label>Conteúdo</Label>
              <Textarea
                placeholder="Escreva o conteúdo do guia..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[300px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditor(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
