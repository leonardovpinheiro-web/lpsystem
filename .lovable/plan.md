
# Plano: Reordenação de Exercícios com Drag and Drop

## Objetivo
Implementar a funcionalidade de arrastar e soltar (drag and drop) para reordenar exercícios dentro de um treino, substituindo os botões de seta atuais.

## O que será feito

### Interface do Usuário
- Adicionar um ícone de "alça de arraste" (GripVertical) na primeira coluna de cada exercício
- O cursor mudará para indicar que o item pode ser arrastado
- Durante o arraste, o exercício terá opacidade reduzida como feedback visual
- Os botões de seta (subir/descer) serão removidos

### Comportamento
- Ao arrastar um exercício sobre outro, eles trocarão de posição
- A nova ordem será salva automaticamente no banco de dados
- Em caso de erro, a interface voltará ao estado anterior

## Detalhes Técnicos

### Arquivo: `src/components/admin/ExerciseTable.tsx`

1. **Adicionar estado para rastrear o exercício sendo arrastado:**
   - Novo estado `draggedExerciseId`

2. **Implementar handlers de drag and drop:**
   - `handleDragStart`: marca o exercício como sendo arrastado
   - `handleDragOver`: permite o drop no elemento
   - `handleDrop`: reordena os exercícios e salva no banco
   - `handleDragEnd`: limpa o estado ao finalizar

3. **Atualizar a tabela:**
   - Adicionar propriedades de drag na linha `<tr>` de cada exercício
   - Adicionar coluna com ícone `GripVertical` como alça de arraste
   - Aplicar classe de opacidade reduzida no item sendo arrastado
   - Remover os botões ArrowUp e ArrowDown da coluna de ações

4. **Lógica de reordenação:**
   - Criar novo array com a ordem atualizada
   - Atribuir novos valores de `order_index` sequenciais
   - Salvar todas as alterações em paralelo no banco de dados
   - Reverter em caso de erro

### Padrão Seguido
A implementação seguirá exatamente o mesmo padrão já utilizado para reordenação de treinos no `WorkoutEditor.tsx`, garantindo consistência na experiência do usuário.
