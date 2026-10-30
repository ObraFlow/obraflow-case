package com.br.obraflow.core.domain.pedido;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Projecao de leitura da listagem de pedidos.
 * <p>
 * Existe para que a listagem nao precise carregar os agregados completos
 * (evitando N+1 e desperdicio). O mapeamento para a resposta HTTP acontece
 * na camada de adapter, a partir desta estrutura.
 */
public record PedidoResumo(
        UUID id,
        String numero,
        UUID obraId,
        String obraCodigo,
        String obraNome,
        UUID fornecedorId,
        String fornecedorNome,
        LocalDate dataPedido,
        java.math.BigDecimal valorTotal,
        int quantidadeItens,
        SituacaoPedido situacao,
        int etapaAtual,
        int totalEtapas,
        List<EtapaResumo> etapas,
        UUID solicitanteId) {

    public PedidoResumo {
        etapas = etapas == null ? List.of() : List.copyOf(etapas);
    }
}
