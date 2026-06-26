## Problema

Quando o aluno preenche o logbook manualmente, a linha em `logbook_weeks` fica com `completed_at = null`. Ao clicar em "Iniciar Treino" depois, o `ActiveWorkout.tsx` (linhas 191-283) trata essa semana como "em andamento": carrega os valores nos campos de input em vez de exibi-los no card "Última semana...". Por isso parece que os dados antigos voltaram para os inputs.

## Solução

Adicionar um botão **"Salvar semana"** abaixo de cada coluna de semana no logbook do aluno (`src/pages/student/Logbook.tsx`). O botão marca `completed_at = now()` na semana correspondente, sinalizando para o `ActiveWorkout` que aquela semana já está fechada e os valores devem aparecer como referência (não nos campos de edição).

### Comportamento

- **Semana aberta** (`completed_at = null`): botão "Salvar semana" (primário) abaixo da coluna.
- **Semana salva** (`completed_at != null`): botão muda para "Reabrir semana" (outline/ghost), permitindo voltar a editar caso o aluno tenha errado algo. Reabrir define `completed_at = null`.
- Toast de confirmação em ambos casos.
- O estado `weeks` recebe o novo `completed_at` para refletir imediatamente sem refetch.

### Mudanças técnicas

1. **`src/components/logbook/LogbookWeekColumn.tsx`**
   - Adicionar prop opcional `completedAt: string | null` e `onToggleComplete?: () => void` (só usados na variante `editable`).
   - Renderizar o botão "Salvar semana" / "Reabrir semana" no rodapé da coluna (depois das `notes`), apenas quando `variant === "editable"` e `onToggleComplete` for fornecido. Não afeta a visualização readonly do admin.

2. **`src/pages/student/Logbook.tsx`**
   - Incluir `completed_at` no `select` de `fetchLogbookWeeks` e no tipo `LogbookWeek`.
   - Nova função `toggleWeekComplete(week)` que faz `update logbook_weeks set completed_at = ...` e atualiza o estado local.
   - Passar `completedAt` e `onToggleComplete` para `<LogbookWeekColumn>`.

3. **Sem mudanças** em `ActiveWorkout.tsx`, na lógica de RLS, no admin readonly ou no schema do banco — a coluna `completed_at` já existe e já é a fonte de verdade.

### Fora de escopo

- Não alterar o auto-save por blur (continua salvando célula a célula).
- Não alterar o fluxo de "Iniciar Treino" / "Finalizar Treino" no `ActiveWorkout`.
- Não tocar na visualização readonly do admin (`StudentLogbook.tsx`).