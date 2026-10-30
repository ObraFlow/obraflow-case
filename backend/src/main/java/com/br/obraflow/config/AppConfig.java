package com.br.obraflow.config;

import com.br.obraflow.core.domain.alcada.ServicoAlcada;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * Configuracoes transversais da aplicacao.
 */
@Configuration
public class AppConfig {

    /**
     * Relogio injetado nos casos de uso - permite congelar o tempo nos testes.
     */
    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }

    /**
     * Servico de dominio registrado como bean. O nucleo nao depende do Spring:
     * quem faz a ligacao e o container de configuracao.
     */
    @Bean
    public ServicoAlcada servicoAlcada() {
        return new ServicoAlcada();
    }
}
