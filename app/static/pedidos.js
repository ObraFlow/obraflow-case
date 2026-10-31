const lista = document.querySelector("#lista-pedidos");
const estado = document.querySelector("#estado-lista");
const modelo = document.querySelector("#modelo-pedido");
const tentarLista = document.querySelector("#tentar-lista");

function formatarMoeda(centavos) {
    const valor = BigInt(centavos);
    const reais = valor / 100n;
    const fracao = String(valor % 100n).padStart(2, "0");
    return `R$ ${new Intl.NumberFormat("pt-BR").format(reais)},${fracao}`;
}

function formatarData(data) {
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
}

async function carregarPedidos() {
    estado.hidden = false;
    estado.textContent = "Carregando pedidos...";
    lista.replaceChildren();
    tentarLista.hidden = true;

    try {
        const resposta = await fetch("/api/pedidos");
        if (!resposta.ok) throw new Error("Falha na consulta");

        const pedidos = await resposta.json();

        if (pedidos.length === 0) {
            estado.textContent = "Nenhum pedido cadastrado.";
            return;
        }

        estado.hidden = true;

        for (const pedido of pedidos) {
            const cartao = modelo.content.firstElementChild.cloneNode(true);
            const situacao = cartao.querySelector(".pedido-status");

            cartao.querySelector(".pedido-numero").textContent =
                `Pedido #${pedido.id_pedido}`;
            cartao.querySelector(".pedido-obra").textContent =
                pedido.nome_obra;
            cartao.querySelector(".pedido-fornecedor").textContent =
                pedido.nome_fornecedor;
            cartao.querySelector(".pedido-data").textContent =
                formatarData(pedido.data_pedido);
            cartao.querySelector(".pedido-itens").textContent =
                `${pedido.quantidade_itens} ` +
                (pedido.quantidade_itens === 1 ? "item" : "itens");
            cartao.querySelector(".pedido-total").textContent =
                formatarMoeda(pedido.total_centavos);

            situacao.textContent = {
                PENDENTE: "Pendente",
                APROVADO: "Aprovado",
                REJEITADO: "Rejeitado",
            }[pedido.status];
            situacao.classList.add(`status-${pedido.status.toLowerCase()}`);

            cartao.querySelector(".pedido-aprovador").textContent =
                pedido.status === "PENDENTE"
                    ? `Agora: ${pedido.nome_aprovador_atual} ` +
                      `(etapa ${pedido.etapa_atual})`
                    : "Fluxo encerrado";
            const listaEtapas = cartao.querySelector(".pedido-etapas");

            for (const etapa of pedido.etapas) {
                const linha = document.createElement("li");

                const nome = document.createElement("span");
                nome.textContent = `${etapa.ordem}. ${etapa.nome_aprovador}`;

                const situacaoEtapa = document.createElement("strong");
                if (etapa.status === "APROVADO") {
                    situacaoEtapa.textContent = "Aprovou";
                } else if (etapa.status === "REJEITADO") {
                    situacaoEtapa.textContent = "Rejeitou";
                } else if (pedido.status === "REJEITADO") {
                    situacaoEtapa.textContent = "Não realizada";
                } else if (etapa.ordem === pedido.etapa_atual) {
                    situacaoEtapa.textContent = "Aguardando agora";
                    linha.className = "etapa-atual";
                } else {
                    situacaoEtapa.textContent = "Próxima";
                }

                linha.append(nome, situacaoEtapa);
                listaEtapas.append(linha);
            }
            cartao.querySelector(".pedido-link").href =
                `/pedidos/${pedido.id_pedido}`;
            lista.append(cartao);
        }
    } catch {
        estado.hidden = false;
        estado.textContent = "Não foi possível carregar os pedidos.";
        tentarLista.hidden = false;
    }
}

tentarLista.addEventListener("click", carregarPedidos);
carregarPedidos();
