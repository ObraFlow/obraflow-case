package com.br.obraflow;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.extension.AfterAllCallback;
import org.junit.jupiter.api.extension.BeforeAllCallback;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.springframework.boot.test.util.TestPropertyValues;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;

import java.io.IOException;

public class EmbeddedPostgresExtension implements BeforeAllCallback, AfterAllCallback {

    private static EmbeddedPostgres embeddedPostgres;

    @Override
    public void beforeAll(ExtensionContext context) throws IOException {
        embeddedPostgres = EmbeddedPostgres.builder()
                .setPort(0)
                .start();

        String jdbcUrl = embeddedPostgres.getJdbcUrl("postgres", "postgres");
        TestPropertyValues.of(
                "spring.datasource.url=" + jdbcUrl,
                "spring.datasource.username=postgres",
                "spring.datasource.password=postgres",
                "spring.flyway.enabled=true"
        ).applyTo((ConfigurableApplicationContext) context.getRoot().getStore(ExtensionContext.Namespace.GLOBAL).get("applicationContext"));
    }

    @Override
    public void afterAll(ExtensionContext context) {
        if (embeddedPostgres != null) {
            try {
                embeddedPostgres.close();
            } catch (IOException e) {
                throw new RuntimeException("Failed to close embedded Postgres", e);
            }
        }
    }

    public static class Initializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {
        @Override
        public void initialize(ConfigurableApplicationContext applicationContext) {
            // Properties will be set by the extension
        }
    }
}