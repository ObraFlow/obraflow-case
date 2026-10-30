package com.br.obraflow.core.application.port.out;

import java.time.LocalDate;

/**
 * Porta de saida para a geracao do numero/protocolo do pedido.
 * A sequencia e' mantida pelo banco para garantir unicidade sob concorrencia.
 */
public interface NumeroPedidoPort {

    String proximoNumero(LocalDate dataDoPedido);
}
