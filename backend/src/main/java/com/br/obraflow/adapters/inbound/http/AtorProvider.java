package com.br.obraflow.adapters.inbound.http;

import com.br.obraflow.core.domain.pedido.Ator;
import com.br.obraflow.core.domain.usuario.Papel;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Extrai o ator autenticado do token JWT.
 * <p>
 * A identidade vem sempre do token ({@code sub}), nunca do corpo da requisicao.
 */
@Component
public class AtorProvider {

    public Ator atorAtual() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken jwtAuthentication) {
            return Ator.de(
                    UUID.fromString(jwtAuthentication.getToken().getSubject()),
                    jwtAuthentication.getToken().getClaimAsString("nome"),
                    papeis(jwtAuthentication.getToken().getClaimAsStringList("papeis")));
        }
        throw new IllegalStateException("Nao' ha' usuario autenticado na requisicao.");
    }

    private Set<Papel> papeis(List<String> claim) {
        if (claim == null || claim.isEmpty()) {
            return Set.of();
        }
        Set<Papel> papeis = new LinkedHashSet<>();
        for (String valor : claim) {
            papeis.add(Papel.valueOf(valor));
        }
        return papeis;
    }
}
