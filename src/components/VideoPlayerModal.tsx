import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertCircle } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface VideoPlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string | null;
  title?: string;
}

/**
 * Converte URLs de vídeo comuns para URLs de embed
 * Suporta: YouTube (watch, shorts, youtu.be) e Vimeo
 */
function getEmbedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // YouTube watch URLs (youtube.com/watch?v=ID)
    if (urlObj.hostname.includes("youtube.com") && urlObj.pathname === "/watch") {
      const videoId = urlObj.searchParams.get("v");
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    
    // YouTube Shorts (youtube.com/shorts/ID)
    if (urlObj.hostname.includes("youtube.com") && urlObj.pathname.startsWith("/shorts/")) {
      const videoId = urlObj.pathname.replace("/shorts/", "");
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    
    // YouTube Share URLs (youtu.be/ID)
    if (urlObj.hostname === "youtu.be") {
      const videoId = urlObj.pathname.slice(1);
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    
    // Vimeo (vimeo.com/ID)
    if (urlObj.hostname.includes("vimeo.com")) {
      const videoId = urlObj.pathname.slice(1);
      if (videoId && /^\d+$/.test(videoId)) {
        return `https://player.vimeo.com/video/${videoId}`;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

export default function VideoPlayerModal({
  open,
  onOpenChange,
  videoUrl,
  title,
}: VideoPlayerModalProps) {
  const [embedError, setEmbedError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reset state when modal opens with a new URL
  useEffect(() => {
    if (open && videoUrl) {
      setEmbedError(false);
      setIsLoading(true);
    }
  }, [open, videoUrl]);

  if (!videoUrl) return null;

  const embedUrl = getEmbedUrl(videoUrl);
  const canEmbed = embedUrl !== null && !embedError;

  const handleOpenExternal = () => {
    window.open(videoUrl, "_blank", "noopener,noreferrer");
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setEmbedError(true);
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-lg">
            {title || "Vídeo do Exercício"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4">
          {canEmbed ? (
            <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg overflow-hidden">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="animate-pulse text-muted-foreground">
                    Carregando vídeo...
                  </div>
                </div>
              )}
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              />
            </AspectRatio>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 bg-muted/50 rounded-lg">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-center">
                {embedError
                  ? "Não foi possível carregar o vídeo"
                  : "Vídeo não suportado para reprodução interna"}
              </h3>
              <p className="text-muted-foreground text-center text-sm mb-4 max-w-md">
                {embedError
                  ? "Este vídeo não permite incorporação. Use o botão abaixo para abrir em uma nova aba."
                  : "Esta plataforma de vídeo não suporta incorporação. Use o botão abaixo para assistir."}
              </p>
            </div>
          )}

          <Button
            variant="outline"
            className="w-full mt-3"
            onClick={handleOpenExternal}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Abrir em nova aba
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
