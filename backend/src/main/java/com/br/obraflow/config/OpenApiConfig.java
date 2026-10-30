package com.br.obraflow.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Documentacao da API (OpenAPI / Swagger UI).
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI obraflowOpenApi() {
        String esquema = "bearerAuth";
        return new OpenAPI()
                .info(new Info()
                        .title("ObraFlow - API de Alcadas de Aprovacao")
                        .version("1.0.0")
                        .description("""
                                API do desafio tecnico ObraFlow/Dokimos: cadastro de obras, regras de
                                alcada por faixa de valor e o fluxo de aprovacao dos pedidos de compra.

                                A autenticacao e' feita por JWT (HS256). Use `POST /api/v1/auth/login`
                                para obter o token e informe-o no botao **Authorize** do Swagger UI.
                                """)
                        .contact(new Contact().name("Desafio ObraFlow")))
                .components(new Components().addSecuritySchemes(esquema, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList(esquema));
    }
}
