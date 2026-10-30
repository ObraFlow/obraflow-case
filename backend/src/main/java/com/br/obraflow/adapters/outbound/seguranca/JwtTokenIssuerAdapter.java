package com.br.obraflow.adapters.outbound.seguranca;

import com.br.obraflow.config.JwtProperties;
import com.br.obraflow.core.application.port.out.TokenIssuerPort;
import com.br.obraflow.core.domain.usuario.Usuario;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

/**
 * Adaptador da porta de emissao de tokens: gera um JWT assinado com HS256.
 * <p>
 * O {@code sub} carrega o id do usuario e e' a unica fonte de identidade aceita
 * pela API - o corpo da requisicao nunca define quem esta agindo.
 */
@Component
public class JwtTokenIssuerAdapter implements TokenIssuerPort {

    private final JwtEncoder jwtEncoder;
    private final JwtProperties properties;
    private final Clock clock;

    public JwtTokenIssuerAdapter(JwtEncoder jwtEncoder, JwtProperties properties, Clock clock) {
        this.jwtEncoder = jwtEncoder;
        this.properties = properties;
        this.clock = clock;
    }

    @Override
    public TokenJwt emitir(Usuario usuario) {
        Instant agora = clock.instant();
        Instant expiraEm = agora.plus(properties.getExpiration());

        List<String> papeis = usuario.papeis().stream()
                .map(Enum::name)
                .sorted()
                .toList();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(properties.getIssuer())
                .issuedAt(agora)
                .expiresAt(expiraEm)
                .subject(usuario.id().toString())
                .claim("email", usuario.email())
                .claim("nome", usuario.nome())
                .claim("papeis", papeis)
                .build();

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();

        return new TokenJwt(token, expiraEm);
    }
}
