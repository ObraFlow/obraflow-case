package com.obraflow.orders;

import com.obraflow.orders.dto.OrderDtos.CreateOrderRequest;
import com.obraflow.orders.dto.OrderDtos.OrderItemInput;
import com.obraflow.orders.service.OrderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.dao.DataAccessException;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** Verifies transaction rollback using the same PostgreSQL engine as local execution. */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class OrderPersistenceTest {
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine")
            .withDatabaseName("obraflow_test")
            .withUsername("obraflow")
            .withPassword("obraflow_test");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired OrderService service;

    @Test
    void rollsBackHeaderItemsAndApproversWhenAnItemInsertFails() {
        long workId = jdbc.queryForObject("INSERT INTO works(name,code) VALUES ('Obra rollback','ROLLBACK') RETURNING id", Long.class);
        long supplierId = jdbc.queryForObject("INSERT INTO suppliers(name,tax_id) VALUES ('Fornecedor rollback','ROLLBACK-1') RETURNING id", Long.class);
        long userId = jdbc.queryForObject("INSERT INTO app_users(name,email) VALUES ('Aprovador rollback','rollback@example.com') RETURNING id", Long.class);
        long bandId = jdbc.queryForObject("INSERT INTO approval_bands(work_id,min_amount,max_amount,position) VALUES (?,0,NULL,1) RETURNING id",
                Long.class, workId);
        jdbc.update("INSERT INTO approval_band_approvers(band_id,user_id,position) VALUES (?,?,1)", bandId, userId);
        jdbc.execute("""
                CREATE FUNCTION reject_test_order_item() RETURNS trigger AS $$
                BEGIN RAISE EXCEPTION 'simulated item insert failure'; END;
                $$ LANGUAGE plpgsql
                """);
        jdbc.execute("CREATE TRIGGER reject_test_order_item BEFORE INSERT ON purchase_order_items " +
                "FOR EACH ROW EXECUTE FUNCTION reject_test_order_item()");

        try {
            CreateOrderRequest request = new CreateOrderRequest(workId, supplierId, LocalDate.parse("2026-10-29"), null,
                    List.of(new OrderItemInput("Item", new BigDecimal("1.000"), "un", new BigDecimal("1.00"))));
            assertThrows(DataAccessException.class, () -> service.create(request));
            assertEquals(0, count("purchase_orders"));
            assertEquals(0, count("purchase_order_items"));
            assertEquals(0, count("purchase_order_approvers"));
        } finally {
            jdbc.execute("DROP TRIGGER reject_test_order_item ON purchase_order_items");
            jdbc.execute("DROP FUNCTION reject_test_order_item()");
        }
    }

    private int count(String table) {
        return jdbc.queryForObject("SELECT count(*) FROM " + table, Integer.class);
    }
}
