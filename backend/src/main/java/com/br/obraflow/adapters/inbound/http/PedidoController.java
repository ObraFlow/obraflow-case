package com.br.obraflow.adapters.inbound.http;

import com.br.obraflow.adapters.inbound.http.dto.DecisaoRequest;
import com.br.obraflow.adapters.inbound.http.dto.PedidoRequest;
import com.br.obraflow.core.application.dto.command.DecisaoComando;
import com.br.obraflow.core.application.dto.command.ItemPedidoComando;
import com.br.obraflow.core.application.dto.command.PedidoComando;
import com.br.obraflow.core.application.dto.result.PedidoPaginaResultado;
import com.br.obraflow.core.application.dto.result.PedidoResultado;
import com.br.obraflow.core.application.port.in.PedidoUseCase;
import com.br.obraflow.core.domain.pedido.Ator;
import com.br.obraflow.core.domain.pedido.FiltroPedido;
import com.br.obraflow.core.domain.pedido.SituacaoPedido;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/**
 * Endpoints dos pedidos de compra e das decisoes de alcada.
 */
@RestController
@RequestMapping("/api/v1/pedidos")
@Tag(name = "Pedidos", description = "Pedidos de compra e o fluxo de aprovacao por alcada")
public class PedidoController {

    private final PedidoUseCase pedidos;
    private final AtorProvider atorProvider;

    public PedidoController(PedidoUseCase pedidos, AtorProvider atorProvider) {
        this.pedidos = pedidos;
        this.atorProvider = atorProvider;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('COMPRADOR', 'ADMIN')")
    @Operation(summary = "Registra um pedido de compra (a alcada e' definida pelo valor total)")
    public ResponseEntity<PedidoResultado> criar(@Valid @RequestBody PedidoRequest request) {
        List<ItemPedidoComando> itens = request.itens().stream()
                .map(item -> new ItemPedidoComando(
                        item.descricao(),
                        item.quantidade(),
                        item.unidade(),
                        item.precoUnitario()))
                .toList();

        PedidoResultado resultado = pedidos.criar(new PedidoComando(
                request.obraId(),
                request.fornecedorId(),
                request.dataPedido(),
                request.observacoes(),
                itens), atorProvider.atorAtual());

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(resultado.id())
                .toUri();
        return ResponseEntity.created(location).body(resultado);
    }

    @GetMapping
    @Operation(summary = "Lista os pedidos, com filtros por situacao, obra, fornecedor, aprovador, busca livre e decisao pendente")
    public ResponseEntity<PedidoPaginaResultado> listar(
            @RequestParam(required = false) SituacaoPedido situacao,
            @RequestParam(required = false) UUID obraId,
            @RequestParam(required = false) UUID fornecedorId,
            @RequestParam(required = false) UUID aprovadorId,
            @RequestParam(required = false) String busca,
            @RequestParam(required = false) UUID aguardandoDecisaoDe,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamanho) {

        FiltroPedido filtro = new FiltroPedido(
                situacao, obraId, fornecedorId, aprovadorId, busca, aguardandoDecisaoDe, pagina, tamanho);
        return ResponseEntity.ok(pedidos.listar(filtro, atorProvider.atorAtual()));
    }

    @GetMapping("/{pedidoId}")
    @Operation(summary = "Detalha um pedido de compra")
    public ResponseEntity<PedidoResultado> obter(@PathVariable UUID pedidoId) {
        return ResponseEntity.ok(pedidos.obter(pedidoId, atorProvider.atorAtual()));
    }

    @PostMapping("/{pedidoId}/decisoes")
    @PreAuthorize("hasAnyRole('APROVADOR', 'ADMIN')")
    @Operation(summary = "Registra a decisao do aprovador sobre a etapa corrente")
    public ResponseEntity<PedidoResultado> registrarDecisao(
            @PathVariable UUID pedidoId,
            @Valid @RequestBody DecisaoRequest request) {

        PedidoResultado resultado = pedidos.registrarDecisao(
                pedidoId,
                new DecisaoComando(request.decisao(), request.motivo()),
                atorProvider.atorAtual());
        return ResponseEntity.ok(resultado);
    }

    @DeleteMapping("/{pedidoId}")
    @PreAuthorize("hasAnyRole('COMPRADOR', 'ADMIN')")
    @Operation(summary = "Exclui um pedido pendente ou rejeitado (somente solicitante ou admin)")
    public ResponseEntity<Void> excluir(@PathVariable UUID pedidoId) {
        pedidos.excluir(pedidoId, atorProvider.atorAtual());
        return ResponseEntity.noContent().build();
    }
}
