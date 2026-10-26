---
name: fim-de-fase
description: Ritual de encerramento de uma fase do desafio ObraFlow - roda o check, aciona os revisores, atualiza o Status do CLAUDE.md, escreve a nota de entrevista e sugere o commit sem executá-lo. Use quando o João disser que uma fase, feature ou tela terminou.
argument-hint: <nome da fase> (ex.: "Fase 3 - services")
---

# Fim de fase: `$ARGUMENTS`

Execute na ordem. Não pule etapa; se uma falhar, pare nela e reporte.

## 1. Verificação técnica

```bash
npm run check
```

Se falhar, corrija e rode de novo antes de seguir. Não "ajuste o teste" para passar.

## 2. Revisores

- Sempre: lance o agente `revisor-arquitetura` (Agent tool, `subagent_type: revisor-arquitetura`) com o prompt "Revise o estado atual do repositório. Fase: $ARGUMENTS".
- Se a fase tocou `src/domain` ou `src/server/services`: lance também `revisor-alcada` (quando existir).
- Se a fase entregou tela: confirme que `critico-visual` já rodou na rota; se não, rode agora.

Para cada achado **Bloqueia** ou **Importante**: corrija ou explique ao João por que não vai corrigir. Achados **Detalhe** viram lista no final da resposta.

## 3. `CLAUDE.md > ## Status`

Atualize (ou crie, logo antes de "## Checklist de validações exigidas") a seção `## Status` com uma linha por fase concluída: `- [x] Fase N — o que existe agora (arquivos-chave)`. Mantenha as fases futuras como `- [ ]`. Marque no checklist de validações os itens que esta fase cumpriu.

## 4. Nota de entrevista

Acrescente ao final de `docs/entrevista.md` (crie se não existir; o arquivo é ignorado pelo git):

```
## $ARGUMENTS — <data de hoje>

**Como apresentar (5–8 linhas, primeira pessoa):**
...

**O que eu posso não saber defender:**
- ponto + resposta curta
```

Escreva no tom do João: direto, sem jargão de marketing. É o que ele vai reescrever e colar no README.

## 5. Decisões técnicas

Se a fase tomou uma decisão nova (algo que um avaliador perguntaria "por quê?"), acrescente um item numerado em `README.md > ## Decisões técnicas`. Uma decisão = um parágrafo curto com o motivo e a alternativa descartada.

## 6. Commit (sugerir, nunca executar)

Liste o que mudou (`git status --short`) e sugira os commits em blocos `bash` separados, **um comando por bloco** (o terminal do João é PowerShell 5.1, sem `&&`). Mensagens em português, imperativo, prefixo `feat:`/`test:`/`docs:`/`chore:`. Nunca rode `git commit` nem adicione `Co-Authored-By`.

## 7. Resposta final

No máximo 12 linhas: o que a fase entregou, achados dos revisores que ficaram pendentes, e a próxima fase do `docs/GUIA.md`.
