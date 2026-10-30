package com.br.obraflow.adapters.inbound.http;

import com.br.obraflow.adapters.inbound.http.dto.LoginRequest;
import com.br.obraflow.core.application.dto.result.TokenResultado;
import com.br.obraflow.core.application.dto.result.UsuarioResultado;
import com.br.obraflow.core.application.port.in.AutenticacaoUseCase;
import com.br.obraflow.core.application.port.in.UsuarioUseCase;
import com.br.obraflow.core.domain.pedido.Ator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints de autenticacao.
 */
@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Autenticacao", description = "Emissao de token e perfil do usuario autenticado")
public class AutenticacaoController {

    private final AutenticacaoUseCase autenticacao;
    private final UsuarioUseCase usuarios;
    private final AtorProvider atorProvider;

    public AutenticacaoController(AutenticacaoUseCase autenticacao,
                                  UsuarioUseCase usuarios,
                                  AtorProvider atorProvider) {
        this.autenticacao = autenticacao;
        this.usuarios = usuarios;
        this.atorProvider = atorProvider;
    }

    @PostMapping("/login")
    @Operation(summary = "Autentica o usuario e devolve um token JWT")
    public ResponseEntity<TokenResultado> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(autenticacao.autenticar(request.email(), request.senha()));
    }

    @GetMapping("/me")
    @Operation(summary = "Devolve o perfil do usuario autenticado (identidade extraida do token)")
    public ResponseEntity<UsuarioResultado> me() {
        Ator ator = atorProvider.atorAtual();
        return ResponseEntity.ok(usuarios.obter(ator.usuarioId()));
    }
}
