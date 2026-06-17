export interface Lesson {
  id: string;
  title: string;
  duration: string;
  videoId: string;
  videoUrl: string;
  description: string;
}

export const lessons: Lesson[] = [
  {
    id: "1",
    title: "O treino certo existe",
    duration: "4:29",
    videoId: "oeMkOmtaA2o",
    videoUrl: "https://www.youtube.com/embed/oeMkOmtaA2o",
    description: "Conheça a nossa metodologia e o que esperar da sua jornada.",
  },
  {
    id: "2",
    title: "Chegar na falha",
    duration: "4:39",
    videoId: "Pyj8Z-4s3WM",
    videoUrl: "https://www.youtube.com/embed/Pyj8Z-4s3WM",
    description: "Entenda a dinâmica de consultas, feedbacks e ajustes.",
  },
  {
    id: "3",
    title: "Séries e seus tipos",
    duration: "5:19",
    videoId: "MaFMkasrjwc",
    videoUrl: "https://www.youtube.com/embed/MaFMkasrjwc",
    description: "Passo a passo para preencher o anamnese corretamente.",
  },
  {
    id: "4",
    title: "Faixa de repetições",
    duration: "0:51",
    videoId: "tQxx9CSbSpU",
    videoUrl: "https://www.youtube.com/embed/tQxx9CSbSpU",
    description: "Como ler e seguir seu plano de nutrição personalizado.",
  },
  {
    id: "5",
    title: "Progressão de carga na prática",
    duration: "6:53",
    videoId: "tLC5_8Wfaw0",
    videoUrl: "https://www.youtube.com/embed/tLC5_8Wfaw0",
    description: "Como interpretar e executar sua rotina de exercícios.",
  },
];
