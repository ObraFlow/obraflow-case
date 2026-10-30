package com.br.obraflow.adapters.inbound.http;

import com.br.obraflow.adapters.inbound.http.dto.ObraRequest;
import com.br.obraflow.core.application.dto.command.ObraComando;
import com.br.obraflow.core.application.dto.result.ObraResultado;
import com.br.obraflow.core.application.port.in.ObraUseCase;
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
 * Endpoints de cadastro de obras.
 */
@RestController
@RequestMapping("/api/v1/obras")
@Tag(name = "Obras", description = "Cadastro das obras (projetos)")
public class ObraController {

    private final ObraUseCase obras;

    public ObraController(ObraUseCase obras) {
        this.obras = obras;
    }

    @GetMapping
    @Operation(summary = "Lista as obras")
    public ResponseEntity<List<ObraResultado>> listar() {
        return ResponseEntity.ok(obras.listar());
    }

    @GetMapping("/{obraId}")
    @Operation(summary = "Detalha uma obra")
    public ResponseEntity<ObraResultado> obter(@PathVariable UUID obraId) {
        return ResponseEntity.ok(obras.obter(obraId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Cadastra uma nova obra")
    public ResponseEntity<ObraResultado> criar(@Valid @RequestBody ObraRequest request) {
        ObraResultado resultado = obras.criar(new ObraComando(
                request.codigo(), request.nome(), request.endereco()));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(resultado.id())
                .toUri();
        return ResponseEntity.created(location).body(resultado);
    }
}
