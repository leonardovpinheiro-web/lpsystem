import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, User, MoreVertical, Loader2, Mail, ClipboardList, Dumbbell, Upload, FileText, Trash2, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
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
  diet_url: string | null;
  created_at: string;
  profile: {
    full_name: string;
    email: string;
  } | null;
}

export default function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const { toast } = useToast();

  // Form state for editing
  const [editStatus, setEditStatus] = useState<"active" | "paused">("active");
  const [editNotes, setEditNotes] = useState("");
  const [editDietUrl, setEditDietUrl] = useState<string | null>(null);
  const [isUploadingDiet, setIsUploadingDiet] = useState(false);

  // Form state for adding new student
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentPassword, setNewStudentPassword] = useState("");
  const [isAddingStudent, setIsAddingStudent] = useState(false);

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
    
    if (userIds.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }

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
    setEditDietUrl(student.diet_url || null);
    setIsDialogOpen(true);
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;

    const { error } = await supabase
      .from("students")
      .update({
        status: editStatus,
        admin_notes: editNotes || null,
        diet_url: editDietUrl,
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

  const handleDietUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingStudent || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    if (file.type !== "application/pdf") {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, selecione um arquivo PDF",
      });
      return;
    }

    setIsUploadingDiet(true);

    try {
      const fileName = `${editingStudent.id}/${Date.now()}_${file.name}`;
      
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("diets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("diets")
        .getPublicUrl(uploadData.path);

      setEditDietUrl(urlData.publicUrl);
      toast({
        title: "Sucesso",
        description: "Dieta enviada com sucesso",
      });
    } catch (error) {
      console.error("Error uploading diet:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao enviar arquivo de dieta",
      });
    } finally {
      setIsUploadingDiet(false);
      // Reset input
      event.target.value = "";
    }
  };

  const handleRemoveDiet = async () => {
    if (!editingStudent || !editDietUrl) return;

    try {
      // Extract file path from URL
      const urlParts = editDietUrl.split("/diets/");
      if (urlParts.length > 1) {
        const filePath = decodeURIComponent(urlParts[1]);
        await supabase.storage.from("diets").remove([filePath]);
      }
      
      setEditDietUrl(null);
      toast({
        title: "Sucesso",
        description: "Dieta removida",
      });
    } catch (error) {
      console.error("Error removing diet:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao remover dieta",
      });
    }
  };

  const handleAddStudent = async () => {
    if (!newStudentName.trim() || !newStudentEmail.trim() || !newStudentPassword.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha todos os campos",
      });
      return;
    }

    if (newStudentPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
      });
      return;
    }

    setIsAddingStudent(true);

    try {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newStudentEmail,
        password: newStudentPassword,
        options: {
          data: {
            full_name: newStudentName,
          },
        },
      });

      if (authError) {
        let message = "Erro ao criar aluno";
        if (authError.message.includes("User already registered")) {
          message = "Este email já está cadastrado";
        }
        toast({
          variant: "destructive",
          title: "Erro",
          description: message,
        });
        setIsAddingStudent(false);
        return;
      }

      if (!authData.user) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao criar usuário",
        });
        setIsAddingStudent(false);
        return;
      }

      // Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: authData.user.id,
          full_name: newStudentName,
          email: newStudentEmail,
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
      }

      // Create student record
      const { error: studentError } = await supabase
        .from("students")
        .insert({
          user_id: authData.user.id,
          status: "active",
        });

      if (studentError) {
        console.error("Error creating student:", studentError);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao criar registro de aluno",
        });
        setIsAddingStudent(false);
        return;
      }

      // Create student role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "student",
        });

      if (roleError) {
        console.error("Error creating role:", roleError);
      }

      toast({
        title: "Sucesso",
        description: "Aluno cadastrado com sucesso! Um email de confirmação foi enviado.",
      });

      setIsAddDialogOpen(false);
      setNewStudentName("");
      setNewStudentEmail("");
      setNewStudentPassword("");
      fetchStudents();
    } catch (error) {
      console.error("Error adding student:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro inesperado ao criar aluno",
      });
    } finally {
      setIsAddingStudent(false);
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
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Aluno
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
      ) : filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhum aluno encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "Nenhum aluno corresponde à busca"
                : "Cadastre seu primeiro aluno para começar"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Aluno
              </Button>
            )}
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
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/students/${student.id}/workouts`)}
                    >
                      <Dumbbell className="w-4 h-4 mr-1" />
                      Treino
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/students/${student.id}/logbook`)}>
                          <ClipboardList className="w-4 h-4 mr-2" />
                          Ver Logbook
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(student)}>
                          Editar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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

      {/* Edit Student Dialog */}
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

            <Separator />

            <div className="space-y-3">
              <Label>Dieta do Aluno</Label>
              {editDietUrl ? (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm flex-1 truncate">
                    {editDietUrl.split("/").pop()?.split("_").slice(1).join("_") || "Dieta.pdf"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(editDietUrl, "_blank")}
                    title="Ver dieta"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveDiet}
                    title="Remover dieta"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={handleDietUpload}
                    disabled={isUploadingDiet}
                    className="hidden"
                    id="diet-upload"
                  />
                  <Label
                    htmlFor="diet-upload"
                    className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-muted transition-colors"
                  >
                    {isUploadingDiet ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{isUploadingDiet ? "Enviando..." : "Escolher arquivo PDF"}</span>
                  </Label>
                </div>
              )}
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

      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student-name">Nome completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="student-name"
                  placeholder="Nome do aluno"
                  className="pl-9"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="student-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  className="pl-9"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-password">Senha inicial</Label>
              <Input
                id="student-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newStudentPassword}
                onChange={(e) => setNewStudentPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                O aluno receberá um email para confirmar a conta
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isAddingStudent}>
                Cancelar
              </Button>
              <Button onClick={handleAddStudent} disabled={isAddingStudent}>
                {isAddingStudent ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  "Cadastrar"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
