package com.br.obraflow.core.domain.alcada;

import com.br.obraflow.core.domain.exception.ArgumentoInvalidoException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class NivelAlcadaTest {

    @Test
    void deveCriarNivelComFaixaEAprovadores() {
        UUID id = UUID.randomUUID();
        UUID obraId = UUID.randomUUID();
        FaixaValor faixa = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000"));
        List<UUID> aprovadores = List.of(UUID.randomUUID(), UUID.randomUUID());

        NivelAlcada nivel = NivelAlcada.novo(id, obraId, faixa, "Pequeno valor", aprovadores);

        assertEquals(id, nivel.id());
        assertEquals(obraId, nivel.obraId());
        assertEquals(faixa, nivel.faixa());
        assertEquals("Pequeno valor", nivel.descricao());
        assertEquals(2, nivel.aprovadores().size());
        assertEquals(aprovadores.get(0), nivel.usuariosAprovadores().get(0));
        assertEquals(aprovadores.get(1), nivel.usuariosAprovadores().get(1));
    }

    @Test
    void deveFalharQuandoListaDeAprovadoresVazia() {
        UUID id = UUID.randomUUID();
        UUID obraId = UUID.randomUUID();
        FaixaValor faixa = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000"));

        assertThrows(ArgumentoInvalidoException.class,
                () -> NivelAlcada.novo(id, obraId, faixa, "Desc", List.of()));
    }

    @Test
    void deveFalharQuandoListaDeAprovadoresNula() {
        UUID id = UUID.randomUUID();
        UUID obraId = UUID.randomUUID();
        FaixaValor faixa = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000"));

        assertThrows(ArgumentoInvalidoException.class,
                () -> NivelAlcada.novo(id, obraId, faixa, "Desc", null));
    }

    @Test
    void deveFalharQuandoAprovadorNuloNaLista() {
        UUID id = UUID.randomUUID();
        UUID obraId = UUID.randomUUID();
        FaixaValor faixa = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000"));
        List<UUID> aprovadores = new ArrayList<>();
        aprovadores.add(UUID.randomUUID());
        aprovadores.add(null);

        assertThrows(ArgumentoInvalidoException.class,
                () -> NivelAlcada.novo(id, obraId, faixa, "Desc", aprovadores));
    }

    @Test
    void deveFalharQuandoMesmoAprovadorApareceDuasVezes() {
        UUID id = UUID.randomUUID();
        UUID obraId = UUID.randomUUID();
        UUID aprovador = UUID.randomUUID();
        FaixaValor faixa = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000"));
        List<UUID> aprovadores = List.of(aprovador, aprovador);

        assertThrows(ArgumentoInvalidoException.class,
                () -> NivelAlcada.novo(id, obraId, faixa, "Desc", aprovadores));
    }

    @Test
    void deveManterOrdemDosAprovadoresConformeListaInformada() {
        UUID id = UUID.randomUUID();
        UUID obraId = UUID.randomUUID();
        UUID a1 = UUID.randomUUID();
        UUID a2 = UUID.randomUUID();
        UUID a3 = UUID.randomUUID();
        FaixaValor faixa = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000"));
        List<UUID> aprovadores = List.of(a1, a2, a3);

        NivelAlcada nivel = NivelAlcada.novo(id, obraId, faixa, "Desc", aprovadores);

        assertEquals(a1, nivel.usuariosAprovadores().get(0));
        assertEquals(a2, nivel.usuariosAprovadores().get(1));
        assertEquals(a3, nivel.usuariosAprovadores().get(2));
        assertEquals(1, nivel.aprovadores().get(0).ordem());
        assertEquals(2, nivel.aprovadores().get(1).ordem());
        assertEquals(3, nivel.aprovadores().get(2).ordem());
    }

    @Test
    void devePermitirRedefinirAprovadoresMantendoNovaOrdem() {
        UUID id = UUID.randomUUID();
        UUID obraId = UUID.randomUUID();
        FaixaValor faixa = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000"));
        UUID a1 = UUID.randomUUID();
        UUID a2 = UUID.randomUUID();
        UUID a3 = UUID.randomUUID();

        NivelAlcada nivel = NivelAlcada.novo(id, obraId, faixa, "Desc", List.of(a1, a2));
        assertEquals(2, nivel.aprovadores().size());

        nivel.redefinirAprovadores(List.of(a3, a1));
        assertEquals(2, nivel.aprovadores().size());
        assertEquals(a3, nivel.usuariosAprovadores().get(0));
        assertEquals(a1, nivel.usuariosAprovadores().get(1));
        assertEquals(1, nivel.aprovadores().get(0).ordem());
        assertEquals(2, nivel.aprovadores().get(1).ordem());
    }

    @Test
    void deveFalharAoRedefinirComListaVazia() {
        UUID id = UUID.randomUUID();
        UUID obraId = UUID.randomUUID();
        FaixaValor faixa = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000"));

        NivelAlcada nivel = NivelAlcada.novo(id, obraId, faixa, "Desc", List.of(UUID.randomUUID()));

        assertThrows(ArgumentoInvalidoException.class,
                () -> nivel.redefinirAprovadores(List.of()));
    }

    @Test
    void devePermitirAlterarFaixa() {
        UUID id = UUID.randomUUID();
        UUID obraId = UUID.randomUUID();
        FaixaValor faixa1 = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000"));
        FaixaValor faixa2 = FaixaValor.acimaDe(new BigDecimal("10000"));

        NivelAlcada nivel = NivelAlcada.novo(id, obraId, faixa1, "Desc", List.of(UUID.randomUUID()));
        nivel.alterarFaixa(faixa2);

        assertEquals(faixa2, nivel.faixa());
    }

    @Test
    void devePermitirAlterarDescricao() {
        UUID id = UUID.randomUUID();
        UUID obraId = UUID.randomUUID();
        FaixaValor faixa = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000"));

        NivelAlcada nivel = NivelAlcada.novo(id, obraId, faixa, "Desc antiga", List.of(UUID.randomUUID()));
        nivel.alterarDescricao("Nova descricao");

        assertEquals("Nova descricao", nivel.descricao());
    }

    @Test
    void deveDelegarContemParaFaixa() {
        UUID id = UUID.randomUUID();
        UUID obraId = UUID.randomUUID();
        FaixaValor faixa = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000"));

        NivelAlcada nivel = NivelAlcada.novo(id, obraId, faixa, "Desc", List.of(UUID.randomUUID()));

        assertTrue(nivel.contem(new BigDecimal("5000")));
        assertFalse(nivel.contem(new BigDecimal("15000")));
    }

    @Test
    void deveReconstituirNivelComAprovadoresJaExistentes() {
        UUID id = UUID.randomUUID();
        UUID obraId = UUID.randomUUID();
        FaixaValor faixa = FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000"));
        UUID a1 = UUID.randomUUID();
        UUID a2 = UUID.randomUUID();
        List<UUID> aprovadoresOriginais = List.of(a1, a2);

        NivelAlcada nivelOriginal = NivelAlcada.novo(id, obraId, faixa, "Desc", aprovadoresOriginais);

        NivelAlcada nivelReconstituido = NivelAlcada.reconstituir(
                id, obraId, faixa, "Desc", nivelOriginal.aprovadores());

        assertEquals(nivelOriginal.usuariosAprovadores(), nivelReconstituido.usuariosAprovadores());
        assertEquals(nivelOriginal.aprovadores().get(0).ordem(), nivelReconstituido.aprovadores().get(0).ordem());
    }
}