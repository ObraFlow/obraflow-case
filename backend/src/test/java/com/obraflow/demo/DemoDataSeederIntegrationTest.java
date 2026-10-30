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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
    void seedsDifferentApprovalStatesAndCanRunAgainWithoutDuplicatingData() {
        assertEquals(2, demoCount("works", "code LIKE 'DEMO-%'"));
        assertEquals(4, demoCount("app_users", "email LIKE '%@demo.obraflow.local'"));
        assertEquals(3, demoCount("suppliers", "tax_id LIKE 'DEMO-%'"));
        assertEquals(4, demoCount("purchase_orders", "internal_notes LIKE 'DEMO: %'"));
        assertEquals(4, jdbc.queryForObject("SELECT count(*) FROM approval_bands b JOIN works w ON w.id=b.work_id WHERE w.code LIKE 'DEMO-%'", Integer.class));
        assertEquals(8, jdbc.queryForObject("SELECT count(*) FROM purchase_order_items i JOIN purchase_orders o ON o.id=i.order_id WHERE o.internal_notes LIKE 'DEMO: %'", Integer.class));

        assertOrder("DEMO: 01-pendente", "PENDING", 1, 0, "joana.ribeiro@demo.obraflow.local");
        assertOrder("DEMO: 02-em-aprovacao", "PENDING", 2, 1, "marcelo.nunes@demo.obraflow.local");
        assertOrder("DEMO: 03-aprovado", "APPROVED", null, 2, null);
        assertOrder("DEMO: 04-rejeitado", "REJECTED", null, 1, null);
        assertTrue(jdbc.queryForObject("SELECT count(*) > 0 FROM purchase_order_decisions d JOIN purchase_orders o ON o.id=d.order_id WHERE o.internal_notes='DEMO: 04-rejeitado' AND d.outcome='REJECTED' AND length(trim(d.reason)) > 0", Boolean.class));

        seeder.run();

        assertEquals(2, demoCount("works", "code LIKE 'DEMO-%'"));
        assertEquals(4, demoCount("purchase_orders", "internal_notes LIKE 'DEMO: %'"));
        assertEquals(4, jdbc.queryForObject("SELECT count(*) FROM purchase_order_decisions d JOIN purchase_orders o ON o.id=d.order_id WHERE o.internal_notes LIKE 'DEMO: %'", Integer.class));
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
