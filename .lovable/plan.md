

## Problema Identificado

O sistema atual usa a seguinte lógica para determinar se uma semana está "completa":

```typescript
const entriesWithData = lastWeek.entries.filter(e => 
  e.set1_weight !== null || e.set1_reps !== null
);
const isWeekComplete = entriesWithData.length >= sortedExercises.length;
```

Isso causa o seguinte problema:
- Semana 1: Aluno preenche 3 de 4 exercícios e clica em "Finalizar Treino"
- Próximo treino: Sistema detecta que semana 1 tem 3/4 exercícios preenchidos
- Sistema carrega semana 1 em vez de criar semana 2
- Aluno acaba sobrescrevendo dados da semana 1

## Solução Proposta

Adicionar um campo `completed_at` na tabela `logbook_weeks` que marca quando o aluno finalizou a sessão de treino. A lógica de verificação passa a ser:

**Semana completa = semana que foi explicitamente finalizada pelo aluno (campo `completed_at` preenchido)**

### Mudanças Necessárias

**1. Banco de Dados - Nova coluna na tabela `logbook_weeks`**

Adicionar coluna `completed_at` (timestamp, nullable) que será preenchida quando o aluno clicar em "Finalizar Treino":

```sql
ALTER TABLE logbook_weeks 
ADD COLUMN completed_at timestamptz DEFAULT NULL;
```

**2. Lógica de Determinação de Semana (ActiveWorkout.tsx)**

Alterar a verificação de "semana completa" para usar o campo `completed_at`:

```typescript
// ANTES (problemático):
const isWeekComplete = entriesWithData.length >= sortedExercises.length;

// DEPOIS (correto):
const isWeekComplete = lastWeek.completed_at !== null;
```

**3. Finalização do Treino (ActiveWorkout.tsx)**

Ao clicar em "Finalizar Treino", atualizar o campo `completed_at` da semana atual:

```typescript
await supabase
  .from("logbook_weeks")
  .update({ completed_at: new Date().toISOString() })
  .eq("id", currentWeekId);
```

### Fluxo Corrigido

1. Aluno inicia treino pela primeira vez - Sistema cria Semana 1
2. Aluno preenche alguns exercícios e sai da página - Dados são salvos automaticamente
3. Aluno volta e continua preenchendo - Sistema carrega Semana 1 (pois `completed_at` é null)
4. Aluno clica em "Finalizar Treino" - Sistema marca `completed_at` com timestamp atual
5. Próximo dia, aluno inicia treino - Sistema detecta que Semana 1 tem `completed_at` preenchido
6. Sistema cria Semana 2 automaticamente

---

## Detalhes Técnicos

### Arquivos a serem modificados:

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/` | Nova migration para adicionar coluna `completed_at` |
| `src/pages/student/ActiveWorkout.tsx` | Atualizar lógica de verificação e finalização |

### Query para buscar semanas (atualizada):

```typescript
const { data: existingWeeks } = await supabase
  .from("logbook_weeks")
  .select(`
    id,
    week_number,
    completed_at,  // NOVO CAMPO
    entries:logbook_week_entries(...)
  `)
  .eq("workout_id", workoutId)
  .eq("student_id", studentData.id)
  .order("week_number", { ascending: false });
```

### Nova lógica de determinação:

```typescript
if (existingWeeks && existingWeeks.length > 0) {
  const lastWeek = existingWeeks[0];
  
  // Semana está completa se foi explicitamente finalizada
  const isWeekComplete = lastWeek.completed_at !== null;

  if (isWeekComplete) {
    // Criar nova semana...
  } else {
    // Carregar dados da semana atual...
  }
}
```

### Atualização no finishWorkout:

```typescript
const finishWorkout = async () => {
  // ... salvar dados dos exercícios ...

  // Marcar semana como finalizada
  await supabase
    .from("logbook_weeks")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", currentWeekId);

  toast({ title: "Treino finalizado!" });
  navigate("/logbook");
};
```

