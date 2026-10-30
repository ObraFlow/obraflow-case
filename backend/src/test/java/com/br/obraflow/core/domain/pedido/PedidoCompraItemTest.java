package com.br.obraflow.core.domain.pedido;

import com.br.obraflow.core.domain.exception.ArgumentoInvalidoException;
import com.br.obraflow.core.domain.shared.Quantidade;
import com.br.obraflow.core.domain.shared.ValorMonetario;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class PedidoCompraItemTest {

    @Test
    void deveCriarItemComTodosOsCamposValidos() {
        PedidoCompraItem item = new PedidoCompraItem(
                "Cimento CP II",
                Quantidade.de(new BigDecimal("120")),
                "sc",
                ValorMonetario.de(new BigDecimal("32.90"))
        );

        assertEquals("Cimento CP II", item.descricao());
        assertEquals(Quantidade.de(new BigDecimal("120")), item.quantidade());
        assertEquals("sc", item.unidade());
        assertEquals(ValorMonetario.de(new BigDecimal("32.90")), item.precoUnitario());
        assertEquals(ValorMonetario.de(new BigDecimal("3948.0000")), item.total());
    }

    @Test
    void deveCalcularTotalComoQuantidadeVezesPrecoUnitario() {
        PedidoCompraItem item = new PedidoCompraItem(
                "Item",
                Quantidade.de(new BigDecimal("2.5")),
                "kg",
                ValorMonetario.de(new BigDecimal("10"))
        );

        assertEquals(ValorMonetario.de(new BigDecimal("25")), item.total());
    }

    @Test
    void deveFalharQuandoDescricaoNula() {
        assertThrows(ArgumentoInvalidoException.class,
                () -> new PedidoCompraItem(null, Quantidade.de(new BigDecimal("1")), "un", ValorMonetario.de(new BigDecimal("10"))));
    }

    @Test
    void deveFalharQuandoDescricaoVazia() {
        assertThrows(ArgumentoInvalidoException.class,
                () -> new PedidoCompraItem("", Quantidade.de(new BigDecimal("1")), "un", ValorMonetario.de(new BigDecimal("10"))));
    }

    @Test
    void deveFalharQuandoDescricaoApenasEspacos() {
        assertThrows(ArgumentoInvalidoException.class,
                () -> new PedidoCompraItem("   ", Quantidade.de(new BigDecimal("1")), "un", ValorMonetario.de(new BigDecimal("10"))));
    }

    @Test
    void deveApararEspacosDaDescricao() {
        PedidoCompraItem item = new PedidoCompraItem("  Item com espacos  ", Quantidade.de(new BigDecimal("1")), "un", ValorMonetario.de(new BigDecimal("10")));
        assertEquals("Item com espacos", item.descricao());
    }

    @Test
    void deveFalharQuandoQuantidadeNula() {
        assertThrows(NullPointerException.class,
                () -> new PedidoCompraItem("Item", null, "un", ValorMonetario.de(new BigDecimal("10"))));
    }

    @Test
    void deveFalharQuandoUnidadeNula() {
        assertThrows(ArgumentoInvalidoException.class,
                () -> new PedidoCompraItem("Item", Quantidade.de(new BigDecimal("1")), null, ValorMonetario.de(new BigDecimal("10"))));
    }

    @Test
    void deveFalharQuandoUnidadeVazia() {
        assertThrows(ArgumentoInvalidoException.class,
                () -> new PedidoCompraItem("Item", Quantidade.de(new BigDecimal("1")), "", ValorMonetario.de(new BigDecimal("10"))));
    }

    @Test
    void deveFalharQuandoPrecoUnitarioNulo() {
        assertThrows(NullPointerException.class,
                () -> new PedidoCompraItem("Item", Quantidade.de(new BigDecimal("1")), "un", null));
    }

    @Test
    void deveApararEspacosDaUnidade() {
        PedidoCompraItem item = new PedidoCompraItem("Item", Quantidade.de(new BigDecimal("1")), "  kg  ", ValorMonetario.de(new BigDecimal("10")));
        assertEquals("kg", item.unidade());
    }

    @Test
    void deveManterPrecisaoDeQuatroCasasNoTotal() {
        PedidoCompraItem item = new PedidoCompraItem(
                "Item",
                Quantidade.de(new BigDecimal("3")),
                "un",
                ValorMonetario.de(new BigDecimal("33.3333"))
        );

        assertEquals(ValorMonetario.de(new BigDecimal("99.9999")), item.total());
    }

    @Test
    void deveArredondarTotalParaQuatroCasas() {
        PedidoCompraItem item = new PedidoCompraItem(
                "Item",
                Quantidade.de(new BigDecimal("1")),
                "un",
                ValorMonetario.de(new BigDecimal("10.12345"))
        );

        assertEquals(ValorMonetario.de(new BigDecimal("10.1235")), item.total());
    }
}