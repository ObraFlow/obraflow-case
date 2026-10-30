package com.br.obraflow.core.domain.pedido;

import com.br.obraflow.core.domain.exception.RegraDeNegocioException;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class EtapaAlcadaTest {

    private static final UUID USUARIO_ID = UUID.randomUUID();
    private static final Instant AGORA = Instant.now();

    @Test
    void deveCriarEtapaPendenteComOrdemEUsuario() {
        EtapaAlcada etapa = EtapaAlcada.pendente(UUID.randomUUID(), USUARIO_ID, 1);

        assertNotNull(etapa.id());
        assertEquals(USUARIO_ID, etapa.usuarioId());
        assertEquals(1, etapa.ordem());
        assertEquals(SituacaoEtapa.PENDENTE, etapa.situacao());
        assertNull(etapa.motivo());
        assertNull(etapa.decididoEm());
        assertTrue(etapa.pendente());
    }

    @Test
    void deveRegistrarAprovacaoSemMotivo() {
        EtapaAlcada etapa = EtapaAlcada.pendente(UUID.randomUUID(), USUARIO_ID, 1);

        etapa.registrarDecisao(TipoDecisao.APROVADO, null, AGORA);

        assertEquals(SituacaoEtapa.APROVADO, etapa.situacao());
        assertNull(etapa.motivo());
        assertEquals(AGORA, etapa.decididoEm());
        assertFalse(etapa.pendente());
    }

    @Test
    void deveRegistrarAprovacaoIgnorandoMotivoSeInformado() {
        EtapaAlcada etapa = EtapaAlcada.pendente(UUID.randomUUID(), USUARIO_ID, 1);

        etapa.registrarDecisao(TipoDecisao.APROVADO, "Motivo ignorado", AGORA);

        assertEquals(SituacaoEtapa.APROVADO, etapa.situacao());
        assertNull(etapa.motivo());
    }

    @Test
    void deveRegistrarRejeicaoComMotivoObrigatorio() {
        EtapaAlcada etapa = EtapaAlcada.pendente(UUID.randomUUID(), USUARIO_ID, 1);

        etapa.registrarDecisao(TipoDecisao.REJEITADO, "Valor acima do orcamento", AGORA);

        assertEquals(SituacaoEtapa.REJEITADO, etapa.situacao());
        assertEquals("Valor acima do orcamento", etapa.motivo());
        assertEquals(AGORA, etapa.decididoEm());
        assertFalse(etapa.pendente());
    }

    @Test
    void deveApararEspacosDoMotivoNaRejeicao() {
        EtapaAlcada etapa = EtapaAlcada.pendente(UUID.randomUUID(), USUARIO_ID, 1);

        etapa.registrarDecisao(TipoDecisao.REJEITADO, "  Motivo com espacos  ", AGORA);

        assertEquals("Motivo com espacos", etapa.motivo());
    }

    @Test
    void deveFalharAoRegistrarRejeicaoSemMotivo() {
        EtapaAlcada etapa = EtapaAlcada.pendente(UUID.randomUUID(), USUARIO_ID, 1);

        assertThrows(RegraDeNegocioException.class,
                () -> etapa.registrarDecisao(TipoDecisao.REJEITADO, null, AGORA));
    }

    @Test
    void deveFalharAoRegistrarRejeicaoComMotivoVazio() {
        EtapaAlcada etapa = EtapaAlcada.pendente(UUID.randomUUID(), USUARIO_ID, 1);

        assertThrows(RegraDeNegocioException.class,
                () -> etapa.registrarDecisao(TipoDecisao.REJEITADO, "", AGORA));
    }

    @Test
    void deveFalharAoRegistrarRejeicaoComMotivoApenasEspacos() {
        EtapaAlcada etapa = EtapaAlcada.pendente(UUID.randomUUID(), USUARIO_ID, 1);

        assertThrows(RegraDeNegocioException.class,
                () -> etapa.registrarDecisao(TipoDecisao.REJEITADO, "   ", AGORA));
    }

    @Test
    void deveFalharAoRegistrarSegundaDecisaoNaMesmaEtapa() {
        EtapaAlcada etapa = EtapaAlcada.pendente(UUID.randomUUID(), USUARIO_ID, 1);
        etapa.registrarDecisao(TipoDecisao.APROVADO, null, AGORA);

        assertThrows(RegraDeNegocioException.class,
                () -> etapa.registrarDecisao(TipoDecisao.REJEITADO, "Motivo", AGORA));
    }

    @Test
    void deveFalharAoRegistrarSegundaAprovacaoNaMesmaEtapa() {
        EtapaAlcada etapa = EtapaAlcada.pendente(UUID.randomUUID(), USUARIO_ID, 1);
        etapa.registrarDecisao(TipoDecisao.APROVADO, null, AGORA);

        assertThrows(RegraDeNegocioException.class,
                () -> etapa.registrarDecisao(TipoDecisao.APROVADO, null, AGORA));
    }

    @Test
    void deveManterIdUsuarioOrdemInalteradosAposDecisao() {
        UUID id = UUID.randomUUID();
        EtapaAlcada etapa = EtapaAlcada.pendente(id, USUARIO_ID, 3);
        etapa.registrarDecisao(TipoDecisao.REJEITADO, "Motivo", AGORA);

        assertEquals(id, etapa.id());
        assertEquals(USUARIO_ID, etapa.usuarioId());
        assertEquals(3, etapa.ordem());
    }
}