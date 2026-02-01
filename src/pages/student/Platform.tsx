import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import CourseCard from "@/components/platform/CourseCard";
import { Card, CardContent } from "@/components/ui/card";

type CourseCategory = "geral" | "nutricao" | "treinamento";

interface EnrolledCourse {
  id: string;
  course: {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    category: CourseCategory;
  };
  progress: number;
}

interface AvailableCourse {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: CourseCategory;
}

export default function Platform() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState<string>("treino_dieta");

  const canAccessCourse = (category: CourseCategory): boolean => {
    if (userPlan === "treino_dieta") return true;
    return category === "geral" || category === "nutricao";
  };

  useEffect(() => {
    if (user) {
      fetchUserPlan();
      fetchEnrolledCourses();
      fetchAvailableCourses();
    }
  }, [user]);

  const fetchUserPlan = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("access_plan")
      .eq("user_id", user?.id)
      .single();
    
    if (data?.access_plan) {
      setUserPlan(data.access_plan);
    }
  };

  const fetchEnrolledCourses = async () => {
    const { data, error } = await supabase
      .from("enrollments")
      .select(`
        id,
        course_id,
        courses(id, title, description, image_url, category)
      `)
      .eq("user_id", user?.id)
      .limit(6);

    if (!error && data) {
      const coursesWithProgress = await Promise.all(
        data.map(async (enrollment: any) => {
          const { data: modules } = await supabase
            .from("modules")
            .select("id")
            .eq("course_id", enrollment.course_id);

          const moduleIds = modules?.map((m) => m.id) || [];
          let progress = 0;

          if (moduleIds.length > 0) {
            const { data: lessons } = await supabase
              .from("lessons")
              .select("id")
              .in("module_id", moduleIds);

            const lessonIds = lessons?.map((l) => l.id) || [];
            const totalLessons = lessonIds.length;

            if (totalLessons > 0) {
              const { count } = await supabase
                .from("lesson_progress")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user?.id)
                .eq("completed", true)
                .in("lesson_id", lessonIds);

              progress = Math.round(((count || 0) / totalLessons) * 100);
            }
          }

          return {
            id: enrollment.id,
            course: enrollment.courses,
            progress,
          };
        })
      );

      const filteredCourses = coursesWithProgress.filter((c) =>
        canAccessCourse(c.course.category)
      );
      setEnrolledCourses(filteredCourses);
    }
    setLoading(false);
  };

  const fetchAvailableCourses = async () => {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("user_id", user?.id);

    const enrolledIds = enrollments?.map((e) => e.course_id) || [];

    let query = supabase
      .from("courses")
      .select("*")
      .eq("is_published", true)
      .limit(6);

    if (enrolledIds.length > 0) {
      query = query.not("id", "in", `(${enrolledIds.join(",")})`);
    }

    const { data, error } = await query;

    if (!error && data) {
      const filteredCourses = data.filter((course) =>
        canAccessCourse(course.category as CourseCategory)
      );
      setAvailableCourses(filteredCourses);
    }
  };

  const handleEnroll = async (courseId: string) => {
    const { error } = await supabase.from("enrollments").insert({
      user_id: user?.id,
      course_id: courseId,
    });

    if (!error) {
      toast({
        title: "Matrícula realizada!",
        description: "Você foi matriculado no curso com sucesso.",
      });
      fetchEnrolledCourses();
      fetchAvailableCourses();
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível realizar a matrícula.",
        variant: "destructive",
      });
    }
  };

  const getPlanLabel = () => {
    return userPlan === "treino_dieta" ? "Treino + Dieta" : "Dieta";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Plataforma</h1>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-0">
                <div className="h-44 bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Plataforma</h1>
        <p className="text-muted-foreground">
          Acesse seus cursos e continue aprendendo
        </p>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
          Plano: {getPlanLabel()}
        </div>
      </div>

      {enrolledCourses.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Continuar Aprendendo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((enrollment) => (
              <CourseCard
                key={enrollment.id}
                id={enrollment.course.id}
                title={enrollment.course.title}
                description={enrollment.course.description || "Sem descrição"}
                image={
                  enrollment.course.image_url ||
                  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop"
                }
                category={
                  enrollment.progress === 100 ? "Concluído" : "Em andamento"
                }
                duration="--"
                progress={enrollment.progress}
                variant="student"
                onView={() =>
                  navigate(`/platform/course/${enrollment.course.id}`)
                }
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">Cursos Disponíveis</h2>
        {availableCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableCourses.map((course) => (
              <CourseCard
                key={course.id}
                id={course.id}
                title={course.title}
                description={course.description || "Sem descrição"}
                image={
                  course.image_url ||
                  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop"
                }
                category="Novo"
                duration="--"
                variant="student"
                onView={() => handleEnroll(course.id)}
              />
            ))}
          </div>
        ) : enrolledCourses.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhum curso disponível
              </h3>
              <p className="text-muted-foreground">
                Em breve novos cursos serão adicionados.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                Você já está matriculado em todos os cursos disponíveis para o
                seu plano! 🎉
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
