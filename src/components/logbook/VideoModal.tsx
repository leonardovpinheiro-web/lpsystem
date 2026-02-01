import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string | null;
  exerciseName: string;
}

function getEmbedUrl(url: string): string | null {
  // YouTube (shorts, watch, embed, youtu.be)
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  // Instagram - não suporta embed, retorna null para abrir externamente
  if (url.includes('instagram.com')) {
    return null;
  }

  // Default: return as-is
  return url;
}

function isExternalOnly(url: string): boolean {
  return url.includes('instagram.com');
}

export function VideoModal({ open, onOpenChange, videoUrl, exerciseName }: VideoModalProps) {
  if (!videoUrl) return null;

  const embedUrl = getEmbedUrl(videoUrl);
  const externalOnly = isExternalOnly(videoUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{exerciseName}</DialogTitle>
        </DialogHeader>
        <div className="aspect-video w-full">
          {externalOnly || !embedUrl ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-muted rounded-b-lg gap-4">
              <p className="text-muted-foreground text-center px-4">
                Este vídeo não pode ser exibido aqui.
              </p>
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Abrir vídeo externamente
              </a>
            </div>
          ) : (
            <iframe
              src={embedUrl}
              className="w-full h-full rounded-b-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
