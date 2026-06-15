## Adicionar botão "Copiar treino" em Meus Treinos

### Onde
`src/pages/student/MyWorkouts.tsx` — no header da página, ao lado do título "Meus Treinos".

### Comportamento
- Botão `Copiar treino` (ícone `Copy` do lucide-react) visível só quando há programa carregado.
- Ao clicar: gera o texto formatado de todos os treinos do programa ativo, copia para o clipboard via `navigator.clipboard.writeText`, e exibe um toast "Treinos copiados!" (usar `useToast` já presente no projeto).
- Em caso de falha, toast destrutivo.

### Formato gerado
Para cada workout, na ordem:

```
<Nome do treino>
<Exercício> <sets>x<reps> [técnica] [descanso]s

<Exercício> <sets>x<reps> [técnica] [descanso]s
```

Regras:
- Linha em branco entre cada exercício.
- Campos vazios (técnica, descanso) **omitidos** — sem traço.
- Descanso renderizado como `<valor>s` (ex: `60s`); se já contiver "s", usar como está.
- Entre treinos diferentes: **duas linhas em branco**.

### Exemplo de saída
```
Peito/ombro
Supino inclinado 3x12-15 0RIR 60s

Tríceps francês 3x12-15 0RIR 60s


Costas
Puxada 4x10 60s
```

### Layout do header
Alterar o `<div>` do título para um flex (`flex items-start justify-between gap-3`) com o título à esquerda e o botão à direita. Em mobile empilha (`flex-col sm:flex-row`).