package com.br.obraflow.core.domain.shared;

import com.br.obraflow.core.domain.exception.ArgumentoInvalidoException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class ValorMonetarioTest {

    @Test
    void deveCriarValorAPartirDeBigDecimal() {
        ValorMonetario v = ValorMonetario.de(new BigDecimal("100.50"));

        assertEquals(new BigDecimal("100.5000"), v.valor());
    }

    @Test
    void deveCriarValorAPartirDeLong() {
        ValorMonetario v = ValorMonetario.de(100L);

        assertEquals(new BigDecimal("100.0000"), v.valor());
    }

    @Test
    void deveNormalizarParaQuatroCasasDecimais() {
        ValorMonetario v = ValorMonetario.de(new BigDecimal("10.12345"));

        assertEquals(new BigDecimal("10.1235"), v.valor());
    }

    @Test
    void deveFalharQuandoValorNulo() {
        assertThrows(ArgumentoInvalidoException.class, () -> ValorMonetario.de((BigDecimal) null));
    }

    @Test
    void deveTerConstanteZero() {
        assertEquals(BigDecimal.ZERO.setScale(4), ValorMonetario.ZERO.valor());
    }

    @Test
    void deveSomarDoisValores() {
        ValorMonetario v1 = ValorMonetario.de(new BigDecimal("100"));
        ValorMonetario v2 = ValorMonetario.de(new BigDecimal("50"));

        ValorMonetario resultado = v1.mais(v2);

        assertEquals(ValorMonetario.de(new BigDecimal("150")), resultado);
    }

    @Test
    void deveMultiplicarPorFator() {
        ValorMonetario v = ValorMonetario.de(new BigDecimal("10"));
        BigDecimal fator = new BigDecimal("3");

        ValorMonetario resultado = v.multiplicar(fator);

        assertEquals(ValorMonetario.de(new BigDecimal("30")), resultado);
    }

    @Test
    void deveCompararMaiorQue() {
        ValorMonetario v1 = ValorMonetario.de(new BigDecimal("100"));
        ValorMonetario v2 = ValorMonetario.de(new BigDecimal("50"));

        assertTrue(v1.maiorQue(v2));
        assertFalse(v2.maiorQue(v1));
        assertFalse(v1.maiorQue(v1));
    }

    @Test
    void deveCompararMenorOuIgualQue() {
        ValorMonetario v1 = ValorMonetario.de(new BigDecimal("50"));
        ValorMonetario v2 = ValorMonetario.de(new BigDecimal("100"));

        assertTrue(v1.menorOuIgualQue(v2));
        assertTrue(v1.menorOuIgualQue(ValorMonetario.de(new BigDecimal("50"))));
        assertFalse(v2.menorOuIgualQue(v1));
    }

    @Test
    void deveCompararIgualdade() {
        ValorMonetario v1 = ValorMonetario.de(new BigDecimal("100"));
        ValorMonetario v2 = ValorMonetario.de(new BigDecimal("100.0000"));

        assertTrue(v1.igualA(v2));
        assertFalse(v1.igualA(ValorMonetario.de(new BigDecimal("50"))));
    }

    @Test
    void deveSerIgualQuandoValoresSaoIguais() {
        ValorMonetario v1 = ValorMonetario.de(new BigDecimal("100"));
        ValorMonetario v2 = ValorMonetario.de(new BigDecimal("100.0000"));

        assertEquals(v1, v2);
        assertEquals(v1.hashCode(), v2.hashCode());
    }

    @Test
    void deveRetornarStringRepresentandoValor() {
        ValorMonetario v = ValorMonetario.de(new BigDecimal("100.5"));
        assertEquals("100.5000", v.toString());
    }
}