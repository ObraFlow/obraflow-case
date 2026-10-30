package com.br.obraflow.core.domain.shared;

import com.br.obraflow.core.domain.exception.ArgumentoInvalidoException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class QuantidadeTest {

    @Test
    void deveCriarQuantidadeAPartirDeBigDecimal() {
        Quantidade q = Quantidade.de(new BigDecimal("10.5"));

        assertEquals(new BigDecimal("10.5000"), q.valor());
    }

    @Test
    void deveCriarQuantidadeAPartirDeLong() {
        Quantidade q = Quantidade.de(42L);

        assertEquals(new BigDecimal("42.0000"), q.valor());
    }

    @Test
    void deveNormalizarParaQuatroCasasDecimais() {
        Quantidade q = Quantidade.de(new BigDecimal("1.23456"));

        assertEquals(new BigDecimal("1.2346"), q.valor());
    }

    @Test
    void deveFalharQuandoValorNulo() {
        assertThrows(ArgumentoInvalidoException.class, () -> Quantidade.de((BigDecimal) null));
    }

    @Test
    void deveFalharQuandoValorZero() {
        assertThrows(ArgumentoInvalidoException.class, () -> Quantidade.de(BigDecimal.ZERO));
    }

    @Test
    void deveFalharQuandoValorNegativo() {
        assertThrows(ArgumentoInvalidoException.class, () -> Quantidade.de(new BigDecimal("-1")));
    }

    @Test
    void deveSerIgualQuandoValoresSaoIguais() {
        Quantidade q1 = Quantidade.de(new BigDecimal("10"));
        Quantidade q2 = Quantidade.de(new BigDecimal("10.0000"));

        assertEquals(q1, q2);
        assertEquals(q1.hashCode(), q2.hashCode());
    }

    @Test
    void deveRetornarStringRepresentandoValor() {
        Quantidade q = Quantidade.de(new BigDecimal("10.5"));
        assertEquals("10.5000", q.toString());
    }
}