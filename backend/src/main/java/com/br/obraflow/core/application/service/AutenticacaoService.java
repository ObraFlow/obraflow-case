package com.br.obraflow.core.application.service;

import com.br.obraflow.core.application.dto.result.TokenResultado;
import com.br.obraflow.core.application.dto.result.UsuarioResultado;
import com.br.obraflow.core.application.port.in.AutenticacaoUseCase;
import com.br.obraflow.core.application.port.out.PasswordEncoderPort;
import com.br.obraflow.core.application.port.out.TokenIssuerPort;
import com.br.obraflow.core.domain.exception.RegraDeNegocioException;
import com.br.obraflow.core.domain.repository.UsuarioRepository;
import com.br.obraflow.core.domain.usuario.Usuario;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

/**
 * Implementacao do caso de uso de autenticacao.
 */
@Service
public class AutenticacaoService implements AutenticacaoUseCase {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoderPort passwordEncoder;
    private final TokenIssuerPort tokenIssuer;

    public AutenticacaoService(UsuarioRepository usuarioRepository,
                               PasswordEncoderPort passwordEncoder,
                               TokenIssuerPort tokenIssuer) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenIssuer = tokenIssuer;
    }

    @Override
    @Transactional(readOnly = true)
    public TokenResultado autenticar(String email, String senha) {
        if (email == null || email.isBlank() || senha == null || senha.isBlank()) {
            throw new RegraDeNegocioException("Informe e-mail e senha para entrar.");
        }
        Usuario usuario = usuarioRepository.porEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new RegraDeNegocioException("Credenciais invalidas."));
        if (!usuario.ativo()) {
            throw new RegraDeNegocioException("Usuario inativo. Procure o administrador do ObraFlow.");
        }
        if (!passwordEncoder.corresponde(senha, usuario.senhaHash())) {
            throw new RegraDeNegocioException("Credenciais invalidas.");
        }

        TokenIssuerPort.TokenJwt token = tokenIssuer.emitir(usuario);
        Instant agora = Instant.now();
        long expiraEmSegundos = Math.max(0, Duration.between(agora, token.expiraEm()).toSeconds());

        return new TokenResultado(token.token(), "Bearer", expiraEmSegundos, token.expiraEm(),
                new UsuarioResultado(usuario.id(), usuario.nome(), usuario.email(), usuario.cargo(),
                        usuario.ativo(), usuario.papeis(), usuario.criadoEm()));
    }
}
