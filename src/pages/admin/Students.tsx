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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, User, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Student {
  id: string;
  user_id: string;
  status: "active" | "paused";
  admin_notes: string | null;
  created_at: string;
  profile: {
    full_name: string;
    email: string;
  } | null;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const { toast } = useToast();

  // Form state for editing
  const [editStatus, setEditStatus] = useState<"active" | "paused">("active");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    
    // Fetch students
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (studentsError) {
      console.error("Error fetching students:", studentsError);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar alunos",
      });
      setLoading(false);
      return;
    }

    // Fetch profiles for each student
    const userIds = studentsData.map(s => s.user_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    }

    // Combine data
    const studentsWithProfiles = studentsData.map(student => ({
      ...student,
      profile: profilesData?.find(p => p.user_id === student.user_id) || null,
    })) as Student[];
    setStudents(studentsWithProfiles);
    setLoading(false);
  };

  const openEditDialog = (student: Student) => {
    setEditingStudent(student);
    setEditStatus(student.status);
    setEditNotes(student.admin_notes || "");
    setIsDialogOpen(true);
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;

    const { error } = await supabase
      .from("students")
      .update({
        status: editStatus,
        admin_notes: editNotes || null,
      })
      .eq("id", editingStudent.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar aluno",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Aluno atualizado com sucesso",
      });
      setIsDialogOpen(false);
      fetchStudents();
    }
  };

  const filteredStudents = students.filter((student) => {
    const name = student.profile?.full_name?.toLowerCase() || "";
    const email = student.profile?.email?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Alunos</h1>
        <p className="text-muted-foreground">Gerencie os alunos cadastrados</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar alunos..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
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
      ) : filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhum aluno encontrado</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "Nenhum aluno corresponde à busca"
                : "Quando alunos se cadastrarem, aparecerão aqui"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map((student) => (
            <Card key={student.id} className="workout-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {student.profile?.full_name || "Sem nome"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {student.profile?.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(student)}>
                        Editar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span
                    className={`status-badge ${
                      student.status === "active" ? "status-active" : "status-paused"
                    }`}
                  >
                    {student.status === "active" ? "Ativo" : "Pausado"}
                  </span>
                </div>
                {student.admin_notes && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                    {student.admin_notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Aluno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={editingStudent?.profile?.full_name || ""} disabled />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={editingStudent?.profile?.email || ""} disabled />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as "active" | "paused")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações (apenas admin)</Label>
              <Textarea
                placeholder="Observações sobre o aluno..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateStudent}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
