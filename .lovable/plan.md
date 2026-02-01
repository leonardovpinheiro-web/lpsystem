
# Plano: Reprodutor de Vídeos Interno

## Resumo
Implementar um reprodutor de vídeos interno no site para que os usuários possam assistir aos vídeos de demonstração dos exercícios sem sair da aplicação, com fallback robusto para vídeos que não permitem embed.

## Arquivos a Criar

### 1. `src/components/VideoPlayerModal.tsx`
Componente modal reutilizável com:
- Dialog do Radix UI para o modal
- Iframe responsivo com aspect-ratio 16:9
- Função `getEmbedUrl()` para converter URLs:
  - YouTube (`watch?v=`, `shorts/`, `youtu.be/`) para `youtube.com/embed/`
  - Vimeo para `player.vimeo.com/video/`
- Botão "Abrir em nova aba" sempre visível
- Detecção de erro de carregamento do iframe com fallback

## Arquivos a Modificar

### 2. `src/pages/student/ActiveWorkout.tsx`
- Importar VideoPlayerModal
- Adicionar states: `videoModalOpen` e `selectedVideoUrl`
- Substituir `window.open()` por função que abre o modal

### 3. `src/pages/student/Logbook.tsx`
- Importar VideoPlayerModal
- Adicionar states para controlar o modal
- Substituir função `openVideo()` por abertura do modal

### 4. `src/pages/admin/StudentLogbook.tsx`
- Importar VideoPlayerModal
- Adicionar states para controlar o modal
- Substituir função `openVideo()` por abertura do modal

### 5. `src/pages/student/MyWorkouts.tsx`
- Importar VideoPlayerModal
- Adicionar states para controlar o modal
- Substituir `window.open()` por abertura do modal

### 6. `src/components/admin/ExerciseTable.tsx`
- Importar VideoPlayerModal
- Adicionar states para controlar o modal
- Substituir `window.open()` por abertura do modal

## Detalhes Técnicos

### Lógica de Conversão de URLs

| Plataforma | URL Original | URL de Embed |
|------------|--------------|--------------|
| YouTube | `youtube.com/watch?v=ID` | `youtube.com/embed/ID` |
| YouTube Shorts | `youtube.com/shorts/ID` | `youtube.com/embed/ID` |
| YouTube Share | `youtu.be/ID` | `youtube.com/embed/ID` |
| Vimeo | `vimeo.com/ID` | `player.vimeo.com/video/ID` |
| Outras | - | Mostra mensagem + botão nova aba |

### Tratamento de Erros
- Evento `onError` no iframe para detectar falhas
- Mensagem amigável quando embed não é permitido
- Botão "Abrir em nova aba" sempre disponível como alternativa

### Props do Componente VideoPlayerModal
- `open: boolean` - Controla visibilidade do modal
- `onOpenChange: (open: boolean) => void` - Callback de mudança
- `videoUrl: string | null` - URL do vídeo a reproduzir
- `title?: string` - Título opcional (nome do exercício)

## Comportamento Esperado

1. Usuário clica no ícone de Play em qualquer exercício
2. Modal abre sobre a página atual
3. Se YouTube/Vimeo: vídeo reproduz no iframe
4. Se outra plataforma ou embed bloqueado: mostra mensagem + botão para nova aba
5. Botão "Abrir em nova aba" sempre visível para preferência do usuário
6. Fechar clicando no X ou fora do modal
