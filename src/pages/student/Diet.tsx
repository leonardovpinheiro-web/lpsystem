import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Apple, ExternalLink, FileX } from "lucide-react";

export default function Diet() {
  const { user } = useAuth();
  const [dietUrl, setDietUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDiet = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("students")
        .select("diet_url")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching diet:", error);
      } else {
        setDietUrl(data?.diet_url || null);
      }
      setLoading(false);
    };

    fetchDiet();
  }, [user]);

  const handleOpenDiet = () => {
    if (dietUrl) {
      window.open(dietUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Minha Dieta</h1>
        <p className="text-muted-foreground">Seu plano alimentar</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Apple className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>
            {dietUrl ? "Acesse sua dieta abaixo:" : "Dieta não disponível"}
          </CardTitle>
          <CardDescription>
            {dietUrl
              ? "Clique no botão para visualizar seu plano alimentar"
              : "Seu plano alimentar ainda não foi cadastrado. Entre em contato com seu treinador."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          {dietUrl ? (
            <Button onClick={handleOpenDiet} size="lg">
              <ExternalLink className="w-5 h-5 mr-2" />
              Acessar dieta
            </Button>
          ) : (
            <div className="text-center text-muted-foreground">
              <FileX className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma dieta cadastrada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
