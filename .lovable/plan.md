

## Semanas Colapsaveis no Logbook

### O que muda

Cada coluna de semana no logbook podera ser minimizada/expandida clicando no cabecalho. O estado persiste enquanto o usuario navega (nao reseta ao scrollar ou interagir com outros elementos). Um novo componente dedicado `LogbookWeekColumn` encapsula toda a logica de colapso.

### Comportamento

- Clique no cabecalho da semana alterna entre expandido e minimizado
- Minimizada: coluna estreita (~48px) mostrando apenas "S{numero}" na vertical e um icone de seta
- Expandida: layout atual completo com 4 series e dados
- Todas as semanas iniciam expandidas por padrao
- O estado e independente por semana (multiplas podem estar em qualquer estado)

### Detalhes Tecnicos

**Novo componente: `src/components/logbook/LogbookWeekColumn.tsx`**

Componente reutilizavel que recebe:
- `week` (dados da semana)
- `collapsed` (boolean)
- `onToggle` (callback)
- `allExercises` (lista de exercicios)
- `getEntryForExercise` (funcao auxiliar)
- Variante `readonly` (admin) vs `editable` (student) via prop

Quando `collapsed=true`:
- Renderiza coluna com `w-12` e texto "S{numero}" rotacionado verticalmente
- Icone `ChevronRight` indicando que pode expandir

Quando `collapsed=false`:
- Renderiza o conteudo atual completo (header, sub-headers de series, linhas de exercicio)
- Icone `ChevronLeft` no cabecalho para minimizar

**Alteracoes em `src/pages/admin/StudentLogbook.tsx`:**
- Adicionar estado `collapsedWeeks: Set<string>` e funcao `toggleWeek`
- Substituir o bloco inline de renderizacao de cada semana pelo componente `LogbookWeekColumn`

**Alteracoes em `src/pages/student/Logbook.tsx`:**
- Mesma logica de estado `collapsedWeeks` e `toggleWeek`
- Usar o mesmo componente `LogbookWeekColumn` com a variante editavel (inputs ao inves de texto)

Nenhuma alteracao no banco de dados e necessaria.

