## Adicionar seção "Metodologia" ao Sistema LP

Nova seção com player de YouTube + lista de aulas + tracking de progresso por aluno, reaproveitando auth/layout existentes. Não toca em nada do que já roda.

### 1. Nova tabela `video_progress`

Migração no Lovable Cloud com:
- `user_id` (ref `auth.users`), `lesson_id` (text), `max_percent` (0-100), `started_at`, `completed_at`, `updated_at`
- UNIQUE(user_id, lesson_id)
- GRANTs para `authenticated` e `service_role`
- RLS: aluno gerencia o próprio progresso; admin lê todos (via `has_role(auth.uid(),'admin')`)
- Trigger `update_updated_at_column` em UPDATE

### 2. Arquivos copiados do projeto Metodologia (cross_project)

```text
src/data/lessons.ts                     (lista de aulas + IDs YouTube)
src/components/VideoPlayer.tsx          (YT IFrame API + tracking)
src/components/LessonList.tsx           (lista lateral c/ check/play)
src/hooks/useVideoProgress.ts           (sync com video_progress)
```

Antes de colar, ler cada arquivo do projeto origem e verificar imports — manter `@/integrations/supabase/client` e `@/contexts/AuthContext` como estão (compatíveis).

### 3. Novas páginas

- `src/pages/student/Metodologia.tsx` — clone do `Index.tsx` do projeto origem, **sem header próprio** (Layout do Sistema LP já fornece sidebar/header). Renderiza `VideoPlayer` + `LessonList` lado a lado (mobile: empilha).
- `src/pages/admin/MetodologiaProgress.tsx` — clone do `Admin.tsx` do projeto origem. Lista alunos × aulas com % assistido. Select de `profiles` usa colunas existentes (`email`, `full_name`) — já presentes neste projeto.

### 4. Rotas em `src/App.tsx`

Dentro de `<AppRoutes>`:
- `/metodologia` → `!isAdmin ? <Metodologia /> : <Navigate to="/" />`
- `/admin/metodologia` → `isAdmin ? <MetodologiaProgress /> : <Navigate to="/" />`

### 5. Link no menu (`src/components/layout/Sidebar.tsx`)

- Em `studentLinks`: adicionar `{ href: "/metodologia", label: "Metodologia", icon: PlayCircle }`
- Em `adminLinks`: adicionar `{ href: "/admin/metodologia", label: "Metodologia", icon: PlayCircle }`

### O que NÃO muda

- Nenhuma tabela existente é alterada.
- Auth, perfis, roles, sidebar atual continuam intactos — só ganham um item de menu novo.
- Projeto origem (Metodologia) continua funcionando.

### Pontos de atenção técnica

- Conferir após cópia que `useVideoProgress` referencia `video_progress` (não outro nome).
- O `Metodologia.tsx` deve remover qualquer logout/header próprio do `Index.tsx` original.
- Se `lessons.ts` exportar tipos, manter o `import type` igual no resto dos arquivos.
