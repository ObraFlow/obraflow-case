package com.br.obraflow.core.application.service;

import com.br.obraflow.core.application.dto.command.UsuarioComando;
import com.br.obraflow.core.application.dto.result.UsuarioResultado;
import com.br.obraflow.core.application.port.in.UsuarioUseCase;
import com.br.obraflow.core.application.port.out.PasswordEncoderPort;
import com.br.obraflow.core.domain.exception.ArgumentoInvalidoException;
import com.br.obraflow.core.domain.exception.ConflitoException;
import com.br.obraflow.core.domain.exception.EntidadeNaoEncontradaException;
import com.br.obraflow.core.domain.repository.UsuarioRepository;
import com.br.obraflow.core.domain.usuario.Papel;
import com.br.obraflow.core.domain.usuario.Usuario;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Implementacao dos casos de uso do cadastro de usuarios.
 */
@Service
public class UsuarioService implements UsuarioUseCase {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoderPort passwordEncoder;
    private final Clock clock;

    public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoderPort passwordEncoder, Clock clock) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public List<UsuarioResultado> listar() {
        return usuarioRepository.listar().stream().map(this::montarResultado).toList();
    }

    @Override
    @Transactional
    public UsuarioResultado criar(UsuarioComando comando) {
        String email = normalizarEmail(comando.email());
        if (usuarioRepository.existePorEmail(email)) {
            throw new ConflitoException("Ja' existe um usuario cadastrado com o e-mail " + email + ".");
        }
        Set<Papel> papeis = comando.papeis() == null || comando.papeis().isEmpty()
                ? EnumSet.of(Papel.COMPRADOR)
                : comando.papeis();

        Usuario usuario = Usuario.novo(UUID.randomUUID(), comando.nome(), email,
                passwordEncoder.codificar(comando.senha()), comando.cargo(), papeis, clock.instant());
        return montarResultado(usuarioRepository.salvar(usuario));
    }

    @Override
    @Transactional(readOnly = true)
    public UsuarioResultado obter(UUID usuarioId) {
        return usuarioRepository.porId(usuarioId)
                .map(this::montarResultado)
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Usuario nao encontrado: " + usuarioId));
    }

    private String normalizarEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new ArgumentoInvalidoException("O e-mail do usuario e' obrigatorio.");
        }
        return email.trim().toLowerCase();
    }

    private UsuarioResultado montarResultado(Usuario usuario) {
        return new UsuarioResultado(usuario.id(), usuario.nome(), usuario.email(), usuario.cargo(),
                usuario.ativo(), usuario.papeis(), usuario.criadoEm());
    }
}
