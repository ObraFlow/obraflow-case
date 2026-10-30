package com.br.obraflow.core.domain.alcada;

import com.br.obraflow.core.domain.exception.ArgumentoInvalidoException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class FaixaValorTest {

    @Test
    void deveCriarFaixaComLimiteInferiorZeroESuperiorPositivo() {
        FaixaValor faixa = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000"));
        assertEquals(0, faixa.limiteInferior().compareTo(BigDecimal.ZERO));
        assertEquals(0, faixa.limiteSuperior().compareTo(new BigDecimal("10000.0000")));
        assertFalse(faixa.semTeto());
    }

    @Test
    void deveCriarFaixaSemTeto() {
        FaixaValor faixa = FaixaValor.acimaDe(new BigDecimal("10000"));
        assertEquals(new BigDecimal("10000.0000"), faixa.limiteInferior());
        assertNull(faixa.limiteSuperior());
        assertTrue(faixa.semTeto());
    }

    @Test
    void deveCriarFaixaQualquerValor() {
        FaixaValor faixa = FaixaValor.qualquerValor();
        assertEquals(0, faixa.limiteInferior().compareTo(BigDecimal.ZERO));
        assertNull(faixa.limiteSuperior());
        assertTrue(faixa.semTeto());
    }

    @Test
    void deveCriarFaixaAte() {
        FaixaValor faixa = FaixaValor.ate(new BigDecimal("5000"));
        assertEquals(0, faixa.limiteInferior().compareTo(BigDecimal.ZERO));
        assertEquals(0, faixa.limiteSuperior().compareTo(new BigDecimal("5000.0000")));
        assertFalse(faixa.semTeto());
    }

    @Test
    void deveNormalizarEscalaParaQuatroCasas() {
        FaixaValor faixa = FaixaValor.de(new BigDecimal("1000.12345"), new BigDecimal("2000.98765"));
        assertEquals(new BigDecimal("1000.1235"), faixa.limiteInferior());
        assertEquals(new BigDecimal("2000.9877"), faixa.limiteSuperior());
    }

    @Test
    void deveFalharQuandoLimiteInferiorNegativo() {
        assertThrows(ArgumentoInvalidoException.class,
                () -> FaixaValor.de(new BigDecimal("-1"), new BigDecimal("100")));
    }

    @Test
    void deveFalharQuandoLimiteSuperiorMenorOuIgualAoInferior() {
        assertThrows(ArgumentoInvalidoException.class,
                () -> FaixaValor.de(new BigDecimal("100"), new BigDecimal("100")));
        assertThrows(ArgumentoInvalidoException.class,
                () -> FaixaValor.de(new BigDecimal("200"), new BigDecimal("100")));
    }

    @Test
    void deveFalharQuandoLimiteInferiorNulo() {
        assertThrows(ArgumentoInvalidoException.class,
                () -> FaixaValor.de(null, new BigDecimal("100")));
    }

    @Test
    void deveFalharQuandoLimiteSuperiorNuloEmDe() {
        // null e' permitido para limiteSuperior (faixa sem teto)
        FaixaValor faixa = FaixaValor.de(new BigDecimal("0"), null);
        assertNull(faixa.limiteSuperior());
        assertTrue(faixa.semTeto());
    }

    @Test
    void deveConterValorDentroDaFaixa() {
        FaixaValor faixa = FaixaValor.de(new BigDecimal("0"), new BigDecimal("10000"));
        assertTrue(faixa.contem(new BigDecimal("0")));
        assertTrue(faixa.contem(new BigDecimal("5000")));
        assertTrue(faixa.contem(new BigDecimal("9999.9999")));
    }

    @Test
    void deveConterLimiteInferiorInclusivo() {
        FaixaValor faixa = FaixaValor.de(new BigDecimal("1000"), new BigDecimal("2000"));
        assertTrue(faixa.contem(new BigDecimal("1000")));
    }

    @Test
    void naoDeveConterLimiteSuperiorExclusivo() {
        FaixaValor faixa = FaixaValor.de(new BigDecimal("1000"), new BigDecimal("2000"));
        assertFalse(faixa.contem(new BigDecimal("2000")));
    }

    @Test
    void deveConterValorAcimaDoLimiteInferiorEmFaixaSemTeto() {
        FaixaValor faixa = FaixaValor.acimaDe(new BigDecimal("10000"));
        assertTrue(faixa.contem(new BigDecimal("10000")));
        assertTrue(faixa.contem(new BigDecimal("10000.01")));
        assertTrue(faixa.contem(new BigDecimal("99999999")));
    }

    @Test
    void naoDeveConterValorAbaixoDoLimiteInferior() {
        FaixaValor faixa = FaixaValor.de(new BigDecimal("1000"), new BigDecimal("2000"));
        assertFalse(faixa.contem(new BigDecimal("999.9999")));
    }

    @Test
    void naoDeveConterValorNulo() {
        FaixaValor faixa = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000"));
        assertFalse(faixa.contem(null));
    }

    @Test
    void deveDetectarSobreposicaoQuandoFaixasSeIntersectam() {
        FaixaValor faixa1 = FaixaValor.de(new BigDecimal("0"), new BigDecimal("10000"));
        FaixaValor faixa2 = FaixaValor.de(new BigDecimal("5000"), new BigDecimal("15000"));
        assertTrue(faixa1.sobrepoe(faixa2));
        assertTrue(faixa2.sobrepoe(faixa1));
    }

    @Test
    void deveDetectarSobreposicaoQuandoUmaFaixaEstaContidaNaOutra() {
        FaixaValor faixa1 = FaixaValor.de(new BigDecimal("0"), new BigDecimal("20000"));
        FaixaValor faixa2 = FaixaValor.de(new BigDecimal("5000"), new BigDecimal("10000"));
        assertTrue(faixa1.sobrepoe(faixa2));
    }

    @Test
    void deveDetectarSobreposicaoComFaixaSemTeto() {
        FaixaValor faixa1 = FaixaValor.de(new BigDecimal("0"), new BigDecimal("10000"));
        FaixaValor faixa2 = FaixaValor.acimaDe(new BigDecimal("5000"));
        assertTrue(faixa1.sobrepoe(faixa2));
    }

    @Test
    void naoDeveDetectarSobreposicaoQuandoFaixasSaoAdjacentes() {
        FaixaValor faixa1 = FaixaValor.de(new BigDecimal("0"), new BigDecimal("10000"));
        FaixaValor faixa2 = FaixaValor.de(new BigDecimal("10000"), new BigDecimal("20000"));
        assertFalse(faixa1.sobrepoe(faixa2));
    }

    @Test
    void naoDeveDetectarSobreposicaoQuandoFaixasEstaoSeparadas() {
        FaixaValor faixa1 = FaixaValor.de(new BigDecimal("0"), new BigDecimal("5000"));
        FaixaValor faixa2 = FaixaValor.de(new BigDecimal("10000"), new BigDecimal("15000"));
        assertFalse(faixa1.sobrepoe(faixa2));
    }

    @Test
    void deveGerarRotuloCorretoParaFaixaAte() {
        FaixaValor faixa = FaixaValor.ate(new BigDecimal("10000"));
        String rotulo = faixa.rotulo();
        assertTrue(rotulo.contains("10.000") || rotulo.contains("10,000"));
        // Pode ser "Ate" ou "Até" dependendo do locale/encoding
    }

    @Test
    void deveGerarRotuloCorretoParaFaixaAcimaDe() {
        FaixaValor faixa = FaixaValor.acimaDe(new BigDecimal("10000"));
        assertTrue(faixa.rotulo().contains("Acima"));
        assertTrue(faixa.rotulo().contains("10.000"));
    }

    @Test
    void deveGerarRotuloCorretoParaFaixaQualquerValor() {
        FaixaValor faixa = FaixaValor.qualquerValor();
        assertEquals("Qualquer valor", faixa.rotulo());
    }

    @Test
    void deveSerIgualQuandoLimitesSaoIguais() {
        FaixaValor f1 = FaixaValor.de(new BigDecimal("1000"), new BigDecimal("2000"));
        FaixaValor f2 = FaixaValor.de(new BigDecimal("1000.0000"), new BigDecimal("2000.0000"));
        assertEquals(f1, f2);
        assertEquals(f1.hashCode(), f2.hashCode());
    }
}