## Objetivo

Adicionar um botão **"Visualizar como aluno"** no topo da tela de edição do treino (`WorkoutEditor`), que abre um modal em tela cheia reproduzindo exatamente o que o aluno vê — útil para demonstrações da plataforma.

## Comportamento

1. **Botão** no cabeçalho do `WorkoutEditor` (ao lado de "Voltar"/título do programa): ícone de olho + "Visualizar como aluno".
2. Ao clicar, abre um **Dialog em tela cheia** com um cabeçalho fino sinalizando "Pré-visualização — modo aluno" e botão de fechar.
3. Dentro do modal, duas etapas navegáveis:
   - **Etapa 1 — Meus Treinos**: réplica visual da tela `MyWorkouts` do programa atual (card de aeróbico, card de abdominal, cards de treino expansíveis com tabela de exercícios, modal de vídeo, botão "Iniciar Treino" em cada workout).
   - **Etapa 2 — Treino ativo**: ao clicar em "Iniciar Treino" dentro da prévia, troca o conteúdo do modal para uma réplica de `ActiveWorkout` daquele workout, com botão "Voltar" que retorna à etapa 1.
4. A prévia é **somente leitura**:
   - Nenhum acesso a `useAuth`, `students`, `logbook_weeks` ou `logbook_week_entries`.
   - Inputs de séries/peso/reps e textarea de notas ficam visíveis mas **desabilitados** (`disabled`); botão "Salvar" é renderizado mas desabilitado com tooltip "Pré-visualização — alterações não são salvas".
   - "Última semana" exibe placeholders ("—") em vez de dados reais.
5. O programa exibido é o do `programId` já carregado no `WorkoutEditor`, **independente de `is_active`** — assim funciona mesmo em clones inativos.

## Implementação técnica

**Novos arquivos:**
- `src/components/admin/StudentPreviewModal.tsx`
  - Props: `{ programId: string; open: boolean; onOpenChange: (o: boolean) => void }`.
  - Estado interno: `view: "program" | "workout"`, `activeWorkoutId: string | null`.
  - Usa `<Dialog>` com `DialogContent` em `max-w-5xl h-[90vh] overflow-y-auto`.
  - Faz um fetch único do programa (mesma query do `MyWorkouts.fetchProgram`, mas filtrando por `id = programId` em vez de `student_id + is_active`).
  - Renderiza `<ProgramPreview>` ou `<ActiveWorkoutPreview>` conforme `view`.

- `src/components/admin/preview/ProgramPreview.tsx`
  - Recebe `program` já carregado + callback `onStartWorkout(workoutId)`.
  - Copia o JSX de `MyWorkouts` (linhas ~217-441) **sem** o botão "Copiar treino" e **sem** `navigate` — o "Iniciar Treino" chama `onStartWorkout`.
  - Mantém `VideoPlayerModal` funcional (é só player).

- `src/components/admin/preview/ActiveWorkoutPreview.tsx`
  - Recebe `workoutId` + `onBack`.
  - Busca exercícios direto de `exercises` por `workout_id` (sem `studentId`, sem `logbook_*`).
  - Renderiza o mesmo layout de `ActiveWorkout` (cards colapsáveis por exercício, 4 séries com inputs peso/reps, textarea de notas, botão Salvar), mas com todos os inputs `disabled` e coluna "Última semana" mostrando "—".

**Arquivo editado:**
- `src/components/admin/WorkoutEditor.tsx`
  - Importa `Eye` de `lucide-react` e `StudentPreviewModal`.
  - Adiciona state `showPreview`.
  - Adiciona `<Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>` com ícone `Eye` no header (perto do título do programa).
  - Renderiza `<StudentPreviewModal programId={programId} open={showPreview} onOpenChange={setShowPreview} />` no fim do JSX.

## Não inclui

- Não altera `MyWorkouts.tsx` nem `ActiveWorkout.tsx` (mantém código do aluno intocado).
- Não cria rotas novas.
- Nenhuma escrita em banco a partir da prévia.

## Resumo dos arquivos

| Ação | Arquivo |
|---|---|
| Criar | `src/components/admin/StudentPreviewModal.tsx` |
| Criar | `src/components/admin/preview/ProgramPreview.tsx` |
| Criar | `src/components/admin/preview/ActiveWorkoutPreview.tsx` |
| Editar | `src/components/admin/WorkoutEditor.tsx` (botão + modal) |
