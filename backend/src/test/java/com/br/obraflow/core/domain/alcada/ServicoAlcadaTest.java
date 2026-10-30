package com.br.obraflow.core.domain.alcada;

import com.br.obraflow.core.domain.exception.ConflitoException;
import com.br.obraflow.core.domain.exception.RegraDeNegocioException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ServicoAlcadaTest {

    private final ServicoAlcada servico = new ServicoAlcada();
    private final UUID obraId = UUID.randomUUID();

    @Test
    void deveRetornarNivelQuandoExisteExatamenteUmAplicavel() {
        FaixaValor faixa = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000"));
        NivelAlcada nivel = NivelAlcada.novo(UUID.randomUUID(), obraId, faixa, "Pequeno valor",
                List.of(UUID.randomUUID()));
        List<NivelAlcada> niveis = List.of(nivel);

        NivelAlcada resultado = servico.nivelAplicavel(niveis, new BigDecimal("5000"), "OBRA-001");

        assertEquals(nivel, resultado);
    }

    @Test
    void deveRetornarNivelQuandoValorIgualAoLimiteInferior() {
        FaixaValor faixa = FaixaValor.de(new BigDecimal("10000"), new BigDecimal("20000"));
        NivelAlcada nivel = NivelAlcada.novo(UUID.randomUUID(), obraId, faixa, "Médio valor",
                List.of(UUID.randomUUID()));
        List<NivelAlcada> niveis = List.of(nivel);

        NivelAlcada resultado = servico.nivelAplicavel(niveis, new BigDecimal("10000"), "OBRA-001");

        assertEquals(nivel, resultado);
    }

    @Test
    void deveRetornarNivelQuandoValorAbaixoDoLimiteSuperior() {
        FaixaValor faixa = FaixaValor.de(new BigDecimal("10000"), new BigDecimal("20000"));
        NivelAlcada nivel = NivelAlcada.novo(UUID.randomUUID(), obraId, faixa, "Médio valor",
                List.of(UUID.randomUUID()));
        List<NivelAlcada> niveis = List.of(nivel);

        NivelAlcada resultado = servico.nivelAplicavel(niveis, new BigDecimal("19999.9999"), "OBRA-001");

        assertEquals(nivel, resultado);
    }

    @Test
    void naoDeveRetornarNivelQuandoValorIgualAoLimiteSuperiorExclusivo() {
        FaixaValor faixa = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000"));
        NivelAlcada nivel = NivelAlcada.novo(UUID.randomUUID(), obraId, faixa, "Pequeno valor",
                List.of(UUID.randomUUID()));
        List<NivelAlcada> niveis = List.of(nivel);

        assertThrows(RegraDeNegocioException.class,
                () -> servico.nivelAplicavel(niveis, new BigDecimal("10000"), "OBRA-001"));
    }

    @Test
    void deveRetornarNivelQuandoFaixaSemTetoEValorAcimaDoLimiteInferior() {
        FaixaValor faixa = FaixaValor.acimaDe(new BigDecimal("10000"));
        NivelAlcada nivel = NivelAlcada.novo(UUID.randomUUID(), obraId, faixa, "Grande valor",
                List.of(UUID.randomUUID(), UUID.randomUUID()));
        List<NivelAlcada> niveis = List.of(nivel);

        NivelAlcada resultado = servico.nivelAplicavel(niveis, new BigDecimal("10000.01"), "OBRA-001");

        assertEquals(nivel, resultado);
    }

    @Test
    void deveLancarExcecaoQuandoNenhumNivelContemOValor() {
        FaixaValor faixa = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000"));
        NivelAlcada nivel = NivelAlcada.novo(UUID.randomUUID(), obraId, faixa, "Pequeno valor",
                List.of(UUID.randomUUID()));
        List<NivelAlcada> niveis = List.of(nivel);

        assertThrows(RegraDeNegocioException.class,
                () -> servico.nivelAplicavel(niveis, new BigDecimal("15000"), "OBRA-001"));
    }

    @Test
    void deveLancarExcecaoQuandoListaDeNiveisVazia() {
        List<NivelAlcada> niveis = List.of();

        assertThrows(RegraDeNegocioException.class,
                () -> servico.nivelAplicavel(niveis, new BigDecimal("5000"), "OBRA-001"));
    }

    @Test
    void deveLancarExcecaoQuandoMaisDeUmNivelContemOValor() {
        FaixaValor faixa1 = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("15000"));
        FaixaValor faixa2 = FaixaValor.de(new BigDecimal("10000"), new BigDecimal("20000"));
        NivelAlcada nivel1 = NivelAlcada.novo(UUID.randomUUID(), obraId, faixa1, "Faixa 1",
                List.of(UUID.randomUUID()));
        NivelAlcada nivel2 = NivelAlcada.novo(UUID.randomUUID(), obraId, faixa2, "Faixa 2",
                List.of(UUID.randomUUID()));
        List<NivelAlcada> niveis = List.of(nivel1, nivel2);

        assertThrows(ConflitoException.class,
                () -> servico.nivelAplicavel(niveis, new BigDecimal("12000"), "OBRA-001"));
    }

    @Test
    void deveValidarNaoSobreposicaoAoCriarNovaFaixa() {
        FaixaValor faixaExistente = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000"));
        NivelAlcada nivelExistente = NivelAlcada.novo(UUID.randomUUID(), obraId, faixaExistente, "Existente",
                List.of(UUID.randomUUID()));
        List<NivelAlcada> niveisExistentes = List.of(nivelExistente);

        FaixaValor novaFaixa = FaixaValor.de(new BigDecimal("5000"), new BigDecimal("15000"));

        assertThrows(ConflitoException.class,
                () -> servico.validarNaoSobreposicao(novaFaixa, niveisExistentes, UUID.randomUUID(), "OBRA-001"));
    }

    @Test
    void devePermitirNovaFaixaQuandoNaoHaSobreposicao() {
        FaixaValor faixaExistente = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000"));
        NivelAlcada nivelExistente = NivelAlcada.novo(UUID.randomUUID(), obraId, faixaExistente, "Existente",
                List.of(UUID.randomUUID()));
        List<NivelAlcada> niveisExistentes = List.of(nivelExistente);

        FaixaValor novaFaixa = FaixaValor.acimaDe(new BigDecimal("10000"));

        assertDoesNotThrow(() -> servico.validarNaoSobreposicao(novaFaixa, niveisExistentes, UUID.randomUUID(), "OBRA-001"));
    }

    @Test
    void devePermitirNovaFaixaAdjacenteSemSobreposicao() {
        FaixaValor faixaExistente = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000"));
        NivelAlcada nivelExistente = NivelAlcada.novo(UUID.randomUUID(), obraId, faixaExistente, "Existente",
                List.of(UUID.randomUUID()));
        List<NivelAlcada> niveisExistentes = List.of(nivelExistente);

        FaixaValor novaFaixa = FaixaValor.de(new BigDecimal("10000"), new BigDecimal("20000"));

        assertDoesNotThrow(() -> servico.validarNaoSobreposicao(novaFaixa, niveisExistentes, UUID.randomUUID(), "OBRA-001"));
    }

    @Test
    void deveIgnorarONivelSendoEditadoNaValidacaoDeSobreposicao() {
        UUID nivelId = UUID.randomUUID();
        FaixaValor faixaExistente = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000"));
        NivelAlcada nivelExistente = NivelAlcada.novo(nivelId, obraId, faixaExistente, "Existente",
                List.of(UUID.randomUUID()));
        List<NivelAlcada> niveisExistentes = List.of(nivelExistente);

        FaixaValor novaFaixa = FaixaValor.de(new BigDecimal("5000"), new BigDecimal("15000"));

        assertDoesNotThrow(() -> servico.validarNaoSobreposicao(novaFaixa, niveisExistentes, nivelId, "OBRA-001"));
    }

    @Test
    void deveLancarExcecaoQuandoNovoLimiteSuperiorSobrepoeExistente() {
        FaixaValor faixaExistente = FaixaValor.acimaDe(new BigDecimal("10000"));
        NivelAlcada nivelExistente = NivelAlcada.novo(UUID.randomUUID(), obraId, faixaExistente, "Acima 10k",
                List.of(UUID.randomUUID()));
        List<NivelAlcada> niveisExistentes = List.of(nivelExistente);

        FaixaValor novaFaixa = FaixaValor.de(new BigDecimal("5000"), new BigDecimal("15000"));

        assertThrows(ConflitoException.class,
                () -> servico.validarNaoSobreposicao(novaFaixa, niveisExistentes, UUID.randomUUID(), "OBRA-001"));
    }

    @Test
    void deveLancarExcecaoQuandoFaixaExistenteSemTetoENovaFaixaComecaDentroDela() {
        FaixaValor faixaExistente = FaixaValor.acimaDe(new BigDecimal("5000"));
        NivelAlcada nivelExistente = NivelAlcada.novo(UUID.randomUUID(), obraId, faixaExistente, "Acima 5k",
                List.of(UUID.randomUUID()));
        List<NivelAlcada> niveisExistentes = List.of(nivelExistente);

        FaixaValor novaFaixa = FaixaValor.de(new BigDecimal("8000"), new BigDecimal("12000"));

        assertThrows(ConflitoException.class,
                () -> servico.validarNaoSobreposicao(novaFaixa, niveisExistentes, UUID.randomUUID(), "OBRA-001"));
    }
}