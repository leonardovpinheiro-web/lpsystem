

## Novo Layout do Curso - Video + Lista Lateral

### O que muda

O layout atual empilha tudo verticalmente: video em cima, lista de aulas embaixo. O novo layout coloca a **lista de aulas ao lado do video** em telas maiores (desktop/tablet), mantendo o layout vertical no mobile.

### Estrutura do novo layout

```text
+------------------------------------------+------------------+
|                                          |  Conteudo Curso  |
|           VIDEO / CONTEUDO               |  Modulo 1        |
|                                          |   - Aula 1 (v)   |
|                                          |   - Aula 2       |
|                                          |  Modulo 2        |
|          [Nav: Anterior | OK | Prox]     |   - Aula 3       |
+------------------------------------------+------------------+
```

No mobile, permanece vertical (video em cima, lista embaixo).

### Mudancas tecnicas

**Arquivo: `src/pages/student/CourseViewer.tsx`**

1. Envolver o bloco de conteudo (video + card de lista) em um container flex horizontal (`flex-col lg:flex-row`).
2. O video/conteudo da aula ocupa a maior parte (`lg:flex-1`).
3. A lista de aulas (card "Conteudo do Curso") fica como sidebar lateral com largura fixa (`lg:w-80 xl:w-96`) e scroll independente (`lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto`).
4. A lista de aulas muda de grid (cards em grid de 2-3 colunas) para **lista vertical simples** (1 coluna).
5. Manter responsividade: no mobile continua empilhado verticalmente.

