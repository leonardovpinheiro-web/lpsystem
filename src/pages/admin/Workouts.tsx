import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Dumbbell, ChevronRight } from "lucide-react";
import WorkoutEditor from "@/components/admin/WorkoutEditor";

interface Student {
  id: string;
  profile: {
    full_name: string;
    email: string;
  } | null;
}

interface Program {
  id: string;
  name: string;
  student_id: string;
  is_active: boolean;
}

export default function Workouts() {
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewProgram, setShowNewProgram] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      fetchPrograms(selectedStudent);
    }
  }, [selectedStudent]);

  const fetchStudents = async () => {
    // Fetch students
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("id, user_id")
      .eq("status", "active");

    if (studentsError) {
      console.error("Error fetching students:", studentsError);
      setLoading(false);
      return;
    }

    // Fetch profiles for each student
    const userIds = studentsData.map(s => s.user_id);
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);

    // Combine data
    const studentsWithProfiles = studentsData.map(student => ({
      id: student.id,
      profile: profilesData?.find(p => p.user_id === student.user_id) || null,
    })) as Student[];
    
    setStudents(studentsWithProfiles);
    setLoading(false);
  };

  const fetchPrograms = async (studentId: string) => {
    const { data, error } = await supabase
      .from("training_programs")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching programs:", error);
    } else {
      setPrograms(data);
    }
  };

  const handleCreateProgram = async () => {
    if (!selectedStudent || !newProgramName.trim()) return;

    const { data, error } = await supabase
      .from("training_programs")
      .insert({
        student_id: selectedStudent,
        name: newProgramName.trim(),
      })
      .select()
      .single();

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
      fetchPrograms(selectedStudent);
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
        <h1 className="text-3xl font-bold">Treinos</h1>
        <p className="text-muted-foreground">
          Crie e gerencie treinos para seus alunos
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Selecione um aluno</Label>
          <Select value={selectedStudent || ""} onValueChange={setSelectedStudent}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um aluno" />
            </SelectTrigger>
            <SelectContent>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.profile?.full_name || student.profile?.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedStudent && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Programas de Treino</h2>
            <Button onClick={() => setShowNewProgram(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Programa
            </Button>
          </div>

          {programs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Dumbbell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  Nenhum programa criado
                </h3>
                <p className="text-muted-foreground mb-4">
                  Crie o primeiro programa de treino para este aluno
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
                          <p className="text-sm text-muted-foreground">
                            {program.is_active ? "Ativo" : "Inativo"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={showNewProgram} onOpenChange={setShowNewProgram}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Programa de Treino</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Programa</Label>
              <Input
                placeholder="Ex: Programa Janeiro 2025"
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
    </div>
  );
}
