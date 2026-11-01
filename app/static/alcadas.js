const seletorObra = document.querySelector("#obra");
const areaFaixas = document.querySelector("#faixas");
const mensagem = document.querySelector("#mensagem");
const botaoSalvar = document.querySelector("#salvar-alcadas");
const botaoAdicionarFaixa = document.querySelector("#adicionar-faixa");
const botaoTentar = document.querySelector("#tentar-alcadas");

let regrasAtuais = null;
let usuariosDisponiveis = [];

function centavosParaEntrada(centavos) {
    const valor = BigInt(centavos);
    return `${valor / 100n},${String(valor % 100n).padStart(2, "0")}`;
}

function entradaParaCentavos(entrada) {
    if (entrada === null) return null;
    if (typeof entrada === "number") return entrada;

    const texto = entrada.trim().replace(",", ".");
    if (texto === "") return null;

    if (!/^\d+(\.\d{1,2})?$/.test(texto)) {
        throw new Error("Digite o limite em reais, por exemplo: 10000,00.");
    }

    const [reais, centavos = ""] = texto.split(".");
    const total = BigInt(reais) * 100n + BigInt(centavos.padEnd(2, "0"));

    if (total > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error("O limite informado é muito alto.");
    }

    return Number(total);
}
function criarBotao(texto, descricao, acao, desabilitado = false) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.textContent = texto;
    botao.setAttribute("aria-label", descricao);
    botao.disabled = desabilitado;
    botao.addEventListener("click", acao);
    return botao;
}

function renderizarAprovadores(faixa, lista) {
    lista.replaceChildren();

    faixa.aprovadores.forEach((idUsuario, indice) => {
        const linha = document.createElement("li");
        linha.className = "aprovador-linha";

        const etapa = document.createElement("span");
        etapa.textContent = `Etapa ${indice + 1}`;

        const seletor = document.createElement("select");
        seletor.setAttribute("aria-label", `Aprovador da etapa ${indice + 1}`);

        const escolha = document.createElement("option");
        escolha.value = "";
        escolha.textContent = "Selecione um aprovador";
        seletor.append(escolha);

        for (const usuario of usuariosDisponiveis) {
            const opcao = document.createElement("option");
            opcao.value = usuario.id_usuario;
            opcao.textContent = usuario.nome_usuario;
            seletor.append(opcao);
        }

        seletor.value = idUsuario === null ? "" : String(idUsuario);
        seletor.addEventListener("change", () => {
            faixa.aprovadores[indice] =
                seletor.value === "" ? null : Number(seletor.value);
        });

        const subir = criarBotao("↑", "Subir aprovador", () => {
            [faixa.aprovadores[indice - 1], faixa.aprovadores[indice]] =
                [faixa.aprovadores[indice], faixa.aprovadores[indice - 1]];
            renderizarAprovadores(faixa, lista);
        }, indice === 0);

        const descer = criarBotao("↓", "Descer aprovador", () => {
            [faixa.aprovadores[indice], faixa.aprovadores[indice + 1]] =
                [faixa.aprovadores[indice + 1], faixa.aprovadores[indice]];
            renderizarAprovadores(faixa, lista);
        }, indice === faixa.aprovadores.length - 1);

        const remover = criarBotao("Remover", "Remover aprovador", () => {
            faixa.aprovadores.splice(indice, 1);
            renderizarAprovadores(faixa, lista);
        });

        linha.append(etapa, seletor, subir, descer, remover);
        lista.append(linha);
    });
}

function renderizarFaixas() {
    areaFaixas.replaceChildren();

    if (!regrasAtuais) return;

    if (regrasAtuais.faixas.length === 0) {
        const aviso = document.createElement("p");
        aviso.textContent = "Esta obra ainda não possui faixas. Adicione a primeira.";
        areaFaixas.append(aviso);
        return;
    }

    for (const [indice, faixa] of regrasAtuais.faixas.entries()) {
        const cartao = document.createElement("article");
        cartao.className = "faixa-card";

        const cabecalho = document.createElement("div");
        cabecalho.className = "faixa-cabecalho";

        const titulo = document.createElement("h2");
        titulo.textContent = `Faixa ${indice + 1}`;

        const removerFaixa = criarBotao("Remover faixa", "Remover faixa", () => {
            regrasAtuais.faixas.splice(indice, 1);
            renderizarFaixas();
        });
        removerFaixa.className = "remover-faixa";
        cabecalho.append(titulo, removerFaixa);

        const rotulo = document.createElement("label");
        rotulo.textContent = "Limite máximo (R$)";

        const campo = document.createElement("input");
        campo.type = "text";
        campo.inputMode = "decimal";
        campo.placeholder = indice === regrasAtuais.faixas.length - 1
            ? "Sem teto"
            : "Ex.: 10000,00";

        // Uma faixa já editada guarda texto; uma recém-carregada guarda centavos.
        campo.value = typeof faixa.limite_superior_centavos === "string"
            ? faixa.limite_superior_centavos
            : faixa.limite_superior_centavos === null
                ? ""
                : centavosParaEntrada(faixa.limite_superior_centavos);

        campo.addEventListener("input", () => {
            faixa.limite_superior_centavos = campo.value;
        });
        rotulo.append(campo);

        const ajuda = document.createElement("p");
        ajuda.textContent = indice === regrasAtuais.faixas.length - 1
            ? "Pode ficar vazio: esta faixa valerá para valores acima das anteriores."
            : indice === 0
                ? "Pedidos até este valor usam os aprovadores desta faixa."
                : "Informe um valor maior que o limite da faixa anterior.";

        const lista = document.createElement("ol");
        lista.className = "aprovadores-editor";
        renderizarAprovadores(faixa, lista);

        const adicionarAprovador = criarBotao(
            "+ Aprovador",
            "Adicionar aprovador",
            () => {
                faixa.aprovadores.push(null);
                renderizarAprovadores(faixa, lista);
            }
        );

        cartao.append(cabecalho, rotulo, ajuda, lista, adicionarAprovador);
        areaFaixas.append(cartao);
    }
}

async function carregarAlcadas() {
    const idObra = seletorObra.value;
    areaFaixas.replaceChildren();
    mensagem.textContent = "";
    mensagem.className = "";
    regrasAtuais = null;
    botaoSalvar.disabled = true;
    botaoAdicionarFaixa.disabled = true;
    botaoTentar.hidden = true;

    if (!idObra) return;

    mensagem.textContent = "Carregando regras...";

    try {
        const [respostaRegras, respostaUsuarios] = await Promise.all([
            fetch(`/api/obras/${idObra}/alcadas`),
            fetch("/api/usuarios"),
        ]);

        if (!respostaRegras.ok || !respostaUsuarios.ok) {
            throw new Error("Não foi possível consultar as regras.");
        }

        const regras = await respostaRegras.json();
        const usuarios = await respostaUsuarios.json();

        if (seletorObra.value !== idObra) return;

        regrasAtuais = regras;
        usuariosDisponiveis = usuarios;

        mensagem.textContent = "";
        renderizarFaixas();
        botaoAdicionarFaixa.disabled = false;
        botaoSalvar.disabled = false;
    } catch (erro) {
        if (seletorObra.value === idObra) {
            mensagem.textContent = erro.message;
            mensagem.className = "erro";
            botaoTentar.hidden = false;
        }
    }
}

async function salvarAlcadas() {
    const idObra = seletorObra.value;
    if (!idObra || !regrasAtuais) return;

    try {
        let limiteAnterior = -1;

        const faixas = regrasAtuais.faixas.map((faixa, indice) => {
            const limite = entradaParaCentavos(faixa.limite_superior_centavos);

            if (limite === null && indice !== regrasAtuais.faixas.length - 1) {
                throw new Error("Somente a última faixa pode ficar sem teto.");
            }

            if (limite !== null && limite <= limiteAnterior) {
                throw new Error("Os limites precisam aumentar de uma faixa para a próxima.");
            }

            if (limite !== null) limiteAnterior = limite;

            if (faixa.aprovadores.length === 0 ||
                faixa.aprovadores.some((id) => id === null)) {
                throw new Error(`Escolha ao menos um aprovador na faixa ${indice + 1}.`);
            }

            if (new Set(faixa.aprovadores).size !== faixa.aprovadores.length) {
                throw new Error(`Há um aprovador repetido na faixa ${indice + 1}.`);
            }

            return {
                limite_superior_centavos: limite,
                aprovadores: faixa.aprovadores,
            };
        });
        if (faixas.length === 0 &&
            !window.confirm("Remover todas as faixas? Novos pedidos desta obra ficarão sem regra de aprovação.")) {
            return;
        }

        botaoSalvar.disabled = true;
        mensagem.textContent = "Salvando...";
        mensagem.className = "";

        const resposta = await fetch(`/api/obras/${idObra}/alcadas`, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({faixas}),
        });

        if (!resposta.ok) {
            const erro = await resposta.json();
            throw new Error(
                typeof erro.detail === "string"
                    ? erro.detail
                    : "Confira os limites das faixas."
            );
        }

        if (seletorObra.value === idObra) {
            await carregarAlcadas();
            mensagem.textContent = "Regras salvas com sucesso.";
            mensagem.className = "sucesso";
        }
    } catch (erro) {
        mensagem.textContent = erro.message;
        mensagem.className = "erro";
    } finally {
        if (seletorObra.value === idObra && regrasAtuais) {
            botaoSalvar.disabled = false;
        }
    }
}
botaoAdicionarFaixa.addEventListener("click", () => {
    if (!regrasAtuais) return;

    const novaFaixa = {
        limite_superior_centavos: null,
        aprovadores: [null],
    };

    const ultima = regrasAtuais.faixas.at(-1);
    const ultimaSemTeto = ultima &&
        (ultima.limite_superior_centavos === null ||
         ultima.limite_superior_centavos === "");

    if (ultimaSemTeto) {
        // A nova faixa entra antes da faixa final, que continua sem teto.
        regrasAtuais.faixas.splice(-1, 0, novaFaixa);
    } else {
        regrasAtuais.faixas.push(novaFaixa);
    }

    renderizarFaixas();
});
seletorObra.addEventListener("change", carregarAlcadas);
botaoSalvar.addEventListener("click", salvarAlcadas);
botaoTentar.addEventListener("click", carregarAlcadas);