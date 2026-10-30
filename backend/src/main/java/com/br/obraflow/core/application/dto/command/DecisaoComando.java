package com.br.obraflow.core.application.dto.command;

import com.br.obraflow.core.domain.pedido.TipoDecisao;

/**
 * Comando de decisao sobre uma etapa da cadeia de aprovacao.
 * O motivo e' obrigatorio quando a decisao e' REJEITADO.
 */
public record DecisaoComando(TipoDecisao decisao, String motivo) {
}
