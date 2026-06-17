
# Onboarding obrigatório via Metodologia

Novo aluno só acessa as outras áreas do sistema depois de assistir pelo menos 75% de cada vídeo da Metodologia. Uma vez liberado, fica liberado para sempre.

## Comportamento

- Login do aluno → vai direto para `/metodologia`.
- Enquanto bloqueado:
  - Menu lateral mostra apenas **Metodologia** e **Sair**.
  - Qualquer URL diferente de `/metodologia` redireciona para `/metodologia`.
  - Aparece um aviso no topo da página de Metodologia: "Assista pelo menos 75% de cada aula para liberar o restante da plataforma" + barra de progresso (X de Y aulas concluídas).
- Quando o aluno atinge 75% na última aula pendente:
  - Sistema marca `onboarding_completed_at` no perfil (permanente).
  - Aviso vira mensagem de sucesso ("Plataforma liberada!") com botão para ir aos treinos.
  - Menu volta ao normal no próximo render.
- Admin nunca é afetado (continua entrando no Dashboard).
- Alunos antigos que já tinham acesso: rodamos um backfill marcando todos os alunos existentes como já liberados, para não bloquear quem já estava usando.

## Detalhes técnicos

1. **Migração**
   - Adicionar coluna `onboarding_completed_at TIMESTAMPTZ NULL` em `public.profiles`.
   - Backfill: `UPDATE profiles SET onboarding_completed_at = now() WHERE onboarding_completed_at IS NULL` (todos os perfis atuais já estão liberados).
   - Sem mudança em RLS — a coluna é lida via o select que o cliente já faz no profile.

2. **AuthContext (`src/contexts/AuthContext.tsx`)**
   - Ao carregar o perfil, expor `onboardingCompleted: boolean` (derivado de `onboarding_completed_at != null`).
   - Função `markOnboardingComplete()` que faz `update profiles set onboarding_completed_at = now()` para o `user.id` e atualiza estado local.

3. **Hook `useUserProgress`** já tem `progress`. Adicionar derivado `allLessonsWatched` = `lessons.every(l => (progress[l.id]?.max_percent ?? 0) >= 75)`.

4. **Página `Metodologia.tsx`**
   - Se `!isAdmin && !onboardingCompleted`: mostrar banner com contagem `X / Y aulas (≥75%)` e barra de progresso.
   - `useEffect`: quando `allLessonsWatched && !onboardingCompleted`, chamar `markOnboardingComplete()` e mostrar toast/banner de sucesso com CTA "Ir para meus treinos".
   - Limite de 75% (não 90%) — desacoplado do critério "completed" do tracking.

5. **Gate de rotas (`src/App.tsx`)**
   - Novo wrapper `OnboardingGate` dentro de `ProtectedRoute` para alunos:
     - Se `!isAdmin && !onboardingCompleted` e `location.pathname !== '/metodologia'` → `<Navigate to="/metodologia" replace />`.
   - Aplicado em todas as rotas de aluno (`/`, `/logbook`, `/diet`, `/workout/:id`, `/guides`, `/platform`, `/platform/course/:id`).

6. **Sidebar (`src/components/layout/Sidebar.tsx`)**
   - Quando `!isAdmin && !onboardingCompleted`, `studentLinks` vira apenas `[{ Metodologia }]`. Resto do menu fica oculto. Botão Sair permanece (já está fora da lista).

## Fora de escopo

- Não alteramos a lógica de tracking existente (continua salvando `max_percent` normalmente; só adicionamos uma leitura derivada).
- Não tocamos admin nem rotas `/admin/*`.
- Sem novas tabelas, edge functions ou e-mails.
