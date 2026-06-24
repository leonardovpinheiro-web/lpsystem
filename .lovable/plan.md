# Página de amostra pública `/demo`

Criar uma página pública (sem login) em `/demo` que renderiza a mesma prévia do treino do modal "Visualizar como aluno", em tela cheia, usando o programa "Mulher enfase em glúteos (Cópia)" como modelo fixo.

## Treino de referência
- `program_id`: `8b97d96b-c0b7-4afb-94f5-8027ee3428ab`
- Confirmado no banco (aluno `c32bbabf-83f3-4601-af73-4f3c8492029d`).
- O ID ficará como constante no arquivo da página — se um dia o programa for trocado, basta atualizar essa constante.

## Backend (acesso público)
Hoje, `training_programs`, `workouts` e `exercises` são protegidos por RLS e só admin/aluno dono podem ler. Para liberar leitura anônima **apenas deste programa**, criar uma migration que adiciona policies restritas:

- `training_programs`: `SELECT` para `anon` quando `id = '8b97d96b-...'`.
- `workouts`: `SELECT` para `anon` quando `program_id = '8b97d96b-...'`.
- `exercises`: `SELECT` para `anon` quando `workout_id IN (SELECT id FROM workouts WHERE program_id = '8b97d96b-...')`.
- `GRANT SELECT` em cada uma dessas tabelas para `anon`.

As policies existentes para admin/aluno permanecem intactas. Nenhum outro programa, treino ou exercício fica exposto.

## Frontend

**Novo arquivo** `src/pages/Demo.tsx`
- Layout em tela cheia com um header simples (logo/título "Sistema LP — amostra de treino", subtítulo curto, CTA opcional "Conhecer a plataforma").
- Reaproveita os componentes já existentes da prévia:
  - `ProgramPreview` para a lista de treinos.
  - `ActiveWorkoutPreview` para a tela de "Iniciar Treino".
- Estado local `view: "program" | "workout"` + `activeWorkoutId`, idêntico ao `StudentPreviewModal`, mas sem `Dialog` — renderiza direto na página.
- Fetch do programa via `supabase.from("training_programs").select(... workouts(... exercises(...)))` filtrando pelo `program_id` constante.
- Estados de loading e erro inline (sem modal).

**Edição** `src/App.tsx`
- Adicionar a rota pública `/demo` apontando para `Demo`, fora de qualquer guard de autenticação.

## Comportamento
- Totalmente read-only, igual ao modal atual: inputs desabilitados, histórico mostra `—`, sem "Finalizar Treino" funcional.
- Funciona com usuário deslogado.
- URL final: `https://lpsystem.lovable.app/demo`.

## Fora do escopo
- Não há tracking/analytics de visitas.
- Não há captura de leads no próprio /demo (pode ser adicionada depois).
- Não altera o modal existente no editor admin.
