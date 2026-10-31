package com.obraflow.demo;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Checks the demo profile against PostgreSQL, including a second idempotent execution. */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("demo-data")
class DemoDataSeederIntegrationTest {
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine")
            .withDatabaseName("obraflow_demo_test")
            .withUsername("obraflow")
            .withPassword("obraflow_test");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired DemoDataSeeder seeder;

    @Test
    void seedsExpandedDatasetWithThresholdsAndCanRunAgainWithoutDuplicatingData() {
        assertEquals(5, demoCount("works", "code LIKE 'DEMO-%'"));
        assertEquals(10, demoCount("app_users", "email LIKE '%@demo.obraflow.local'"));
        assertEquals(7, demoCount("suppliers", "tax_id LIKE 'DEMO-%'"));
        assertEquals(14, demoCount("purchase_orders", "internal_notes LIKE 'DEMO: %'"));
        assertEquals(13, jdbc.queryForObject("SELECT count(*) FROM approval_bands b JOIN works w ON w.id=b.work_id WHERE w.code LIKE 'DEMO-%'", Integer.class));
        assertEquals(28, jdbc.queryForObject("SELECT count(*) FROM purchase_order_items i JOIN purchase_orders o ON o.id=i.order_id WHERE o.internal_notes LIKE 'DEMO: %'", Integer.class));
        assertEquals(15, jdbc.queryForObject("SELECT count(*) FROM purchase_order_decisions d JOIN purchase_orders o ON o.id=d.order_id WHERE o.internal_notes LIKE 'DEMO: %'", Integer.class));

        assertOrder("DEMO: 01-pendente", "PENDING", 1, 0, "joana.ribeiro@demo.obraflow.local");
        assertOrder("DEMO: 02-em-aprovacao", "PENDING", 2, 1, "marcelo.nunes@demo.obraflow.local");
        assertOrder("DEMO: 03-aprovado", "APPROVED", null, 2, null);
        assertOrder("DEMO: 04-rejeitado", "REJECTED", null, 1, null);
        assertOrder("DEMO: 05-custo-zero", "PENDING", 1, 0, "camila.souza@demo.obraflow.local");
        assertOrder("DEMO: 06-limite-5000-em-aprovacao", "PENDING", 2, 1, "diego.martins@demo.obraflow.local");
        assertOrder("DEMO: 07-limite-20000-terceiro-nivel", "PENDING", 3, 2, "elisa.ferreira@demo.obraflow.local");
        assertOrder("DEMO: 08-aprovado-uma-etapa", "APPROVED", null, 1, null);
        assertOrder("DEMO: 09-aprovado-duas-etapas", "APPROVED", null, 2, null);
        assertOrder("DEMO: 10-rejeitado-segundo-nivel", "REJECTED", null, 2, null);
        assertOrder("DEMO: 11-rejeitado-terceiro-nivel", "REJECTED", null, 3, null);
        assertOrder("DEMO: 12-pendente-faixa-media", "PENDING", 1, 0, "joana.ribeiro@demo.obraflow.local");
        assertOrder("DEMO: 13-pendente-limite-20000", "PENDING", 1, 0, "joana.ribeiro@demo.obraflow.local");
        assertOrder("DEMO: 14-pendente-limite-25000", "PENDING", 1, 0, "bruno.lima@demo.obraflow.local");
        assertBandMinimum("DEMO: 06-limite-5000-em-aprovacao", "5000.00");
        assertBandMinimum("DEMO: 07-limite-20000-terceiro-nivel", "20000.00");
        assertBandMinimum("DEMO: 13-pendente-limite-20000", "20000.00");
        assertBandMinimum("DEMO: 14-pendente-limite-25000", "25000.00");
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM purchase_orders WHERE internal_notes='DEMO: 05-custo-zero' AND total_amount=0", Integer.class));
        assertEquals(3, jdbc.queryForObject("SELECT count(*) FROM purchase_order_decisions d JOIN purchase_orders o ON o.id=d.order_id WHERE o.internal_notes LIKE 'DEMO: %' AND d.outcome='REJECTED' AND length(trim(d.reason)) > 0", Integer.class));

        seeder.run();

        assertEquals(5, demoCount("works", "code LIKE 'DEMO-%'"));
        assertEquals(10, demoCount("app_users", "email LIKE '%@demo.obraflow.local'"));
        assertEquals(14, demoCount("purchase_orders", "internal_notes LIKE 'DEMO: %'"));
        assertEquals(15, jdbc.queryForObject("SELECT count(*) FROM purchase_order_decisions d JOIN purchase_orders o ON o.id=d.order_id WHERE o.internal_notes LIKE 'DEMO: %'", Integer.class));

        removeExpandedFixturesToSimulateLegacySeed();
        assertEquals(2, demoCount("works", "code LIKE 'DEMO-%'"));
        assertEquals(4, demoCount("app_users", "email LIKE '%@demo.obraflow.local'"));
        assertEquals(4, demoCount("purchase_orders", "internal_notes LIKE 'DEMO: %'"));

        seeder.run();

        assertEquals(5, demoCount("works", "code LIKE 'DEMO-%'"));
        assertEquals(10, demoCount("app_users", "email LIKE '%@demo.obraflow.local'"));
        assertEquals(14, demoCount("purchase_orders", "internal_notes LIKE 'DEMO: %'"));
        assertEquals(13, jdbc.queryForObject("SELECT count(*) FROM approval_bands b JOIN works w ON w.id=b.work_id WHERE w.code LIKE 'DEMO-%'", Integer.class));
    }

    private void removeExpandedFixturesToSimulateLegacySeed() {
        for (int number = 5; number <= 14; number++) {
            jdbc.update("DELETE FROM purchase_orders WHERE internal_notes LIKE ?", "DEMO: " + String.format("%02d-", number) + "%");
        }
        jdbc.update("DELETE FROM approval_bands WHERE work_id IN (SELECT id FROM works WHERE code IN ('DEMO-COS','DEMO-ACA','DEMO-LOG'))");
        jdbc.update("DELETE FROM works WHERE code IN ('DEMO-COS','DEMO-ACA','DEMO-LOG')");
        jdbc.update("DELETE FROM app_users WHERE email IN (?,?,?,?,?,?)", "camila.souza@demo.obraflow.local",
                "diego.martins@demo.obraflow.local", "elisa.ferreira@demo.obraflow.local",
                "bruno.lima@demo.obraflow.local", "fernanda.rocha@demo.obraflow.local",
                "caio.mendes@demo.obraflow.local");
        jdbc.update("DELETE FROM suppliers WHERE tax_id IN (?,?,?,?)", "DEMO-CNPJ-004", "DEMO-CNPJ-005",
                "DEMO-CNPJ-006", "DEMO-CNPJ-007");
    }

    private void assertBandMinimum(String notes, String expectedMinimum) {
        BigDecimal minimum = jdbc.queryForObject("""
                SELECT b.min_amount FROM approval_bands b JOIN purchase_orders o ON o.approval_band_id=b.id
                WHERE o.internal_notes=?
                """, BigDecimal.class, notes);
        assertEquals(0, minimum.compareTo(new BigDecimal(expectedMinimum)));
    }

    private void assertOrder(String notes, String status, Integer currentPosition, int decisionCount,
                             String expectedCurrentApproverEmail) {
        var order = jdbc.queryForMap("SELECT status,current_approver_position FROM purchase_orders WHERE internal_notes=?", notes);
        assertEquals(status, order.get("status"));
        assertEquals(currentPosition, order.get("current_approver_position"));
        assertEquals(decisionCount, jdbc.queryForObject("SELECT count(*) FROM purchase_order_decisions d JOIN purchase_orders o ON o.id=d.order_id WHERE o.internal_notes=?", Integer.class, notes));
        if (currentPosition != null) {
            String currentEmail = jdbc.queryForObject("""
                    SELECT a.approver_email FROM purchase_order_approvers a
                    JOIN purchase_orders o ON o.id=a.order_id
                    WHERE o.internal_notes=? AND a.position=?
                    """, String.class, notes, currentPosition);
            assertEquals(expectedCurrentApproverEmail, currentEmail);
        }
    }

    private int demoCount(String table, String condition) {
        return jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE " + condition, Integer.class);
    }
}
