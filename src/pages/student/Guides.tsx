import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";

interface Guide {
  id: string;
  title: string;
  content: string;
  order_index: number;
}

export default function GuidesStudent() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      if (data.length > 0) {
        setExpandedGuide(data[0].id);
      }
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Guias de Treinamento</h1>
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
        <h1 className="text-3xl font-bold">Guias de Treinamento</h1>
        <p className="text-muted-foreground">
          Informações importantes sobre sua metodologia de treino
        </p>
      </div>

      {guides.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhum guia disponível
            </h3>
            <p className="text-muted-foreground">
              Seu treinador ainda não criou guias de treinamento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {guides.map((guide) => (
            <Card key={guide.id} className="overflow-hidden">
              <button
                className="w-full p-4 flex items-center justify-between bg-secondary/50 hover:bg-secondary/70 transition-colors"
                onClick={() =>
                  setExpandedGuide(
                    expandedGuide === guide.id ? null : guide.id
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-left">{guide.title}</h3>
                </div>
                {expandedGuide === guide.id ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>

              {expandedGuide === guide.id && (
                <CardContent className="p-4">
                  <div className="prose prose-sm max-w-none text-foreground">
                    {guide.content.split("\n").map((paragraph, i) => (
                      <p key={i} className="mb-2">
                        {paragraph.split(/(https?:\/\/[^\s]+)/g).map((part, j) =>
                          part.match(/^https?:\/\//) ? (
                            <a
                              key={j}
                              href={part}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline hover:text-primary/80"
                            >
                              {part}
                            </a>
                          ) : (
                            part
                          )
                        )}
                      </p>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
