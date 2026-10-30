package com.br.obraflow.adapters.inbound.http;

import com.br.obraflow.adapters.inbound.http.dto.UsuarioRequest;
import com.br.obraflow.core.application.dto.command.UsuarioComando;
import com.br.obraflow.core.application.dto.result.UsuarioResultado;
import com.br.obraflow.core.application.port.in.UsuarioUseCase;
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
 * Endpoints de cadastro de usuarios.
 */
@RestController
@RequestMapping("/api/v1/usuarios")
@Tag(name = "Usuarios", description = "Cadastro dos usuarios e dos aprovadores")
public class UsuarioController {

    private final UsuarioUseCase usuarios;

    public UsuarioController(UsuarioUseCase usuarios) {
        this.usuarios = usuarios;
    }

    @GetMapping
    @Operation(summary = "Lista os usuarios")
    public ResponseEntity<List<UsuarioResultado>> listar() {
        return ResponseEntity.ok(usuarios.listar());
    }

    @GetMapping("/{usuarioId}")
    @Operation(summary = "Detalha um usuario")
    public ResponseEntity<UsuarioResultado> obter(@PathVariable UUID usuarioId) {
        return ResponseEntity.ok(usuarios.obter(usuarioId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Cadastra um novo usuario")
    public ResponseEntity<UsuarioResultado> criar(@Valid @RequestBody UsuarioRequest request) {
        UsuarioResultado resultado = usuarios.criar(new UsuarioComando(
                request.nome(),
                request.email(),
                request.senha(),
                request.cargo(),
                request.papeis()));

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(resultado.id())
                .toUri();
        return ResponseEntity.created(location).body(resultado);
    }
}
