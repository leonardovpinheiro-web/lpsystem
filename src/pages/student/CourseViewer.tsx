import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BookOpen, Play, CheckCircle, Circle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import LessonNavigator from "@/components/platform/LessonNavigator";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  order_index: number;
  completed: boolean;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
}

export default function CourseViewer() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingComplete, setMarkingComplete] = useState(false);

  useEffect(() => {
    if (courseId && user) {
      fetchCourseData();
    }
  }, [courseId, user]);

  const fetchCourseData = async () => {
    try {
      // Check enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("id")
        .eq("course_id", courseId)
        .eq("user_id", user?.id)
        .maybeSingle();

      if (enrollmentError || !enrollment) {
        toast({
          title: "Acesso negado",
          description: "Você não está matriculado neste curso.",
          variant: "destructive",
        });
        navigate("/platform");
        return;
      }

      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch modules
      const { data: modulesData, error: modulesError } = await supabase
        .from("modules")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index");

      if (modulesError) throw modulesError;

      // Fetch lessons and progress for each module
      const modulesWithLessons = await Promise.all(
        (modulesData || []).map(async (mod) => {
          const { data: lessons } = await supabase
            .from("lessons")
            .select("*")
            .eq("module_id", mod.id)
            .order("order_index");

          const lessonsWithProgress = await Promise.all(
            (lessons || []).map(async (lesson) => {
              const { data: progress } = await supabase
                .from("lesson_progress")
                .select("completed")
                .eq("lesson_id", lesson.id)
                .eq("user_id", user?.id)
                .maybeSingle();

              return {
                ...lesson,
                completed: progress?.completed || false,
              };
            })
          );

          return {
            ...mod,
            lessons: lessonsWithProgress,
          };
        })
      );

      setModules(modulesWithLessons);

      // Set first incomplete lesson as current
      if (modulesWithLessons.length > 0 && modulesWithLessons[0].lessons.length > 0) {
        let foundIncomplete = false;
        for (let mi = 0; mi < modulesWithLessons.length && !foundIncomplete; mi++) {
          for (let li = 0; li < modulesWithLessons[mi].lessons.length; li++) {
            if (!modulesWithLessons[mi].lessons[li].completed) {
              setCurrentModuleIndex(mi);
              setCurrentLessonIndex(li);
              setCurrentLesson(modulesWithLessons[mi].lessons[li]);
              foundIncomplete = true;
              break;
            }
          }
        }

        if (!foundIncomplete) {
          setCurrentLesson(modulesWithLessons[0].lessons[0]);
        }
      }
    } catch (error: any) {
      console.error("Error fetching course:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o curso.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectLesson = (moduleIndex: number, lessonIndex: number) => {
    setCurrentModuleIndex(moduleIndex);
    setCurrentLessonIndex(lessonIndex);
    setCurrentLesson(modules[moduleIndex].lessons[lessonIndex]);
  };

  const goToPreviousLesson = () => {
    if (currentLessonIndex > 0) {
      selectLesson(currentModuleIndex, currentLessonIndex - 1);
    } else if (currentModuleIndex > 0) {
      const prevModule = modules[currentModuleIndex - 1];
      selectLesson(currentModuleIndex - 1, prevModule.lessons.length - 1);
    }
  };

  const goToNextLesson = () => {
    const currentModule = modules[currentModuleIndex];
    if (currentLessonIndex < currentModule.lessons.length - 1) {
      selectLesson(currentModuleIndex, currentLessonIndex + 1);
    } else if (currentModuleIndex < modules.length - 1) {
      selectLesson(currentModuleIndex + 1, 0);
    }
  };

  const hasPreviousLesson = () => {
    return currentModuleIndex > 0 || currentLessonIndex > 0;
  };

  const hasNextLesson = () => {
    if (!modules.length) return false;
    const currentModule = modules[currentModuleIndex];
    return (
      currentLessonIndex < currentModule.lessons.length - 1 ||
      currentModuleIndex < modules.length - 1
    );
  };

  const markAsComplete = async () => {
    if (!currentLesson || !user) return;

    setMarkingComplete(true);
    try {
      const { data: existing } = await supabase
        .from("lesson_progress")
        .select("id")
        .eq("lesson_id", currentLesson.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("lesson_progress")
          .update({
            completed: !currentLesson.completed,
            completed_at: !currentLesson.completed ? new Date().toISOString() : null,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("lesson_progress").insert({
          lesson_id: currentLesson.id,
          user_id: user.id,
          completed: true,
          completed_at: new Date().toISOString(),
        });
      }

      // Update local state
      setModules((prev) =>
        prev.map((mod, mi) =>
          mi === currentModuleIndex
            ? {
                ...mod,
                lessons: mod.lessons.map((lesson, li) =>
                  li === currentLessonIndex
                    ? { ...lesson, completed: !lesson.completed }
                    : lesson
                ),
              }
            : mod
        )
      );

      setCurrentLesson((prev) =>
        prev ? { ...prev, completed: !prev.completed } : null
      );

      toast({
        title: currentLesson.completed ? "Desmarcado" : "Concluído!",
        description: currentLesson.completed
          ? "Aula desmarcada como concluída"
          : "Aula marcada como concluída",
      });
    } catch (error: any) {
      console.error("Error marking lesson:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o progresso.",
        variant: "destructive",
      });
    } finally {
      setMarkingComplete(false);
    }
  };

  const calculateProgress = () => {
    const totalLessons = modules.reduce((acc, mod) => acc + mod.lessons.length, 0);
    const completedLessons = modules.reduce(
      (acc, mod) => acc + mod.lessons.filter((l) => l.completed).length,
      0
    );
    return totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
  };

  const getVideoEmbedUrl = (url: string) => {
    // YouTube
    const youtubeMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s]+)/
    );
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    return url;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Curso não encontrado</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/platform")}
        >
          Voltar à Plataforma
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
            {course.title}
          </h1>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-xs sm:text-sm text-muted-foreground">
              {Math.round(calculateProgress())}% concluído
            </span>
            <Progress value={calculateProgress()} className="w-24 sm:w-32 h-2" />
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate("/platform")}>
          Voltar
        </Button>
      </div>

      <div className="flex flex-col-reverse lg:flex-row-reverse gap-4 sm:gap-6">
        {/* Main content - Video + Navigator */}
        <div className="lg:flex-1 min-w-0 space-y-3 sm:space-y-4">
          {currentLesson ? (
            <>
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mb-2">
                    <span className="truncate max-w-[150px] sm:max-w-none">
                      {modules[currentModuleIndex]?.title}
                    </span>
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>Aula {currentLessonIndex + 1}</span>
                  </div>
                  <CardTitle className="text-lg sm:text-xl">
                    {currentLesson.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                  {currentLesson.video_url && (
                    <div className="aspect-video rounded-md sm:rounded-lg overflow-hidden bg-black -mx-4 sm:mx-0">
                      <iframe
                        src={getVideoEmbedUrl(currentLesson.video_url)}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}

                  {currentLesson.content && (
                    <div className="mt-4 pt-4 border-t">
                      <h3 className="text-sm font-semibold text-foreground mb-2">
                        Descrição
                      </h3>
                      <div className="prose prose-sm max-w-none dark:prose-invert text-muted-foreground">
                        <p className="whitespace-pre-wrap">{currentLesson.content}</p>
                      </div>
                    </div>
                  )}

                  {!currentLesson.video_url && !currentLesson.content && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Play className="w-12 h-12 mb-4" />
                      <p>Conteúdo da aula não disponível</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <LessonNavigator
                hasPrevious={hasPreviousLesson()}
                hasNext={hasNextLesson()}
                isCompleted={currentLesson.completed}
                isLoading={markingComplete}
                onPrevious={goToPreviousLesson}
                onNext={goToNextLesson}
                onMarkComplete={markAsComplete}
              />
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Selecione uma aula para começar
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Lesson list */}
        <Card className="lg:w-80 xl:w-96 flex-shrink-0 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
          <CardHeader className="pb-2 p-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-base sm:text-lg">Conteúdo do Curso</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Accordion
              type="multiple"
              defaultValue={modules.map((_, i) => `module-${i}`)}
              className="w-full"
            >
              {modules.map((mod, moduleIndex) => (
                <AccordionItem
                  key={mod.id}
                  value={`module-${moduleIndex}`}
                  className="border-b last:border-b-0"
                >
                  <AccordionTrigger className="px-3 sm:px-4 py-2 sm:py-3 hover:no-underline">
                    <div className="flex items-center gap-2 text-left">
                      <span className="text-xs sm:text-sm font-medium truncate">
                        {mod.title}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        ({mod.lessons.filter((l) => l.completed).length}/
                        {mod.lessons.length})
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <div className="flex flex-col gap-0.5 px-2 sm:px-3 pb-3 sm:pb-4">
                      {mod.lessons.map((lesson, lessonIndex) => (
                        <button
                          key={lesson.id}
                          onClick={() => selectLesson(moduleIndex, lessonIndex)}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors",
                            currentLesson?.id === lesson.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                        >
                          {lesson.completed ? (
                            <CheckCircle
                              className={cn(
                                "w-4 h-4 flex-shrink-0",
                                currentLesson?.id === lesson.id
                                  ? "text-primary-foreground"
                                  : "text-green-500"
                              )}
                            />
                          ) : (
                            <Circle
                              className={cn(
                                "w-4 h-4 flex-shrink-0",
                                currentLesson?.id === lesson.id
                                  ? "text-primary-foreground"
                                  : "text-muted-foreground"
                              )}
                            />
                          )}
                          <span className="text-xs sm:text-sm truncate flex-1">
                            {lesson.title}
                          </span>
                          {lesson.duration_minutes && (
                            <span
                              className={cn(
                                "text-xs flex-shrink-0",
                                currentLesson?.id === lesson.id
                                  ? "text-primary-foreground/80"
                                  : "text-muted-foreground"
                              )}
                            >
                              {lesson.duration_minutes}min
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
