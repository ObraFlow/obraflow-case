package com.br.obraflow.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * Propriedades de configuracao da emissao de tokens (aplicacao.yml -&gt; {@code app.jwt}).
 */
@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {

    /** Segredo simetrico (HS256). Em producao vem de variavel de ambiente / secret manager. */
    private String secret;

    /** emissor do token ({@code iss}). */
    private String issuer = "obraflow";

    /** Validade do token de acesso. */
    private Duration expiration = Duration.ofHours(8);

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public String getIssuer() {
        return issuer;
    }

    public void setIssuer(String issuer) {
        this.issuer = issuer;
    }

    public Duration getExpiration() {
        return expiration;
    }

    public void setExpiration(Duration expiration) {
        this.expiration = expiration;
    }
}
