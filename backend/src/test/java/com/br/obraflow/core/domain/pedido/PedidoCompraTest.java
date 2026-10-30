package com.br.obraflow.core.domain.pedido;

import com.br.obraflow.core.domain.alcada.NivelAlcada;
import com.br.obraflow.core.domain.alcada.FaixaValor;
import com.br.obraflow.core.domain.exception.ArgumentoInvalidoException;
import com.br.obraflow.core.domain.exception.RegraDeNegocioException;
import com.br.obraflow.core.domain.shared.Quantidade;
import com.br.obraflow.core.domain.shared.ValorMonetario;
import com.br.obraflow.core.domain.usuario.Papel;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class PedidoCompraTest {

    private static final UUID OBRA_ID = UUID.randomUUID();
    private static final UUID FORNECEDOR_ID = UUID.randomUUID();
    private static final UUID SOLICITANTE_ID = UUID.randomUUID();
    private static final UUID APROVADOR_1 = UUID.randomUUID();
    private static final UUID APROVADOR_2 = UUID.randomUUID();
    private static final LocalDate DATA_PEDIDO = LocalDate.now();
    private static final Instant AGORA = Instant.now();

    private NivelAlcada criarNivel(UUID id, FaixaValor faixa, List<UUID> aprovadores) {
        return NivelAlcada.novo(id, OBRA_ID, faixa, "Teste", aprovadores);
    }

    private List<PedidoCompraItem> criarItensValidos() {
        return List.of(
                new PedidoCompraItem("Item 1", Quantidade.de(2), "un", ValorMonetario.de(100)),
                new PedidoCompraItem("Item 2", Quantidade.de(3), "kg", ValorMonetario.de(50))
        );
    }

    @Test
    void deveCriarPedidoComItensETotalCalculado() {
        NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1));
        List<PedidoCompraItem> itens = criarItensValidos();

        PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, itens, AGORA);

        assertEquals(ValorMonetario.de(new BigDecimal("350.0000")), pedido.valorTotal());
        assertEquals(2, pedido.itens().size());
        assertEquals(SituacaoPedido.PENDENTE, pedido.situacao());
        assertEquals(1, pedido.etapaAtual());
        assertEquals(1, pedido.totalEtapas());
    }

    @Test
    void deveFalharAoCriarPedidoSemItens() {
        NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1));

        assertThrows(ArgumentoInvalidoException.class,
                () -> PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                        DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, List.of(), AGORA));
    }

    @Test
    void deveFalharAoCriarPedidoComNivelNulo() {
        List<PedidoCompraItem> itens = criarItensValidos();

        assertThrows(ArgumentoInvalidoException.class,
                () -> PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                        DATA_PEDIDO, "Obs", SOLICITANTE_ID, null, itens, AGORA));
    }

    @Test
    void deveCriarSnapshotDaCadeiaDeAprovadoresNoMomentoDaCriacao() {
        NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1, APROVADOR_2));
        List<PedidoCompraItem> itens = criarItensValidos();

        PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, itens, AGORA);

        assertEquals(2, pedido.totalEtapas());
        assertEquals(APROVADOR_1, pedido.etapas().get(0).usuarioId());
        assertEquals(APROVADOR_2, pedido.etapas().get(1).usuarioId());
        assertEquals(SituacaoEtapa.PENDENTE, pedido.etapas().get(0).situacao());
        assertEquals(SituacaoEtapa.PENDENTE, pedido.etapas().get(1).situacao());
    }

    @Test
    void deveRegistrarAprovacaoDaPrimeiraETapaEAvancarParaSegunda() {
        NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1, APROVADOR_2));
        List<PedidoCompraItem> itens = criarItensValidos();

        PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, itens, AGORA);

        Ator ator = Ator.de(APROVADOR_1, "Aprovador 1", Set.of());
        pedido.registrarDecisao(ator, TipoDecisao.APROVADO, null, AGORA);

        assertEquals(SituacaoPedido.PENDENTE, pedido.situacao());
        assertEquals(2, pedido.etapaAtual());
        assertEquals(SituacaoEtapa.APROVADO, pedido.etapas().get(0).situacao());
        assertEquals(SituacaoEtapa.PENDENTE, pedido.etapas().get(1).situacao());
        assertEquals(APROVADOR_2, pedido.etapaCorrente().get().usuarioId());
    }

    @Test
    void deveAprovarPedidoCompletamenteQuandoUltimaETapaAprovada() {
        NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1));
        List<PedidoCompraItem> itens = criarItensValidos();

        PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, itens, AGORA);

        Ator ator = Ator.de(APROVADOR_1, "Aprovador 1", Set.of());
        pedido.registrarDecisao(ator, TipoDecisao.APROVADO, null, AGORA);

        assertEquals(SituacaoPedido.APROVADO, pedido.situacao());
        assertEquals(1, pedido.etapaAtual());
        assertEquals(SituacaoEtapa.APROVADO, pedido.etapas().get(0).situacao());
        assertTrue(pedido.etapaCorrente().isEmpty());
    }

    @Test
    void deveRejeitarPedidoEInterromperFluxoQuandoQualquerETapaRejeitada() {
        NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1, APROVADOR_2));
        List<PedidoCompraItem> itens = criarItensValidos();

        PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, itens, AGORA);

        Ator ator = Ator.de(APROVADOR_1, "Aprovador 1", Set.of());
        pedido.registrarDecisao(ator, TipoDecisao.REJEITADO, "Valor acima do orcamento", AGORA);

        assertEquals(SituacaoPedido.REJEITADO, pedido.situacao());
        assertEquals(1, pedido.etapaAtual());
        assertEquals(SituacaoEtapa.REJEITADO, pedido.etapas().get(0).situacao());
        assertEquals("Valor acima do orcamento", pedido.etapas().get(0).motivo());
        assertEquals(SituacaoEtapa.PENDENTE, pedido.etapas().get(1).situacao());
        assertTrue(pedido.etapaCorrente().isEmpty());
    }

    @Test
    void deveFalharAoRegistrarDecisaoQuandoCadeiaJaConcluidaAprovado() {
        NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1));
        List<PedidoCompraItem> itens = criarItensValidos();

        PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, itens, AGORA);

        Ator ator = Ator.de(APROVADOR_1, "Aprovador 1", Set.of());
        pedido.registrarDecisao(ator, TipoDecisao.APROVADO, null, AGORA);

        assertThrows(RegraDeNegocioException.class,
                () -> pedido.registrarDecisao(ator, TipoDecisao.APROVADO, null, AGORA));
    }

    @Test
    void deveFalharAoRegistrarDecisaoQuandoCadeiaJaConcluidaRejeitado() {
        NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1));
        List<PedidoCompraItem> itens = criarItensValidos();

        PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, itens, AGORA);

        Ator ator = Ator.de(APROVADOR_1, "Aprovador 1", Set.of());
        pedido.registrarDecisao(ator, TipoDecisao.REJEITADO, "Motivo", AGORA);

        assertThrows(RegraDeNegocioException.class,
                () -> pedido.registrarDecisao(ator, TipoDecisao.APROVADO, null, AGORA));
    }

    @Test
    void deveFalharQuandoAtorNaoEhOAprovadorDaEtapaCorrente() {
        NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1, APROVADOR_2));
        List<PedidoCompraItem> itens = criarItensValidos();

        PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, itens, AGORA);

        UUID outroUsuario = UUID.randomUUID();
        Ator atorErrado = Ator.de(outroUsuario, "Outro", Set.of());

        assertThrows(RegraDeNegocioException.class,
                () -> pedido.registrarDecisao(atorErrado, TipoDecisao.APROVADO, null, AGORA));
    }

    @Test
    void deveFalharAoRejeitarSemMotivo() {
        NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1));
        List<PedidoCompraItem> itens = criarItensValidos();

        PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, itens, AGORA);

        Ator ator = Ator.de(APROVADOR_1, "Aprovador 1", Set.of());

        assertThrows(RegraDeNegocioException.class,
                () -> pedido.registrarDecisao(ator, TipoDecisao.REJEITADO, null, AGORA));

        assertThrows(RegraDeNegocioException.class,
                () -> pedido.registrarDecisao(ator, TipoDecisao.REJEITADO, "", AGORA));

        assertThrows(RegraDeNegocioException.class,
                () -> pedido.registrarDecisao(ator, TipoDecisao.REJEITADO, "   ", AGORA));
    }

    @Test
    void devePermitirAprovacaoSemMotivo() {
        // Com null
        {
            NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1));
            List<PedidoCompraItem> itens = criarItensValidos();

            PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                    DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, itens, AGORA);

            Ator ator = Ator.de(APROVADOR_1, "Aprovador 1", Set.of());
            assertDoesNotThrow(() -> pedido.registrarDecisao(ator, TipoDecisao.APROVADO, null, AGORA));
        }

        // Com string vazia
        {
            NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1));
            List<PedidoCompraItem> itens = criarItensValidos();

            PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                    DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, itens, AGORA);

            Ator ator = Ator.de(APROVADOR_1, "Aprovador 1", Set.of());
            assertDoesNotThrow(() -> pedido.registrarDecisao(ator, TipoDecisao.APROVADO, "", AGORA));
        }

        // Com espaços em branco
        {
            NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1));
            List<PedidoCompraItem> itens = criarItensValidos();

            PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                    DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, itens, AGORA);

            Ator ator = Ator.de(APROVADOR_1, "Aprovador 1", Set.of());
            assertDoesNotThrow(() -> pedido.registrarDecisao(ator, TipoDecisao.APROVADO, "   ", AGORA));
        }
    }

    @Test
    void deveRetornarEtapaCorrenteQuandoPendente() {
        NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1, APROVADOR_2));
        List<PedidoCompraItem> itens = criarItensValidos();

        PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, itens, AGORA);

        assertTrue(pedido.etapaCorrente().isPresent());
        assertEquals(APROVADOR_1, pedido.etapaCorrente().get().usuarioId());
        assertEquals(1, pedido.etapaCorrente().get().ordem());
    }

    @Test
    void naoDeveRetornarEtapaCorrenteQuandoAprovado() {
        NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1));
        List<PedidoCompraItem> itens = criarItensValidos();

        PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, itens, AGORA);

        Ator ator = Ator.de(APROVADOR_1, "Aprovador 1", Set.of());
        pedido.registrarDecisao(ator, TipoDecisao.APROVADO, null, AGORA);

        assertTrue(pedido.etapaCorrente().isEmpty());
    }

    @Test
    void deveCalcularTotalCorretamenteComMultiplosItens() {
        NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.qualquerValor(), List.of(APROVADOR_1));
        List<PedidoCompraItem> itens = List.of(
                new PedidoCompraItem("Cimento", Quantidade.de(new BigDecimal("120")), "sc", ValorMonetario.de(new BigDecimal("32.90"))),
                new PedidoCompraItem("Areia", Quantidade.de(new BigDecimal("30")), "m3", ValorMonetario.de(new BigDecimal("95.00")))
        );

        PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, itens, AGORA);

        assertEquals(ValorMonetario.de(new BigDecimal("6798.0000")), pedido.valorTotal());
    }

    @Test
    void deveReconstituirPedidoPreservandoEstado() {
        NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1, APROVADOR_2));
        List<PedidoCompraItem> itens = criarItensValidos();

        PedidoCompra original = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, itens, AGORA);

        PedidoCompra reconstituido = PedidoCompra.reconstituir(
                original.id(), original.numero(), original.obraId(), original.fornecedorId(),
                original.dataPedido(), original.observacoes(), original.solicitanteId(),
                original.nivelOrigemId(), original.itens(), original.etapas(),
                original.situacao(), original.etapaAtual(), original.criadoEm());

        assertEquals(original.id(), reconstituido.id());
        assertEquals(original.numero(), reconstituido.numero());
        assertEquals(original.valorTotal(), reconstituido.valorTotal());
        assertEquals(original.situacao(), reconstituido.situacao());
        assertEquals(original.etapaAtual(), reconstituido.etapaAtual());
        assertEquals(original.totalEtapas(), reconstituido.totalEtapas());
        assertEquals(original.etapas().size(), reconstituido.etapas().size());
    }

    @Test
    void deveVerificarSePodeSerDecididoPorUsuarioCorreto() {
        NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1, APROVADOR_2));
        List<PedidoCompraItem> itens = criarItensValidos();

        PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, itens, AGORA);

        assertTrue(pedido.podeSerDecididoPor(APROVADOR_1));
        assertFalse(pedido.podeSerDecididoPor(APROVADOR_2));
        assertFalse(pedido.podeSerDecididoPor(UUID.randomUUID()));
    }

    @Test
    void naoDevePermitirDecisaoAposRejeicao() {
        NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1, APROVADOR_2));
        List<PedidoCompraItem> itens = criarItensValidos();

        PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, itens, AGORA);

        Ator ator1 = Ator.de(APROVADOR_1, "Aprovador 1", Set.of());
        pedido.registrarDecisao(ator1, TipoDecisao.REJEITADO, "Motivo", AGORA);

        Ator ator2 = Ator.de(APROVADOR_2, "Aprovador 2", Set.of());
        assertThrows(RegraDeNegocioException.class,
                () -> pedido.registrarDecisao(ator2, TipoDecisao.APROVADO, null, AGORA));
    }

    @Test
    void devePermitirExclusaoDePedidoPendenteParaOSolicitante() {
        NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1));
        PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, criarItensValidos(), AGORA);

        Ator solicitante = Ator.de(SOLICITANTE_ID, "Comprador", Set.of(Papel.COMPRADOR));

        assertDoesNotThrow(() -> pedido.verificarExclusao(solicitante));
    }

    @Test
    void devePermitirExclusaoDePedidoRejeitadoParaOSolicitante() {
        NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1));
        PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, criarItensValidos(), AGORA);
        pedido.registrarDecisao(Ator.de(APROVADOR_1, "Aprovador 1", Set.of()),
                TipoDecisao.REJEITADO, "Fora do orcamento", AGORA);

        Ator solicitante = Ator.de(SOLICITANTE_ID, "Comprador", Set.of(Papel.COMPRADOR));

        assertEquals(SituacaoPedido.REJEITADO, pedido.situacao());
        assertDoesNotThrow(() -> pedido.verificarExclusao(solicitante));
    }

    @Test
    void devePermitirExclusaoDePedidoPendenteParaAdminNaoSolicitante() {
        NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1));
        PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, criarItensValidos(), AGORA);

        Ator admin = Ator.de(UUID.randomUUID(), "Admin", Set.of(Papel.ADMIN));

        assertDoesNotThrow(() -> pedido.verificarExclusao(admin));
    }

    @Test
    void naoDevePermitirExclusaoParaQuemNaoESolicitanteNemAdmin() {
        NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1));
        PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, criarItensValidos(), AGORA);

        Ator outroComprador = Ator.de(UUID.randomUUID(), "Outro", Set.of(Papel.COMPRADOR));

        assertThrows(RegraDeNegocioException.class, () -> pedido.verificarExclusao(outroComprador));
    }

    @Test
    void naoDevePermitirExclusaoDePedidoAprovado() {
        NivelAlcada nivel = criarNivel(UUID.randomUUID(), FaixaValor.de(BigDecimal.ZERO, new BigDecimal("10000")), List.of(APROVADOR_1));
        PedidoCompra pedido = PedidoCompra.criar(UUID.randomUUID(), "PC-001", OBRA_ID, FORNECEDOR_ID,
                DATA_PEDIDO, "Obs", SOLICITANTE_ID, nivel, criarItensValidos(), AGORA);
        pedido.registrarDecisao(Ator.de(APROVADOR_1, "Aprovador 1", Set.of()),
                TipoDecisao.APROVADO, null, AGORA);

        Ator solicitante = Ator.de(SOLICITANTE_ID, "Comprador", Set.of(Papel.COMPRADOR));
        Ator admin = Ator.de(UUID.randomUUID(), "Admin", Set.of(Papel.ADMIN));

        assertEquals(SituacaoPedido.APROVADO, pedido.situacao());
        assertThrows(RegraDeNegocioException.class, () -> pedido.verificarExclusao(solicitante));
        assertThrows(RegraDeNegocioException.class, () -> pedido.verificarExclusao(admin));
    }
}