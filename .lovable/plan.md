## Mudanças

Toda a implementação fica em `src/pages/admin/Library.tsx`. O campo `is_active` já existe em `training_programs`, o toggle ativar/desativar já está em `StudentWorkouts` (admin) e as telas do aluno (`MyWorkouts`, `Logbook`) já filtram por `is_active = true`, então um programa inativo já fica invisível para o aluno automaticamente.

### 1. Clonar como inativo
Em `handleCloneToStudent`, ao inserir o novo `training_programs` para o aluno, incluir `is_active: false` (default da coluna é `true`, então precisa ser explícito). Assim o aluno não vê o treino enquanto o admin ajusta.

### 2. Botão "Ir para treino do aluno" após clonar
- Adicionar estado `clonedInfo: { studentId: string; programName: string } | null`.
- Em vez de fechar o dialog no fim de `handleCloneToStudent`, setar `clonedInfo` com o `selectedStudent` (que já é o `students.id`) e o nome.
- No `Dialog` de clonagem, quando `clonedInfo` estiver preenchido, trocar o conteúdo por uma tela de sucesso com:
  - mensagem "Treino clonado como **inativo** para {nome}. Ative quando estiver pronto."
  - botão **"Ir para treinos do aluno"** que faz `navigate('/students/{studentId}/workouts')` (rota já existente, usa `useNavigate` do `react-router-dom`).
  - botão secundário "Fechar" que reseta `clonedInfo` e fecha o dialog.
- Ao reabrir o dialog para outro programa, resetar `clonedInfo`.

### Observações
- Nenhuma migração de banco é necessária.
- O toggle Ativo/Inativo na página `StudentWorkouts` continua sendo o ponto onde o admin libera o treino depois.
- O comportamento de "Duplicar" (template para template) não muda.
