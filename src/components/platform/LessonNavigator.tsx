import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LessonNavigatorProps {
  hasPrevious: boolean;
  hasNext: boolean;
  isCompleted: boolean;
  isLoading?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onMarkComplete: () => void;
}

const LessonNavigator = ({
  hasPrevious,
  hasNext,
  isCompleted,
  isLoading,
  onPrevious,
  onNext,
  onMarkComplete,
}: LessonNavigatorProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg border border-border">
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={!hasPrevious}
          size="sm"
          className="gap-1 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden xs:inline">Aula</span> Anterior
        </Button>

        <Button
          variant="outline"
          onClick={onNext}
          disabled={!hasNext}
          size="sm"
          className="gap-1 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm sm:hidden"
        >
          Próxima <span className="hidden xs:inline">Aula</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <Button
        variant={isCompleted ? "outline" : "default"}
        onClick={onMarkComplete}
        disabled={isLoading}
        size="sm"
        className="gap-2 w-full sm:w-auto text-xs sm:text-sm"
      >
        <Check className="w-4 h-4" />
        {isCompleted ? "Concluída" : "Marcar Concluído"}
      </Button>

      <Button
        variant="outline"
        onClick={onNext}
        disabled={!hasNext}
        size="sm"
        className="gap-2 hidden sm:flex text-xs sm:text-sm"
      >
        Próxima Aula
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default LessonNavigator;
