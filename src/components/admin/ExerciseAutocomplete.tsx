import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
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
  onSelect?: (name: string, videoUrl: string | null) => void;
  className?: string;
}

export default function ExerciseAutocomplete({
  value,
  videoUrl,
  onChange,
  onBlur,
  onSelect,
  className,
}: ExerciseAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<ExerciseLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  // Flag to skip blur save when selecting from autocomplete
  const justSelectedRef = useRef(false);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    // Mark that we just selected, so blur won't overwrite
    justSelectedRef.current = true;
    
    setInputValue(exercise.name);
    onChange(exercise.name, exercise.video_url);
    setOpen(false);
    
    // Save immediately when selecting from list
    onSelect?.(exercise.name, exercise.video_url);
    
    // Reset flag after a delay (longer than blur timeout)
    setTimeout(() => {
      justSelectedRef.current = false;
    }, 300);
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      // Skip blur save if we just selected from autocomplete
      if (justSelectedRef.current) {
        return;
      }
      onBlur();
    }, 200);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        className={className}
        placeholder="Digite o nome do exercício"
      />
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-[300px] rounded-md border bg-popover shadow-md">
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
        </div>
      )}
    </div>
  );
}
