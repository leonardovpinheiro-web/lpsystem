

# Plano: Seção "Dieta" com Upload de PDF

## Resumo

Criar uma nova seção "Dieta" no menu lateral para alunos, onde poderão acessar seu plano alimentar em PDF. O admin terá a capacidade de fazer upload e gerenciar os arquivos de dieta de cada aluno.

---

## O que será feito

### Para o Aluno
- Nova opção "Dieta" no menu lateral (entre Logbook e Guia de treino)
- Página simples com o texto "Acesse sua dieta abaixo:"
- Botão "Acessar dieta" que abre o PDF em nova aba
- Mensagem amigável quando não houver dieta cadastrada

### Para o Admin
- No dialog de edição do aluno, nova seção para upload de PDF
- Possibilidade de visualizar a dieta atual ou fazer upload de uma nova
- Botão para remover a dieta existente

---

## Fluxo Visual

```text
┌─────────────────────────────────────────────────────────────┐
│                     ALUNO - Página Dieta                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                   Minha Dieta                               │
│                   Seu plano alimentar                       │
│                                                             │
│   ┌───────────────────────────────────────────────────┐     │
│   │                                                   │     │
│   │        🍎 Acesse sua dieta abaixo:                │     │
│   │                                                   │     │
│   │           [ Acessar dieta ]                       │     │
│   │                                                   │     │
│   └───────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 ADMIN - Dialog Editar Aluno                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Nome: [João Silva]                                        │
│   Email: [joao@email.com]                                   │
│   Status: [Ativo ▼]                                         │
│   Observações: [____________]                               │
│                                                             │
│   ─────────────────────────────────────────────             │
│   Dieta do Aluno                                            │
│                                                             │
│   [ dieta_joao.pdf ]  [ Ver ]  [ Remover ]                  │
│                                                             │
│   ou                                                        │
│                                                             │
│   [ Escolher arquivo PDF... ]                               │
│                                                             │
│                       [ Cancelar ]  [ Salvar ]              │
└─────────────────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### 1. Banco de Dados

**Adicionar coluna na tabela `students`:**
- `diet_url` (TEXT, nullable) - URL pública do PDF no storage

### 2. Storage

**Criar bucket `diets`:**
- Bucket público para PDFs
- Política: Admin pode fazer upload/delete, qualquer autenticado pode ler

### 3. Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/student/Diet.tsx` | Criar - Página da dieta do aluno |
| `src/components/layout/Sidebar.tsx` | Modificar - Adicionar link "Dieta" |
| `src/pages/admin/Students.tsx` | Modificar - Adicionar upload de PDF no dialog |
| `src/App.tsx` | Modificar - Adicionar rota /diet |

### 4. Políticas RLS

- Storage: Admin pode inserir/deletar, usuários autenticados podem visualizar
- Coluna diet_url: Mesmas políticas da tabela students

---

## Ordem de Implementação

1. Criar bucket de storage e políticas
2. Adicionar coluna `diet_url` na tabela students
3. Criar página `Diet.tsx` para o aluno
4. Adicionar rota no `App.tsx`
5. Adicionar link no menu lateral `Sidebar.tsx`
6. Modificar dialog de edição em `Students.tsx` para upload

