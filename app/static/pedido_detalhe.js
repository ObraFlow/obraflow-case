const secao = document.querySelector("#decisao-pedido");
const usuario = document.querySelector("#usuario-decisao");

if (usuario) {
    const aprovar = document.querySelector("#aprovar-pedido");
    const abrirRejeicao = document.querySelector("#abrir-rejeicao");
    const areaRejeicao = document.querySelector("#area-rejeicao");
    const motivo = document.querySelector("#motivo-rejeicao");
    const confirmar = document.querySelector("#confirmar-rejeicao");
    const cancelar = document.querySelector("#cancelar-rejeicao");
    const mensagem = document.querySelector("#mensagem-decisao");

    let enviando = false;

    function atualizarBotoes() {
        const usuarioEscolhido = usuario.value !== "" && !enviando;
        aprovar.disabled = !usuarioEscolhido;
        abrirRejeicao.disabled = !usuarioEscolhido;
        confirmar.disabled = !usuarioEscolhido || motivo.value.trim() === "";
    }

    async function enviarDecisao(acao) {
        if (enviando || usuario.value === "") return;
        if (acao === "REJEITAR" && motivo.value.trim() === "") return;

        const dados = {
            id_usuario: Number(usuario.value),
            acao: acao,
        };
        if (acao === "REJEITAR") {
            dados.motivo = motivo.value.trim();
        }

        enviando = true;
        atualizarBotoes();
        mensagem.className = "";
        mensagem.textContent = "Salvando decisão...";

        try {
            const resposta = await fetch(
                `/api/pedidos/${secao.dataset.pedido}/decisoes`,
                {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(dados),
                }
            );
            const resultado = await resposta.json().catch(() => ({}));

            if (!resposta.ok) {
                const detalhe = resultado.detail;
                mensagem.className = "erro";
                mensagem.textContent = Array.isArray(detalhe)
                    ? detalhe.map((erro) => erro.msg).join("; ")
                    : detalhe || "Não foi possível registrar a decisão.";
                return;
            }

            window.location.reload();
        } catch {
            mensagem.className = "erro";
            mensagem.textContent = "Não foi possível conectar ao servidor.";
        } finally {
            enviando = false;
            atualizarBotoes();
        }
    }

    usuario.addEventListener("change", atualizarBotoes);
    motivo.addEventListener("input", atualizarBotoes);

    aprovar.addEventListener("click", () => enviarDecisao("APROVAR"));

    abrirRejeicao.addEventListener("click", () => {
        areaRejeicao.hidden = false;
        motivo.focus();
    });

    cancelar.addEventListener("click", () => {
        areaRejeicao.hidden = true;
        motivo.value = "";
        atualizarBotoes();
    });

    confirmar.addEventListener("click", () => enviarDecisao("REJEITAR"));

    atualizarBotoes();
}