package com.br.obraflow.adapters.outbound.persistence;

import com.br.obraflow.EmbeddedPostgresInitializer;
import com.br.obraflow.core.application.port.in.PedidoUseCase;
import com.br.obraflow.core.application.dto.command.ItemPedidoComando;
import com.br.obraflow.core.application.dto.command.PedidoComando;
import com.br.obraflow.core.domain.pedido.Ator;
import com.br.obraflow.core.domain.pedido.FiltroPedido;
import com.br.obraflow.core.domain.pedido.SituacaoPedido;
import com.br.obraflow.core.domain.usuario.Papel;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ContextConfiguration;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ContextConfiguration(initializers = EmbeddedPostgresInitializer.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class PedidoRepositoryIT {

    @Autowired
    private PedidoUseCase pedidoUseCase;

    @Test
    void deveCriarEPersistirPedidoComItensECadeia() {
        UUID obraId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID fornecedorId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        UUID solicitanteId = UUID.fromString("33333333-3333-3333-3333-333333333333");

        List<ItemPedidoComando> itens = List.of(
                new ItemPedidoComando("Cimento", new BigDecimal("100"), "sc", new BigDecimal("32.90")),
                new ItemPedidoComando("Areia", new BigDecimal("30"), "m3", new BigDecimal("95.00"))
        );

        PedidoComando comando = new PedidoComando(obraId, fornecedorId, LocalDate.now(), "Obs", itens);
        Ator ator = Ator.de(solicitanteId, "Comprador", Set.of(Papel.COMPRADOR));

        var resultado = pedidoUseCase.criar(comando, ator);

        assertNotNull(resultado.id());
        assertNotNull(resultado.numero());
        assertEquals(new BigDecimal("6140.0000"), resultado.valorTotal());
        assertEquals(2, resultado.quantidadeItens());
        assertEquals(SituacaoPedido.PENDENTE, resultado.situacao());
        assertEquals(1, resultado.etapaAtual());
        assertEquals(1, resultado.totalEtapas());
    }

    @Test
    void deveListarPedidosComFiltros() {
        UUID obraId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID fornecedorId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        UUID solicitanteId = UUID.fromString("33333333-3333-3333-3333-333333333333");

        List<ItemPedidoComando> itens = List.of(
                new ItemPedidoComando("Item", new BigDecimal("1"), "un", new BigDecimal("100"))
        );

        PedidoComando comando = new PedidoComando(obraId, fornecedorId, LocalDate.now(), "Obs", itens);
        Ator ator = Ator.de(solicitanteId, "Comprador", Set.of(Papel.COMPRADOR));

        var criado = pedidoUseCase.criar(comando, ator);

        FiltroPedido filtro = new FiltroPedido(null, obraId, null, null, null, null, 0, 20);
        var pagina = pedidoUseCase.listar(filtro, ator);

        // Outros testes da classe tambem criam pedidos na mesma obra; garante que o
        // criado aqui aparece no resultado do filtro.
        assertTrue(pagina.totalElementos() >= 1);
        assertTrue(pagina.conteudo().stream().anyMatch(p -> p.id().equals(criado.id())));
    }

    @Test
    void deveObterPedidoPorId() {
        UUID obraId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID fornecedorId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        UUID solicitanteId = UUID.fromString("33333333-3333-3333-3333-333333333333");

        List<ItemPedidoComando> itens = List.of(
                new ItemPedidoComando("Item", new BigDecimal("1"), "un", new BigDecimal("100"))
        );

        PedidoComando comando = new PedidoComando(obraId, fornecedorId, LocalDate.now(), "Obs", itens);
        Ator ator = Ator.de(solicitanteId, "Comprador", Set.of(Papel.COMPRADOR));

        var criado = pedidoUseCase.criar(comando, ator);

        var obtido = pedidoUseCase.obter(criado.id(), ator);

        assertEquals(criado.id(), obtido.id());
        assertEquals(criado.numero(), obtido.numero());
        assertEquals(criado.valorTotal(), obtido.valorTotal());
    }

    @Test
    void deveBuscarPedidosPorNumeroObraFornecedor() {
        UUID obraId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID fornecedorId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        Ator ator = Ator.de(UUID.fromString(EmbeddedPostgresInitializer.usuarioSolicitante()),
                "Amanda Teste", Set.of(Papel.COMPRADOR));
        List<ItemPedidoComando> itens = List.of(
                new ItemPedidoComando("Item", new BigDecimal("1"), "un", new BigDecimal("100")));

        var criado = pedidoUseCase.criar(
                new PedidoComando(obraId, fornecedorId, LocalDate.now(), "Obs", itens), ator);

        // 1) busca pelo numero exato do pedido
        var porNumero = pedidoUseCase.listar(
                new FiltroPedido(null, null, null, null, criado.numero(), null, 0, 20), ator);
        assertEquals(1, porNumero.totalElementos());
        assertEquals(criado.id(), porNumero.conteudo().get(0).id());

        // 2) busca pelo nome da obra (seed: "Edificio Horizonte")
        var porObra = pedidoUseCase.listar(
                new FiltroPedido(null, null, null, null, "edificio", null, 0, 20), ator);
        assertTrue(porObra.totalElementos() >= 1);
        assertTrue(porObra.conteudo().stream().anyMatch(p -> p.id().equals(criado.id())));

        // 3) busca sem correspondencia nao retorna nada
        var semCorrespondencia = pedidoUseCase.listar(
                new FiltroPedido(null, null, null, null, "nao-existe-xyz", null, 0, 20), ator);
        assertEquals(0, semCorrespondencia.totalElementos());
    }

    @Test
    void deveFiltrarPedidosAguardandoDecisaoDoUsuario() {
        UUID obraId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID fornecedorId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        UUID naoAprovador = UUID.randomUUID();
        Ator solicitante = Ator.de(UUID.fromString(EmbeddedPostgresInitializer.usuarioSolicitante()),
                "Amanda Teste", Set.of(Papel.COMPRADOR));

        var pedido = pedidoUseCase.criar(
                new PedidoComando(obraId, fornecedorId, LocalDate.now(), "Obs",
                        List.of(new ItemPedidoComando("Item", new BigDecimal("1"), "un", new BigDecimal("100")))),
                solicitante);

        // O aprovador da etapa corrente vem do proprio detalhe do pedido.
        var detalhe = pedidoUseCase.obter(pedido.id(), solicitante);
        UUID aprovadorAtual = detalhe.alcada().etapas().get(0).aprovador().usuarioId();

        var aguardandoAprovador = pedidoUseCase.listar(
                new FiltroPedido(null, null, null, null, null, aprovadorAtual, 0, 20), solicitante);
        assertTrue(aguardandoAprovador.totalElementos() >= 1);
        assertTrue(aguardandoAprovador.conteudo().stream().anyMatch(p -> p.id().equals(pedido.id())));

        // Usuario que nao e' aprovador de nada pendente nao recebe o pedido.
        var aguardandoOutro = pedidoUseCase.listar(
                new FiltroPedido(null, null, null, null, null, naoAprovador, 0, 20), solicitante);
        assertEquals(0, aguardandoOutro.totalElementos());
    }

    @Test
    void deveExcluirPedidoPendenteDoSolicitante() {
        UUID obraId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID fornecedorId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        UUID solicitanteId = UUID.fromString(EmbeddedPostgresInitializer.usuarioSolicitante());
        Ator ator = Ator.de(solicitanteId, "Amanda Teste", Set.of(Papel.COMPRADOR));

        var criado = pedidoUseCase.criar(
                new PedidoComando(obraId, fornecedorId, LocalDate.now(), "Obs",
                        List.of(new ItemPedidoComando("Item", new BigDecimal("1"), "un", new BigDecimal("100")))),
                ator);

        pedidoUseCase.excluir(criado.id(), ator);

        assertThrows(com.br.obraflow.core.domain.exception.EntidadeNaoEncontradaException.class,
                () -> pedidoUseCase.obter(criado.id(), ator));
    }

    @Test
    void naoDeveExcluirPedidoDeOutroSolicitanteSemSerAdmin() {
        UUID obraId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID fornecedorId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        Ator solicitante = Ator.de(UUID.fromString(EmbeddedPostgresInitializer.usuarioSolicitante()),
                "Amanda Teste", Set.of(Papel.COMPRADOR));
        Ator outro = Ator.de(UUID.randomUUID(), "Outro Comprador", Set.of(Papel.COMPRADOR));

        var criado = pedidoUseCase.criar(
                new PedidoComando(obraId, fornecedorId, LocalDate.now(), "Obs",
                        List.of(new ItemPedidoComando("Item", new BigDecimal("1"), "un", new BigDecimal("100")))),
                solicitante);

        assertThrows(com.br.obraflow.core.domain.exception.RegraDeNegocioException.class,
                () -> pedidoUseCase.excluir(criado.id(), outro));

        // pedido continua existindo
        assertNotNull(pedidoUseCase.obter(criado.id(), solicitante));
    }
}