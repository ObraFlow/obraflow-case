package com.obraflow.demo;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Loads a small, repeatable local showcase dataset when the demo-data profile is active. */
@Component
@Profile("demo-data")
public class DemoDataSeeder implements CommandLineRunner {
    private static final String DEMO_PREFIX = "DEMO: ";

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;

    public DemoDataSeeder(JdbcTemplate jdbc, TransactionTemplate transactions) {
        this.jdbc = jdbc;
        this.transactions = transactions;
    }

    @Override
    public void run(String... args) {
        transactions.executeWithoutResult(status -> seed());
    }

    private void seed() {
        long workNorth = work("Obra Horizonte", "DEMO-HOR");
        long workSouth = work("Residencial Ipê", "DEMO-IPE");

        long joana = user("Joana Ribeiro", "joana.ribeiro@demo.obraflow.local");
        long marcelo = user("Marcelo Nunes", "marcelo.nunes@demo.obraflow.local");
        long renata = user("Renata Alves", "renata.alves@demo.obraflow.local");
        long lucia = user("Lúcia Costa", "lucia.costa@demo.obraflow.local");

        long supplierA = supplier("Concreto Forte", "DEMO-CNPJ-001");
        long supplierB = supplier("Materiais do Vale", "DEMO-CNPJ-002");
        long supplierC = supplier("Elétrica Central", "DEMO-CNPJ-003");

        List<Long> northBands = bands(workNorth, joana, marcelo);
        List<Long> southBands = bands(workSouth, renata, lucia);

        seedOrder("01-pendente", workNorth, supplierA, northBands.get(0),
                List.of(new Item("Cimento CP-II", "20.000", "sc", "38.90"),
                        new Item("Areia média", "2.500", "m³", "140.00")),
                List.of(joana), 1, "PENDING", List.of());
        seedOrder("02-em-aprovacao", workNorth, supplierB, northBands.get(1),
                List.of(new Item("Aço CA-50", "120.000", "kg", "105.00"),
                        new Item("Arame recozido", "10.000", "kg", "45.00")),
                List.of(joana, marcelo), 2, "PENDING", List.of(new Decision(joana, 1, "APPROVED", null)));
        seedOrder("03-aprovado", workSouth, supplierC, southBands.get(1),
                List.of(new Item("Quadro elétrico", "1.000", "un", "12500.00"),
                        new Item("Cabos e disjuntores", "1.000", "lote", "3800.00")),
                List.of(renata, lucia), null, "APPROVED",
                List.of(new Decision(renata, 1, "APPROVED", null), new Decision(lucia, 2, "APPROVED", null)));
        seedOrder("04-rejeitado", workSouth, supplierA, southBands.get(0),
                List.of(new Item("Luminárias decorativas", "24.000", "un", "180.00"),
                        new Item("Instalação especial", "1.000", "serviço", "900.00")),
                List.of(renata), null, "REJECTED",
                List.of(new Decision(renata, 1, "REJECTED", "Item fora do escopo aprovado para esta etapa.")));
    }

    private long work(String name, String code) {
        jdbc.update("INSERT INTO works(name,code) VALUES (?,?) ON CONFLICT (code) DO NOTHING", name, code);
        return jdbc.queryForObject("SELECT id FROM works WHERE code=?", Long.class, code);
    }

    private long user(String name, String email) {
        jdbc.update("INSERT INTO app_users(name,email) VALUES (?,?) ON CONFLICT (email) DO NOTHING", name, email);
        return jdbc.queryForObject("SELECT id FROM app_users WHERE email=?", Long.class, email);
    }

    private long supplier(String name, String taxId) {
        jdbc.update("INSERT INTO suppliers(name,tax_id) VALUES (?,?) ON CONFLICT (tax_id) DO NOTHING", name, taxId);
        return jdbc.queryForObject("SELECT id FROM suppliers WHERE tax_id=?", Long.class, taxId);
    }

    private List<Long> bands(long workId, long firstApprover, long secondApprover) {
        Integer existing = jdbc.queryForObject("SELECT count(*) FROM approval_bands WHERE work_id=?", Integer.class, workId);
        if (existing == 0) {
            long low = jdbc.queryForObject("""
                    INSERT INTO approval_bands(work_id,min_amount,max_amount,position) VALUES (?,0,10000,1)
                    RETURNING id
                    """, Long.class, workId);
            long high = jdbc.queryForObject("""
                    INSERT INTO approval_bands(work_id,min_amount,max_amount,position) VALUES (?,10000,NULL,2)
                    RETURNING id
                    """, Long.class, workId);
            approver(low, firstApprover, 1);
            approver(high, firstApprover, 1);
            approver(high, secondApprover, 2);
        }
        return jdbc.query("SELECT id FROM approval_bands WHERE work_id=? ORDER BY position", (rs, row) -> rs.getLong(1), workId);
    }

    private void approver(long bandId, long userId, int position) {
        jdbc.update("INSERT INTO approval_band_approvers(band_id,user_id,position) VALUES (?,?,?)", bandId, userId, position);
    }

    private void seedOrder(String key, long workId, long supplierId, long bandId, List<Item> items,
                           List<Long> approvers, Integer currentPosition, String state, List<Decision> decisions) {
        String notes = DEMO_PREFIX + key;
        Integer existing = jdbc.queryForObject("SELECT count(*) FROM purchase_orders WHERE internal_notes=?", Integer.class, notes);
        if (existing != 0) return;

        BigDecimal total = items.stream().map(Item::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        long orderId = jdbc.queryForObject("""
                INSERT INTO purchase_orders(work_id,supplier_id,order_date,internal_notes,total_amount,approval_band_id,status,current_approver_position)
                VALUES (?,?,?,?,?,?,?,?) RETURNING id
                """, Long.class, workId, supplierId, LocalDate.now(), notes, total, bandId, state, currentPosition);

        for (int index = 0; index < items.size(); index++) {
            Item item = items.get(index);
            jdbc.update("""
                    INSERT INTO purchase_order_items(order_id,position,description,quantity,unit,unit_price,line_total)
                    VALUES (?,?,?,?,?,?,?)
                    """, orderId, index + 1, item.description(), new BigDecimal(item.quantity()), item.unit(),
                    new BigDecimal(item.unitPrice()), item.lineTotal());
        }
        for (int index = 0; index < approvers.size(); index++) {
            long approverId = approvers.get(index);
            int position = index + 1;
            jdbc.update("""
                    INSERT INTO purchase_order_approvers(order_id,user_id,position,approver_name,approver_email)
                    SELECT ?,id,?,name,email FROM app_users WHERE id=?
                    """, orderId, position, approverId);
        }
        for (Decision decision : decisions) {
            jdbc.update("""
                    INSERT INTO purchase_order_decisions(order_id,user_id,position,approver_name,approver_email,outcome,reason)
                    SELECT ?,a.user_id,a.position,a.approver_name,a.approver_email,?,?
                    FROM purchase_order_approvers a WHERE a.order_id=? AND a.user_id=? AND a.position=?
                    """, orderId, decision.outcome(), decision.reason(), orderId, decision.userId(), decision.position());
        }
    }

    private record Item(String description, String quantity, String unit, String unitPrice) {
        BigDecimal lineTotal() {
            return new BigDecimal(quantity).multiply(new BigDecimal(unitPrice)).setScale(2);
        }
    }

    private record Decision(long userId, int position, String outcome, String reason) { }
}
