package com.obraflow.orders;

import com.obraflow.orders.dto.OrderDtos.CreateOrderRequest;
import com.obraflow.orders.dto.OrderDtos.DecisionRequest;
import com.obraflow.orders.dto.OrderDtos.OrderItemInput;
import com.obraflow.orders.dto.OrderDtos.OrderResponse;
import com.obraflow.orders.service.OrderService;
import com.obraflow.orders.OrderApprovalFlow;
import com.obraflow.shared.error.ApiException;
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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

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
        int existingOrders = count("purchase_orders");
        int existingItems = count("purchase_order_items");
        int existingApprovers = count("purchase_order_approvers");
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
            assertEquals(existingOrders, count("purchase_orders"));
            assertEquals(existingItems, count("purchase_order_items"));
            assertEquals(existingApprovers, count("purchase_order_approvers"));
        } finally {
            jdbc.execute("DROP TRIGGER reject_test_order_item ON purchase_order_items");
            jdbc.execute("DROP FUNCTION reject_test_order_item()");
        }
    }

    @Test
    void advancesApprovalsAndPreservesRejectionHistoryInPostgres() {
        ApprovalFixture fixture = createPendingOrder("history");

        OrderResponse first = service.decide(fixture.orderId(),
                new DecisionRequest(fixture.firstApproverId(), OrderApprovalFlow.Outcome.APPROVED, null));
        assertEquals("PENDING", first.status());
        assertEquals(2, first.currentApproverPosition());
        assertEquals(1, first.decisions().size());

        OrderResponse rejected = service.decide(fixture.orderId(),
                new DecisionRequest(fixture.secondApproverId(), OrderApprovalFlow.Outcome.REJECTED, "  Fora do orçamento  "));
        assertEquals("REJECTED", rejected.status());
        assertEquals(null, rejected.currentApproverPosition());
        assertEquals(2, rejected.decisions().size());
        assertEquals("Fora do orçamento", rejected.decisions().getLast().reason());
        assertEquals("REJECTED", jdbc.queryForObject(
                "SELECT status FROM purchase_orders WHERE id=?", String.class, fixture.orderId()));

        assertThrows(ApiException.class, () -> service.decide(fixture.orderId(),
                new DecisionRequest(fixture.secondApproverId(), OrderApprovalFlow.Outcome.APPROVED, null)));
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM purchase_order_decisions WHERE order_id=?",
                Integer.class, fixture.orderId()));
    }

    @Test
    void completesEveryLevelAndDisablesFurtherDecisions() {
        ApprovalFixture fixture = createPendingOrder("complete");
        service.decide(fixture.orderId(), new DecisionRequest(fixture.firstApproverId(),
                OrderApprovalFlow.Outcome.APPROVED, null));

        OrderResponse completed = service.decide(fixture.orderId(), new DecisionRequest(fixture.secondApproverId(),
                OrderApprovalFlow.Outcome.APPROVED, null));

        assertEquals("APPROVED", completed.status());
        assertEquals(null, completed.currentApproverPosition());
        assertEquals(2, completed.decisions().size());
        assertThrows(ApiException.class, () -> service.decide(fixture.orderId(),
                new DecisionRequest(fixture.secondApproverId(), OrderApprovalFlow.Outcome.APPROVED, null)));
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM purchase_order_decisions WHERE order_id=?",
                Integer.class, fixture.orderId()));
    }

    @Test
    void rejectionAtTheFirstLevelPreventsLaterApproversFromDeciding() {
        ApprovalFixture fixture = createPendingOrder("reject-first");
        OrderResponse rejected = service.decide(fixture.orderId(), new DecisionRequest(fixture.firstApproverId(),
                OrderApprovalFlow.Outcome.REJECTED, "Fornecedor não aprovado"));

        assertEquals("REJECTED", rejected.status());
        assertEquals(1, rejected.decisions().size());
        assertThrows(ApiException.class, () -> service.decide(fixture.orderId(),
                new DecisionRequest(fixture.secondApproverId(), OrderApprovalFlow.Outcome.APPROVED, null)));
    }

    @Test
    void serializesConcurrentDecisionsForTheSameApprovalStep() throws Exception {
        ApprovalFixture fixture = createPendingOrder("concurrent");
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> approveAtOnce(fixture, ready, start));
            var second = executor.submit(() -> approveAtOnce(fixture, ready, start));
            assertEquals(true, ready.await(5, TimeUnit.SECONDS));
            start.countDown();
            int successes = (first.get(10, TimeUnit.SECONDS) ? 1 : 0) + (second.get(10, TimeUnit.SECONDS) ? 1 : 0);
            assertEquals(1, successes);
        }
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM purchase_order_decisions WHERE order_id=?",
                Integer.class, fixture.orderId()));
        assertEquals(2, jdbc.queryForObject("SELECT current_approver_position FROM purchase_orders WHERE id=?",
                Integer.class, fixture.orderId()));
    }

    private boolean approveAtOnce(ApprovalFixture fixture, CountDownLatch ready, CountDownLatch start) throws Exception {
        ready.countDown();
        start.await(5, TimeUnit.SECONDS);
        try {
            service.decide(fixture.orderId(), new DecisionRequest(fixture.firstApproverId(),
                    OrderApprovalFlow.Outcome.APPROVED, null));
            return true;
        } catch (ApiException rejected) {
            return false;
        }
    }

    private ApprovalFixture createPendingOrder(String suffix) {
        long workId = jdbc.queryForObject("INSERT INTO works(name,code) VALUES (?,?) RETURNING id",
                Long.class, "Obra " + suffix, "WO-" + suffix);
        long supplierId = jdbc.queryForObject("INSERT INTO suppliers(name,tax_id) VALUES (?,?) RETURNING id",
                Long.class, "Fornecedor " + suffix, "TAX-" + suffix);
        long firstApprover = jdbc.queryForObject("INSERT INTO app_users(name,email) VALUES (?,?) RETURNING id",
                Long.class, "Aprovador 1 " + suffix, suffix + "1@example.com");
        long secondApprover = jdbc.queryForObject("INSERT INTO app_users(name,email) VALUES (?,?) RETURNING id",
                Long.class, "Aprovador 2 " + suffix, suffix + "2@example.com");
        long bandId = jdbc.queryForObject("INSERT INTO approval_bands(work_id,min_amount,max_amount,position) VALUES (?,0,NULL,1) RETURNING id",
                Long.class, workId);
        jdbc.update("INSERT INTO approval_band_approvers(band_id,user_id,position) VALUES (?,?,1)", bandId, firstApprover);
        jdbc.update("INSERT INTO approval_band_approvers(band_id,user_id,position) VALUES (?,?,2)", bandId, secondApprover);
        OrderResponse created = service.create(new CreateOrderRequest(workId, supplierId,
                LocalDate.parse("2026-10-29"), null,
                List.of(new OrderItemInput("Item", new BigDecimal("1.000"), "un", new BigDecimal("1.00")))));
        return new ApprovalFixture(created.id(), firstApprover, secondApprover);
    }

    private record ApprovalFixture(long orderId, long firstApproverId, long secondApproverId) { }

    private int count(String table) {
        return jdbc.queryForObject("SELECT count(*) FROM " + table, Integer.class);
    }
}
