import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface ExerciseLibraryItem {
  id: string;
  name: string;
  video_url: string | null;
}

interface ExerciseAutocompleteProps {
  value: string;
  videoUrl: string | null;
  onChange: (name: string, videoUrl: string | null) => void;
  onBlur: () => void;
  className?: string;
}

export default function ExerciseAutocomplete({
  value,
  videoUrl,
  onChange,
  onBlur,
  className,
}: ExerciseAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<ExerciseLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const searchExercises = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("exercise_library")
      .select("id, name, video_url")
      .ilike("name", `%${query}%`)
      .limit(10);

    if (!error && data) {
      setSuggestions(data);
      setOpen(data.length > 0);
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue, videoUrl);

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchExercises(newValue);
    }, 300);
  };

  const handleSelectExercise = (exercise: ExerciseLibraryItem) => {
    setInputValue(exercise.name);
    onChange(exercise.name, exercise.video_url);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      setOpen(false);
      onBlur();
    }, 200);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          className={className}
          placeholder="Digite o nome do exercício"
        />
      </PopoverTrigger>
      <PopoverContent 
        className="p-0 w-[300px]" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandList>
            {loading ? (
              <div className="p-2 text-sm text-muted-foreground text-center">
                Buscando...
              </div>
            ) : suggestions.length === 0 ? (
              <CommandEmpty>Nenhum exercício encontrado</CommandEmpty>
            ) : (
              <CommandGroup>
                {suggestions.map((exercise) => (
                  <CommandItem
                    key={exercise.id}
                    onSelect={() => handleSelectExercise(exercise)}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{exercise.name}</span>
                      {exercise.video_url && (
                        <span className="text-xs text-muted-foreground truncate">
                          📹 Tem vídeo demonstrativo
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
