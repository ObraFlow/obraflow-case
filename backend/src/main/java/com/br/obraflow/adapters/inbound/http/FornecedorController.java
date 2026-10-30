package com.br.obraflow.adapters.inbound.http;

import com.br.obraflow.adapters.inbound.http.dto.FornecedorRequest;
import com.br.obraflow.core.application.dto.command.FornecedorComando;
import com.br.obraflow.core.application.dto.result.FornecedorResultado;
import com.br.obraflow.core.application.port.in.FornecedorUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/**
 * Endpoints de cadastro de fornecedores.
 */
@RestController
@RequestMapping("/api/v1/fornecedores")
@Tag(name = "Fornecedores", description = "Cadastro dos fornecedores dos pedidos de compra")
public class FornecedorController {

    private final FornecedorUseCase fornecedores;

    public FornecedorController(FornecedorUseCase fornecedores) {
        this.fornecedores = fornecedores;
    }

    @GetMapping
    @Operation(summary = "Lista os fornecedores")
    public ResponseEntity<List<FornecedorResultado>> listar() {
        return ResponseEntity.ok(fornecedores.listar());
    }

    @GetMapping("/{fornecedorId}")
    @Operation(summary = "Detalha um fornecedor")
    public ResponseEntity<FornecedorResultado> obter(@PathVariable UUID fornecedorId) {
        return ResponseEntity.ok(fornecedores.obter(fornecedorId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Cadastra um novo fornecedor")
    public ResponseEntity<FornecedorResultado> criar(@Valid @RequestBody FornecedorRequest request) {
        FornecedorResultado resultado = fornecedores.criar(new FornecedorComando(
                request.nome(), request.documento(), request.email(), request.telefone()));

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(resultado.id())
                .toUri();
        return ResponseEntity.created(location).body(resultado);
    }
}
