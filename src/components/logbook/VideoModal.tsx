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

function getEmbedUrl(url: string): string {
  // YouTube
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  // Default: return as-is
  return url;
}

export function VideoModal({ open, onOpenChange, videoUrl, exerciseName }: VideoModalProps) {
  if (!videoUrl) return null;

  const embedUrl = getEmbedUrl(videoUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{exerciseName}</DialogTitle>
        </DialogHeader>
        <div className="aspect-video w-full">
          <iframe
            src={embedUrl}
            className="w-full h-full rounded-b-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
