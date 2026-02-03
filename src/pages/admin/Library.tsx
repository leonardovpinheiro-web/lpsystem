import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { Plus, Dumbbell, ChevronRight, MoreVertical, Pencil, Trash2, Copy, Loader2, UserPlus, Check, ChevronsUpDown } from "lucide-react";
import WorkoutEditor from "@/components/admin/WorkoutEditor";
import ExerciseLibraryManager from "@/components/admin/ExerciseLibraryManager";
import { cn } from "@/lib/utils";

interface Program {
  id: string;
  name: string;
  is_active: boolean;
  is_template: boolean;
}

interface Student {
  id: string;
  profile: {
    full_name: string;
    email: string;
  } | null;
}

export default function Library() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewProgram, setShowNewProgram] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [editProgramName, setEditProgramName] = useState("");
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [cloneDialog, setCloneDialog] = useState<{ open: boolean; program: Program | null }>({
    open: false,
    program: null,
  });
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [cloning, setCloning] = useState(false);
  const [studentSearchOpen, setStudentSearchOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPrograms();
    fetchStudents();
  }, []);

  const fetchPrograms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("training_programs")
      .select("*")
      .eq("is_template", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching programs:", error);
    } else {
      setPrograms(data || []);
    }
    setLoading(false);
  };

  const fetchStudents = async () => {
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("id, user_id")
      .eq("status", "active");

    if (studentsError) {
      console.error("Error fetching students:", studentsError);
      return;
    }

    const userIds = studentsData.map(s => s.user_id);
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);

    const studentsWithProfiles = studentsData.map(student => ({
      id: student.id,
      profile: profilesData?.find(p => p.user_id === student.user_id) || null,
    })) as Student[];

    setStudents(studentsWithProfiles);
  };

  const handleCreateProgram = async () => {
    if (!newProgramName.trim()) return;

    const { error } = await supabase
      .from("training_programs")
      .insert({
        name: newProgramName.trim(),
        is_template: true,
        student_id: null,
      });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao criar programa",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Programa criado com sucesso",
      });
      setShowNewProgram(false);
      setNewProgramName("");
      fetchPrograms();
    }
  };

  const openEditProgram = (program: Program, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProgram(program);
    setEditProgramName(program.name);
  };

  const handleUpdateProgramName = async () => {
    if (!editingProgram || !editProgramName.trim()) return;

    const { error } = await supabase
      .from("training_programs")
      .update({ name: editProgramName.trim() })
      .eq("id", editingProgram.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao renomear programa",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Programa renomeado com sucesso",
      });
      setEditingProgram(null);
      setEditProgramName("");
      fetchPrograms();
    }
  };

  const handleDeleteProgram = async (programId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir este programa? Todos os treinos serão excluídos.")) return;

    const { error } = await supabase
      .from("training_programs")
      .delete()
      .eq("id", programId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao excluir programa",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Programa excluído com sucesso",
      });
      fetchPrograms();
    }
  };

  const handleDuplicateProgram = async (program: Program, e: React.MouseEvent) => {
    e.stopPropagation();
    setDuplicating(program.id);

    try {
      const { data: newProgram, error: programError } = await supabase
        .from("training_programs")
        .insert({
          name: `${program.name} (Cópia)`,
          is_template: true,
          student_id: null,
        })
        .select()
        .single();

      if (programError || !newProgram) {
        throw new Error("Erro ao criar programa");
      }

      const { data: workouts } = await supabase
        .from("workouts")
        .select("*")
        .eq("program_id", program.id)
        .order("order_index", { ascending: true });

      for (const workout of workouts || []) {
        const { data: newWorkout } = await supabase
          .from("workouts")
          .insert({
            program_id: newProgram.id,
            name: workout.name,
            order_index: workout.order_index,
          })
          .select()
          .single();

        if (!newWorkout) continue;

        const { data: exercises } = await supabase
          .from("exercises")
          .select("*")
          .eq("workout_id", workout.id)
          .order("order_index", { ascending: true });

        if (exercises && exercises.length > 0) {
          const newExercises = exercises.map(ex => ({
            workout_id: newWorkout.id,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            technique: ex.technique,
            rest_seconds: ex.rest_seconds,
            notes: ex.notes,
            video_url: ex.video_url,
            order_index: ex.order_index,
          }));

          await supabase.from("exercises").insert(newExercises);
        }
      }

      toast({
        title: "Sucesso",
        description: "Programa duplicado com sucesso",
      });
      fetchPrograms();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao duplicar programa",
      });
    } finally {
      setDuplicating(null);
    }
  };

  const openCloneDialog = (program: Program, e: React.MouseEvent) => {
    e.stopPropagation();
    setCloneDialog({ open: true, program });
    setSelectedStudent("");
  };

  const handleCloneToStudent = async () => {
    if (!cloneDialog.program || !selectedStudent) return;

    setCloning(true);

    try {
      // Create program for student
      const { data: newProgram, error: programError } = await supabase
        .from("training_programs")
        .insert({
          name: cloneDialog.program.name,
          student_id: selectedStudent,
          is_template: false,
        })
        .select()
        .single();

      if (programError || !newProgram) {
        throw new Error("Erro ao criar programa");
      }

      // Fetch and duplicate workouts
      const { data: workouts } = await supabase
        .from("workouts")
        .select("*")
        .eq("program_id", cloneDialog.program.id)
        .order("order_index", { ascending: true });

      for (const workout of workouts || []) {
        const { data: newWorkout } = await supabase
          .from("workouts")
          .insert({
            program_id: newProgram.id,
            name: workout.name,
            order_index: workout.order_index,
          })
          .select()
          .single();

        if (!newWorkout) continue;

        const { data: exercises } = await supabase
          .from("exercises")
          .select("*")
          .eq("workout_id", workout.id)
          .order("order_index", { ascending: true });

        if (exercises && exercises.length > 0) {
          const newExercises = exercises.map(ex => ({
            workout_id: newWorkout.id,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            technique: ex.technique,
            rest_seconds: ex.rest_seconds,
            notes: ex.notes,
            video_url: ex.video_url,
            order_index: ex.order_index,
          }));

          await supabase.from("exercises").insert(newExercises);
        }
      }

      const student = students.find(s => s.id === selectedStudent);
      toast({
        title: "Sucesso",
        description: `Programa clonado para ${student?.profile?.full_name || "aluno"}`,
      });
      setCloneDialog({ open: false, program: null });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao clonar programa para aluno",
      });
    } finally {
      setCloning(false);
    }
  };

  if (selectedProgram) {
    return (
      <WorkoutEditor
        programId={selectedProgram}
        onBack={() => setSelectedProgram(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Biblioteca de Treinos</h1>
        <p className="text-muted-foreground">
          Crie programas de treino pré-configurados para clonar aos alunos
        </p>
      </div>

      {/* Exercise Library Manager */}
      <ExerciseLibraryManager />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Programas Template</h2>
        <Button onClick={() => setShowNewProgram(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Programa
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : programs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Dumbbell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhum programa na biblioteca
            </h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro programa template para clonar aos alunos
            </p>
            <Button onClick={() => setShowNewProgram(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Programa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <Card
              key={program.id}
              className="workout-card cursor-pointer"
              onClick={() => setSelectedProgram(program.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{program.name}</h3>
                      <p className="text-sm text-muted-foreground">Template</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {duplicating === program.id && (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => openCloneDialog(program, e as any)}>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Clonar para Aluno
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => openEditProgram(program, e as any)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Renomear
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleDuplicateProgram(program, e as any)}
                          disabled={duplicating === program.id}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleDeleteProgram(program.id, e as any)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Program Dialog */}
      <Dialog open={showNewProgram} onOpenChange={setShowNewProgram}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Programa Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Programa</Label>
              <Input
                placeholder="Ex: Hipertrofia Iniciante"
                value={newProgramName}
                onChange={(e) => setNewProgramName(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewProgram(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateProgram}>Criar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Program Dialog */}
      <Dialog open={!!editingProgram} onOpenChange={(open) => !open && setEditingProgram(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Programa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Programa</Label>
              <Input
                placeholder="Ex: Hipertrofia Iniciante"
                value={editProgramName}
                onChange={(e) => setEditProgramName(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingProgram(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateProgramName}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clone to Student Dialog */}
      <Dialog open={cloneDialog.open} onOpenChange={(open) => !open && setCloneDialog({ open: false, program: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clonar Programa para Aluno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Programa: <strong>{cloneDialog.program?.name}</strong>
            </p>
            <div className="space-y-2">
              <Label>Selecione o Aluno</Label>
              <Popover open={studentSearchOpen} onOpenChange={setStudentSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={studentSearchOpen}
                    className="w-full justify-between"
                  >
                    {selectedStudent
                      ? students.find((s) => s.id === selectedStudent)?.profile?.full_name || 
                        students.find((s) => s.id === selectedStudent)?.profile?.email || 
                        "Aluno selecionado"
                      : "Buscar aluno..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Digite o nome do aluno..." />
                    <CommandList>
                      <CommandEmpty>Nenhum aluno encontrado.</CommandEmpty>
                      <CommandGroup>
                        {students.map((student) => (
                          <CommandItem
                            key={student.id}
                            value={student.profile?.full_name || student.profile?.email || student.id}
                            onSelect={() => {
                              setSelectedStudent(student.id);
                              setStudentSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedStudent === student.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{student.profile?.full_name || "Sem nome"}</span>
                              {student.profile?.email && (
                                <span className="text-xs text-muted-foreground">{student.profile.email}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCloneDialog({ open: false, program: null })} disabled={cloning}>
                Cancelar
              </Button>
              <Button onClick={handleCloneToStudent} disabled={!selectedStudent || cloning}>
                {cloning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Clonando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Clonar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
