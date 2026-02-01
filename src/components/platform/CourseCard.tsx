import { Clock, Users, MoreVertical, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  duration: string;
  students?: number;
  progress?: number;
  variant?: "admin" | "student";
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
}

const CourseCard = ({
  title,
  description,
  image,
  category,
  duration,
  students,
  progress,
  variant = "student",
  onEdit,
  onDelete,
  onView,
}: CourseCardProps) => {
  const isAdmin = variant === "admin";
  const hasProgress = typeof progress === "number";

  return (
    <div className="group bg-card rounded-2xl overflow-hidden shadow-sm border border-border hover:shadow-md transition-all duration-300">
      {/* Image */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Category Badge */}
        <div className="absolute top-4 left-4">
          <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
            {category}
          </span>
        </div>

        {/* Admin Actions */}
        {isAdmin && (
          <div className="absolute top-4 right-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-white/90 hover:bg-white"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onView}>Visualizar</DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Play button for students */}
        {!isAdmin && (
          <button
            onClick={onView}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg">
              <Play className="w-6 h-6 text-primary fill-primary ml-1" />
            </div>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-1 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {description}
        </p>

        {/* Progress bar for students */}
        {hasProgress && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Meta info */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {duration}
            </div>
            {typeof students === "number" && (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {students}
              </div>
            )}
          </div>

          {isAdmin ? (
            <Button variant="ghost" size="sm" onClick={onEdit} className="text-primary">
              Editar
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onView} className="text-primary">
              {hasProgress ? "Continuar" : "Iniciar"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
