package com.br.obraflow.adapters.outbound.seguranca;

import com.br.obraflow.core.application.port.out.PasswordEncoderPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Adaptador da porta de codificacao de senhas, apoiado em BCrypt.
 */
@Component
public class BCryptPasswordEncoderAdapter implements PasswordEncoderPort {

    private final PasswordEncoder encoder;

    public BCryptPasswordEncoderAdapter(PasswordEncoder encoder) {
        this.encoder = encoder;
    }

    @Override
    public String codificar(String senha) {
        return encoder.encode(senha);
    }

    @Override
    public boolean corresponde(String senha, String hash) {
        if (senha == null || hash == null || hash.isBlank()) {
            return false;
        }
        return encoder.matches(senha, hash);
    }
}
