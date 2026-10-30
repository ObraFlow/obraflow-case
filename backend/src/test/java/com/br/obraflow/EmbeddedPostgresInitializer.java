package com.br.obraflow;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.flywaydb.core.Flyway;
import org.springframework.boot.test.util.TestPropertyValues;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;

import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Sobe um PostgreSQL embarcado, roda as migracoes e popula a base de teste
 * <b>antes</b> do contexto Spring subir.
 * <p>
 * Os ITs usam ids fixos (obra 11111111, fornecedor 22222222, solicitante 33333333,
 * aprovadores 33333333/44444444) porque as FKs de {@code pedido_compra.solicitante_id}
 * e {@code etapa_alcada.usuario_id} referenciam {@code usuario}. Sem este seed, todo
 * teste que criava um pedido falhava com violacao de FK (e nunca rodava: o Surefire
 * padrao nao inclui {@code *}IT.java}).
 */
public class EmbeddedPostgresInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    private static final String USUARIO_SOLICITANTE = "33333333-3333-3333-3333-333333333333";
    private static final String USUARIO_APROVADOR_2 = "44444444-4444-4444-4444-444444444444";
    private static final String OBRA_TESTE = "11111111-1111-1111-1111-111111111111";
    private static final String FORNECEDOR_TESTE = "22222222-2222-2222-2222-222222222222";
    private static final String NIVEL_FAIXA_BAIXA = "55555555-5555-5555-5555-555555555555";
    private static final String NIVEL_FAIXA_MEDIA = "66666666-6666-6666-6666-666666666666";

    private static EmbeddedPostgres embeddedPostgres;

    @Override
    public void initialize(ConfigurableApplicationContext applicationContext) {
        try {
            embeddedPostgres = EmbeddedPostgres.builder()
                    .setPort(0)
                    .start();

            String jdbcUrl = embeddedPostgres.getJdbcUrl("postgres", "postgres");
            TestPropertyValues.of(
                    "spring.datasource.url=" + jdbcUrl,
                    "spring.datasource.username=postgres",
                    "spring.datasource.password=postgres",
                    "spring.flyway.enabled=true",
                    "app.demo.enabled=false"
            ).applyTo(applicationContext);

            // Migra antes do contexto (o Flyway do Spring encontra base atualizada e nao refaz nada)
            // e entao popula os registros fixos dos testes.
            Flyway.configure()
                    .dataSource(jdbcUrl, "postgres", "postgres")
                    .load()
                    .migrate();
            popularDadosDeTeste(jdbcUrl);
        } catch (IOException e) {
            throw new RuntimeException("Failed to start embedded Postgres", e);
        }
    }

    private void popularDadosDeTeste(String jdbcUrl) {
        try (Connection connection = DriverManager.getConnection(jdbcUrl, "postgres", "postgres");
             Statement statement = connection.createStatement()) {

            executar(statement, "INSERT INTO usuario (id, nome, email, senha_hash) VALUES "
                    + "('" + USUARIO_SOLICITANTE + "', 'Amanda Teste', 'amanda.teste@obraflow.test', 'x'), "
                    + "('" + USUARIO_APROVADOR_2 + "', 'Joao Teste', 'joao.teste@obraflow.test', 'x') "
                    + "ON CONFLICT (id) DO NOTHING");

            executar(statement, "INSERT INTO obra (id, codigo, nome) VALUES "
                    + "('" + OBRA_TESTE + "', 'OBRA-T1', 'Edificio Horizonte') "
                    + "ON CONFLICT (id) DO NOTHING");

            executar(statement, "INSERT INTO fornecedor (id, nome, documento, ativo) VALUES "
                    + "('" + FORNECEDOR_TESTE + "', 'Construtora Alfa', '11222333000181', TRUE) "
                    + "ON CONFLICT (id) DO NOTHING");

            // Duas faixas nao sobrepostas para a obra de teste:
            //   [0, 10k)    -> 1 aprovador  (Amanda)
            //   [10k, 100k) -> 2 aprovadores (Amanda, Joao)
            executar(statement, "INSERT INTO nivel_alcada (id, obra_id, limite_inferior, limite_superior, descricao) VALUES "
                    + "('" + NIVEL_FAIXA_BAIXA + "', '" + OBRA_TESTE + "', 0, 10000, 'Faixa baixa'), "
                    + "('" + NIVEL_FAIXA_MEDIA + "', '" + OBRA_TESTE + "', 10000, 100000, 'Faixa media') "
                    + "ON CONFLICT (id) DO NOTHING");

            executar(statement, "INSERT INTO aprovador_nivel (id, nivel_alcada_id, usuario_id, ordem) VALUES "
                    + "('77777777-7777-7777-7777-777777777777', '" + NIVEL_FAIXA_BAIXA + "', '" + USUARIO_SOLICITANTE + "', 1), "
                    + "('88888888-8888-8888-8888-888888888888', '" + NIVEL_FAIXA_MEDIA + "', '" + USUARIO_SOLICITANTE + "', 1), "
                    + "('99999999-9999-9999-9999-999999999999', '" + NIVEL_FAIXA_MEDIA + "', '" + USUARIO_APROVADOR_2 + "', 2) "
                    + "ON CONFLICT (id) DO NOTHING");
        } catch (SQLException e) {
            throw new RuntimeException("Falha ao popular base de teste", e);
        }
    }

    private static void executar(Statement statement, String sql) throws SQLException {
        statement.execute(sql);
    }

    public static String usuarioSolicitante() {
        return USUARIO_SOLICITANTE;
    }

    public static String usuarioAprovador2() {
        return USUARIO_APROVADOR_2;
    }

    public static void stop() {
        if (embeddedPostgres != null) {
            try {
                embeddedPostgres.close();
            } catch (IOException e) {
                throw new RuntimeException("Failed to stop embedded Postgres", e);
            }
        }
    }
}
