package com.br.obraflow.adapters.outbound.persistencia;

import com.br.obraflow.core.application.port.out.NumeroPedidoPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Adaptador da porta de numeracao de pedidos.
 * <p>
 * O sequencial vem de uma sequence do Postgres, o que garante unicidade mesmo com
 * requisicoes concorrentes. O formato e' {@code PC-AAAA-NNNNNN} (ano do pedido + sequencial).
 */
@Component
public class NumeroPedidoAdapter implements NumeroPedidoPort {

    private final JdbcTemplate jdbcTemplate;

    public NumeroPedidoAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public String proximoNumero(LocalDate dataDoPedido) {
        Long sequencial = jdbcTemplate.queryForObject("select nextval('seq_pedido_numero')", Long.class);
        long numero = sequencial == null ? 0L : sequencial;
        return "PC-%d-%06d".formatted(dataDoPedido.getYear(), numero);
    }
}
