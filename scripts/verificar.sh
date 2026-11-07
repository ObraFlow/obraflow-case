#!/usr/bin/env bash
#
# Prova por curl das quatro recusas que sustentam o serviço de aprovações.
#
# Cada bloco abaixo diz, antes de rodar, o que está sendo provado — e imprime o status HTTP e o
# código de erro de cada chamada. O script sai com 0 somente quando **todos** os status
# esperados aconteceram; qualquer divergência sai com 1 e nomeia o bloco.
#
# Uso:
#   npm run dev            # num terminal
#   npm run seed           # com o servidor no ar ou não, tanto faz
#   ./scripts/verificar.sh # noutro terminal
#
# Variáveis:
#   BASE   URL do servidor (padrão http://localhost:3000)
#
# O script é repetível: as duas provas que escrevem no banco (a corrida e a submissão sem regra)
# criam os seus próprios pedidos em vez de consumir os do seed. A submissão sem regra apaga o
# rascunho que criou; a corrida deixa o pedido dela no banco, porque pedido submetido é imutável
# e não há como apagá-lo — `npm run seed` devolve o banco ao estado da demonstração.

set -uo pipefail

BASE="${BASE:-http://localhost:3000}"

# Ids do seed (prisma/seed.ts). São literais, e é por isso que este script pode citá-los.
MARINA=cseedusuariomarina0001
AMANDA=cseedusuarioamanda0002
JOAO=cseedusuariojoao00003
CAIO=cseedusuariocaio00004
OBRA_AURORA=cseedobraaurora000001
OBRA_GALPAO=cseedobragalpao000002
FAIXA_AURORA_10K=cseedfaixaauroraate10k01
FORNECEDOR=cseedfornecedorcimento01
PEDIDO_PENDENTE_1A_ETAPA=1003

falhas=0
verde=$'\033[32m'; vermelho=$'\033[31m'; cinza=$'\033[90m'; forte=$'\033[1m'; zero=$'\033[0m'
if [ ! -t 1 ]; then verde=''; vermelho=''; cinza=''; forte=''; zero=''; fi

# Extrai um campo de um JSON vindo do stdin. `node` e não `jq`: o projeto já exige Node, e
# exigir jq faria o script falhar na máquina de quem só seguiu o README.
campo() {
  node -e '
    let s = ""
    process.stdin.on("data", (d) => (s += d)).on("end", () => {
      try {
        const alvo = process.argv[1].split(".").reduce((o, k) => (o == null ? o : o[k]), JSON.parse(s))
        console.log(alvo === undefined || alvo === null ? "" : alvo)
      } catch { console.log("") }
    })' "$1"
}

# Faz a chamada e devolve "<status>\n<corpo>". O status sai do próprio curl, nunca do corpo.
chamar() {
  local metodo="$1" caminho="$2" usuario="${3:-}" corpo="${4:-}"
  local args=(-s -w '\n%{http_code}' -X "$metodo" "$BASE$caminho")
  [ -n "$usuario" ] && args+=(-H "Cookie: obraflow_sessao=$usuario")
  [ -n "$corpo" ] && args+=(-H 'Content-Type: application/json' -d "$corpo")
  curl "${args[@]}"
}

status_de() { printf '%s' "$1" | tail -n1; }
corpo_de() { printf '%s' "$1" | sed '$d'; }

# Confere status e, quando informado, o código do envelope `{ error: { code } }`.
conferir() {
  local rotulo="$1" resposta="$2" esperado="$3" codigo_esperado="${4:-}"
  local status codigo texto
  status=$(status_de "$resposta")
  codigo=$(corpo_de "$resposta" | campo error.code)
  texto="HTTP $status"
  [ -n "$codigo" ] && texto="$texto $codigo"

  if [ "$status" = "$esperado" ] && { [ -z "$codigo_esperado" ] || [ "$codigo" = "$codigo_esperado" ]; }; then
    printf '  %s✔%s %s %s\n' "$verde" "$zero" "$(rotulo_alinhado "$rotulo")" "$texto"
  else
    local alvo="HTTP $esperado"
    [ -n "$codigo_esperado" ] && alvo="$alvo $codigo_esperado"
    printf '  %s✘%s %s %s %s(esperado %s)%s\n' "$vermelho" "$zero" "$(rotulo_alinhado "$rotulo")" "$texto" "$cinza" "$alvo" "$zero"
    falhas=$((falhas + 1))
  fi
}

afirmar() {
  local rotulo="$1" obtido="$2" esperado="$3"
  if [ "$obtido" = "$esperado" ]; then
    printf '  %s✔%s %s %s\n' "$verde" "$zero" "$(rotulo_alinhado "$rotulo")" "$obtido"
  else
    printf '  %s✘%s %s %s %s(esperado %s)%s\n' "$vermelho" "$zero" "$(rotulo_alinhado "$rotulo")" "$obtido" "$cinza" "$esperado" "$zero"
    falhas=$((falhas + 1))
  fi
}

# `${#texto}` conta caracteres, não bytes: sem isto, cada acento desalinharia a coluna do status.
rotulo_alinhado() {
  local vago=$((60 - ${#1}))
  printf '%s%*s' "$1" "$(( vago > 1 ? vago : 1 ))" ''
}

bloco() { printf '\n%s%s%s\n' "$forte" "$1" "$zero"; printf '%s%s%s\n' "$cinza" "$2" "$zero"; }

# ─────────────────────────────────────────────────────────────────────────────────────────────
# Pré-condições. Falhar aqui, cedo e com instrução, é melhor do que quatro blocos vermelhos
# dizendo "connection refused".
# ─────────────────────────────────────────────────────────────────────────────────────────────
printf '%sObraFlow · verificação por curl%s  %s(%s)%s\n' "$forte" "$zero" "$cinza" "$BASE" "$zero"

if ! curl -s -o /dev/null --max-time 5 "$BASE/api/usuarios"; then
  printf '\n%sO servidor não respondeu em %s.%s\n' "$vermelho" "$BASE" "$zero"
  printf 'Suba-o com `npm run dev` noutro terminal e rode este script de novo.\n'
  exit 1
fi

semeado=$(chamar GET "/api/pedidos/$PEDIDO_PENDENTE_1A_ETAPA" "$AMANDA")
if [ "$(status_de "$semeado")" != "200" ]; then
  printf '\n%sO banco não está semeado: o pedido #%s do seed não existe.%s\n' \
    "$vermelho" "$PEDIDO_PENDENTE_1A_ETAPA" "$zero"
  printf 'Rode `npm run seed` e tente de novo.\n'
  exit 1
fi
# Não basta o pedido existir: o bloco 1 depende de ele estar pendente **na primeira etapa**.
# Um banco onde alguém já aprovou por fora daria um 409 pelo motivo errado, e o script estaria
# provando outra coisa sem dizer.
if [ "$(corpo_de "$semeado" | campo situacao)" != "pendente" ] ||
   [ "$(corpo_de "$semeado" | campo cadeia.0.situacao)" != "pendente" ]; then
  printf '\n%sO pedido #%s saiu do estado do seed: ele precisa estar pendente na 1ª etapa.%s\n' \
    "$vermelho" "$PEDIDO_PENDENTE_1A_ETAPA" "$zero"
  printf 'Rode `npm run seed` para devolvê-lo à demonstração e tente de novo.\n'
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────────────────────
bloco "1 · Decisão fora de ordem é recusada pelo servidor" \
"O pedido #$PEDIDO_PENDENTE_1A_ETAPA está pendente na 1ª etapa, que é de Amanda. João é a 2ª etapa.
Prova que a ordem da alçada é imposta no servidor e não só no botão da tela: João decidindo
antes da Amanda recebe 409 NAO_E_SUA_VEZ (PRD G5, ADR 0004)."
# ─────────────────────────────────────────────────────────────────────────────────────────────
conferir "João (2ª etapa) tenta aprovar antes da Amanda" \
  "$(chamar POST "/api/pedidos/$PEDIDO_PENDENTE_1A_ETAPA/decisoes" "$JOAO" '{"tipo":"aprovar"}')" \
  409 NAO_E_SUA_VEZ

conferir "Amanda (1ª etapa) continua podendo ler o pedido" \
  "$(chamar GET "/api/pedidos/$PEDIDO_PENDENTE_1A_ETAPA" "$AMANDA")" 200

# ─────────────────────────────────────────────────────────────────────────────────────────────
bloco "2 · Papel é imposto no servidor, não escondido no menu" \
"Gerir alçada é ação exclusiva do admin. Prova que o aprovador que digita a URL da tela 3 — ou
que chama a rota por curl — é recusado pela API com 403 SEM_PERMISSAO, e que a mesma chamada
como Marina (admin) passa (PRD G10)."
# ─────────────────────────────────────────────────────────────────────────────────────────────
faixa_valida='{"limiteCentavos":1000000,"aprovadores":["'"$AMANDA"'"]}'
conferir "Amanda (aprovador) tenta PUT /api/faixas/{id}" \
  "$(chamar PUT "/api/faixas/$FAIXA_AURORA_10K" "$AMANDA" "$faixa_valida")" 403 SEM_PERMISSAO
conferir "Sem sessão nenhuma, a mesma rota" \
  "$(chamar PUT "/api/faixas/$FAIXA_AURORA_10K" "" "$faixa_valida")" 403 SEM_PERMISSAO
conferir "Marina (admin) faz a mesma chamada" \
  "$(chamar PUT "/api/faixas/$FAIXA_AURORA_10K" "$MARINA" "$faixa_valida")" 200

# ─────────────────────────────────────────────────────────────────────────────────────────────
bloco "3 · Valor sem faixa aplicável bloqueia a submissão e preserva o rascunho" \
"A obra Galpão Logístico Norte tem faixa só até R\$ 5.000,00 e nenhuma faixa aberta. Prova que
um pedido acima do teto recebe 422 SEM_REGRA_APLICAVEL na submissão — e que o rascunho
continua existindo para ser corrigido, em vez de desaparecer (PRD G8)."
# ─────────────────────────────────────────────────────────────────────────────────────────────
acima_do_teto='{"obraId":"'"$OBRA_GALPAO"'","fornecedorId":"'"$FORNECEDOR"'","dataPedido":"2026-10-31",
  "observacoes":"Pedido acima do teto da obra, criado pelo scripts/verificar.sh.",
  "itens":[{"descricao":"Portão de enrolar automático","quantidade":"1","unidade":"un","precoUnitario":"9.800,00"}]}'
criado=$(chamar POST /api/pedidos "$CAIO" "$acima_do_teto")
conferir "Caio cria o rascunho de R\$ 9.800,00 no Galpão" "$criado" 201
sem_regra=$(corpo_de "$criado" | campo id)

if [ -n "$sem_regra" ]; then
  conferir "Caio submete — R\$ 9.800,00 acima do teto de R\$ 5.000,00" \
    "$(chamar POST "/api/pedidos/$sem_regra/submissao" "$CAIO")" 422 SEM_REGRA_APLICAVEL
  depois=$(chamar GET "/api/pedidos/$sem_regra" "$CAIO")
  afirmar "O rascunho sobreviveu à recusa" "$(corpo_de "$depois" | campo situacao)" "rascunho"
  # Limpeza: o rascunho era do script, não da demonstração. Pedido submetido é imutável e não
  # teria como ser apagado — este nunca chegou a ser submetido, e por isso pode.
  chamar DELETE "/api/pedidos/$sem_regra" "$CAIO" > /dev/null
fi

# ─────────────────────────────────────────────────────────────────────────────────────────────
bloco "4 · Duas decisões simultâneas produzem uma só decisão" \
"Dois POST disparados em paralelo sobre a MESMA etapa, pela MESMA pessoa. Prova o UPDATE
condicional do ADR 0004: exatamente um 200 e um 409, e a cadeia fica com uma única etapa
decidida — nunca duas (PRD G7). O pedido da corrida é criado aqui para o script ser repetível."
# ─────────────────────────────────────────────────────────────────────────────────────────────
corrida_corpo='{"obraId":"'"$OBRA_AURORA"'","fornecedorId":"'"$FORNECEDOR"'","dataPedido":"2026-10-31",
  "observacoes":"Pedido da corrida de decisão, criado pelo scripts/verificar.sh.",
  "itens":[{"descricao":"Cimento CP-II 50 kg","quantidade":"400","unidade":"sc","precoUnitario":"42,90"}]}'
criado=$(chamar POST /api/pedidos "$CAIO" "$corrida_corpo")
conferir "Caio cria o rascunho de R\$ 17.160,00 na Aurora" "$criado" 201
corrida=$(corpo_de "$criado" | campo id)

if [ -n "$corrida" ]; then
  submetido=$(chamar POST "/api/pedidos/$corrida/submissao" "$CAIO")
  conferir "Caio submete — cai na faixa aberta, cadeia Amanda → João" "$submetido" 200

  saida=$(mktemp -d)
  # `&` e `wait`, não duas chamadas em sequência: o que se quer provar é que as duas atravessam
  # a validação com o mesmo estado em mãos, e que só uma escreve.
  chamar POST "/api/pedidos/$corrida/decisoes" "$AMANDA" '{"tipo":"aprovar"}' > "$saida/a" &
  chamar POST "/api/pedidos/$corrida/decisoes" "$AMANDA" '{"tipo":"aprovar"}' > "$saida/b" &
  wait

  um=$(status_de "$(cat "$saida/a")"); dois=$(status_de "$(cat "$saida/b")")
  printf '  %srequisição 1: HTTP %s · requisição 2: HTTP %s%s\n' "$cinza" "$um" "$dois" "$zero"
  afirmar "Os dois status, ordenados" "$(printf '%s\n%s\n' "$um" "$dois" | sort | tr '\n' ' ' | sed 's/ $//')" "200 409"

  # A contagem no banco é a outra metade da prova: um 200 e um 409 com duas linhas decididas
  # seria o mesmo defeito, silencioso.
  decididas=$(chamar GET "/api/pedidos/$corrida" "$AMANDA" | node -e '
    let s = ""
    process.stdin.on("data", (d) => (s += d)).on("end", () => {
      const cadeia = JSON.parse(s.split("\n").slice(0, -1).join("\n")).cadeia || []
      console.log(cadeia.filter((e) => e.situacao !== "pendente").length)
    })')
  afirmar "Etapas decididas no banco" "$decididas" "1"
  rm -rf "$saida"
  printf '  %spedido #%s criado por este script; `npm run seed` devolve o banco à demonstração%s\n' \
    "$cinza" "$corrida" "$zero"
fi

# ─────────────────────────────────────────────────────────────────────────────────────────────
printf '\n'
if [ "$falhas" -eq 0 ]; then
  printf '%sTodos os status esperados ocorreram.%s\n' "$verde" "$zero"
  exit 0
fi
printf '%s%s verificação(ões) fora do esperado.%s\n' "$vermelho" "$falhas" "$zero"
exit 1
