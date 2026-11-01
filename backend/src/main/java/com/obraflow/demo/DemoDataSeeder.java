package com.obraflow.demo;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
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
        if (allDemoOrdersExist()) return;

        long workNorth = work("Obra Horizonte", "DEMO-HOR");
        long workSouth = work("Residencial Ipê", "DEMO-IPE");
        long workCoast = work("Obra Costa Azul", "DEMO-COS");
        long workGarden = work("Parque das Acácias", "DEMO-ACA");
        long workLogistics = work("Centro Logístico Aurora", "DEMO-LOG");

        long joana = user("Joana Ribeiro", "joana.ribeiro@demo.obraflow.local");
        long marcelo = user("Marcelo Nunes", "marcelo.nunes@demo.obraflow.local");
        long renata = user("Renata Alves", "renata.alves@demo.obraflow.local");
        long lucia = user("Lúcia Costa", "lucia.costa@demo.obraflow.local");
        long camila = user("Camila Souza", "camila.souza@demo.obraflow.local");
        long diego = user("Diego Martins", "diego.martins@demo.obraflow.local");
        long elisa = user("Elisa Ferreira", "elisa.ferreira@demo.obraflow.local");
        long bruno = user("Bruno Lima", "bruno.lima@demo.obraflow.local");
        long fernanda = user("Fernanda Rocha", "fernanda.rocha@demo.obraflow.local");
        long caio = user("Caio Mendes", "caio.mendes@demo.obraflow.local");

        long supplierA = supplier("Concreto Forte", "DEMO-CNPJ-001");
        long supplierB = supplier("Materiais do Vale", "DEMO-CNPJ-002");
        long supplierC = supplier("Elétrica Central", "DEMO-CNPJ-003");
        long supplierD = supplier("Tubos e Conexões Sul", "DEMO-CNPJ-004");
        long supplierE = supplier("Madeireira Horizonte", "DEMO-CNPJ-005");
        long supplierF = supplier("Clima e Refrigeração", "DEMO-CNPJ-006");
        long supplierG = supplier("Locações Ponto Certo", "DEMO-CNPJ-007");

        List<Long> northBands = bands(workNorth, joana, marcelo);
        List<Long> southBands = bands(workSouth, renata, lucia);
        List<Long> coastBands = ensureBands(workCoast, List.of(
                band("0", "5000", camila),
                band("5000", "20000", camila, diego),
                band("20000", null, camila, diego, elisa)));
        List<Long> gardenBands = ensureBands(workGarden, List.of(
                band("0", "7000", bruno),
                band("7000", "25000", bruno, fernanda),
                band("25000", null, bruno, fernanda, caio)));
        List<Long> logisticsBands = ensureBands(workLogistics, List.of(
                band("0", "10000", joana),
                band("10000", "20000", joana, marcelo),
                band("20000", null, joana, marcelo, renata)));

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

        seedOrder("05-custo-zero", workCoast, supplierG, coastBands.get(0),
                List.of(new Item("Retirada de entulho", "1.000", "serviço", "0.00"),
                        new Item("Caçamba cedida", "1.000", "un", "0.00")),
                List.of(camila), 1, "PENDING", List.of());
        seedOrder("06-limite-5000-em-aprovacao", workCoast, supplierD, coastBands.get(1),
                List.of(new Item("Tubos PVC", "20.000", "un", "120.00"),
                        new Item("Conexões hidráulicas", "10.000", "un", "260.00")),
                List.of(camila, diego), 2, "PENDING", List.of(new Decision(camila, 1, "APPROVED", null)));
        seedOrder("07-limite-20000-terceiro-nivel", workCoast, supplierE, coastBands.get(2),
                List.of(new Item("Portas corta-fogo", "8.000", "un", "1800.00"),
                        new Item("Ferragens certificadas", "1.000", "lote", "5600.00")),
                List.of(camila, diego, elisa), 3, "PENDING",
                List.of(new Decision(camila, 1, "APPROVED", null), new Decision(diego, 2, "APPROVED", null)));
        seedOrder("08-aprovado-uma-etapa", workGarden, supplierF, gardenBands.get(0),
                List.of(new Item("Tinta acrílica", "20.000", "lata", "180.00"),
                        new Item("Selador", "10.000", "lata", "120.00")),
                List.of(bruno), null, "APPROVED", List.of(new Decision(bruno, 1, "APPROVED", null)));
        seedOrder("09-aprovado-duas-etapas", workGarden, supplierB, gardenBands.get(1),
                List.of(new Item("Madeira tratada", "40.000", "m", "250.00"),
                        new Item("Parafusos estruturais", "1.000", "lote", "2800.00")),
                List.of(bruno, fernanda), null, "APPROVED",
                List.of(new Decision(bruno, 1, "APPROVED", null), new Decision(fernanda, 2, "APPROVED", null)));
        seedOrder("10-rejeitado-segundo-nivel", workGarden, supplierA, gardenBands.get(1),
                List.of(new Item("Blocos estruturais", "1000.000", "un", "12.00"),
                        new Item("Argamassa", "10.000", "sc", "300.00")),
                List.of(bruno, fernanda), null, "REJECTED",
                List.of(new Decision(bruno, 1, "APPROVED", null),
                        new Decision(fernanda, 2, "REJECTED", "Quantidade acima da necessidade revisada da obra.")));
        seedOrder("11-rejeitado-terceiro-nivel", workLogistics, supplierC, logisticsBands.get(2),
                List.of(new Item("Unidades evaporadoras", "10.000", "un", "2200.00"),
                        new Item("Rede frigorígena", "1.000", "lote", "1300.00")),
                List.of(joana, marcelo, renata), null, "REJECTED",
                List.of(new Decision(joana, 1, "APPROVED", null),
                        new Decision(marcelo, 2, "APPROVED", null),
                        new Decision(renata, 3, "REJECTED", "Proposta excede o orçamento anual de climatização.")));
        seedOrder("12-pendente-faixa-media", workLogistics, supplierD, logisticsBands.get(1),
                List.of(new Item("Eletrocalhas", "50.000", "m", "180.00"),
                        new Item("Suportes galvanizados", "1.000", "lote", "3000.00")),
                List.of(joana, marcelo), 1, "PENDING", List.of());
        seedOrder("13-pendente-limite-20000", workLogistics, supplierE, logisticsBands.get(2),
                List.of(new Item("Empilhadeira elétrica", "1.000", "un", "18000.00"),
                        new Item("Carregador industrial", "1.000", "un", "2000.00")),
                List.of(joana, marcelo, renata), 1, "PENDING", List.of());
        seedOrder("14-pendente-limite-25000", workGarden, supplierG, gardenBands.get(2),
                List.of(new Item("Gerador de emergência", "1.000", "un", "23000.00"),
                        new Item("Instalação e comissionamento", "1.000", "serviço", "2000.00")),
                List.of(bruno, fernanda, caio), 1, "PENDING", List.of());
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

    private List<Long> ensureBands(long workId, List<BandSpec> specifications) {
        Integer existing = jdbc.queryForObject("SELECT count(*) FROM approval_bands WHERE work_id=?", Integer.class, workId);
        if (existing == 0) {
            for (int index = 0; index < specifications.size(); index++) {
                BandSpec specification = specifications.get(index);
                long bandId = jdbc.queryForObject("""
                        INSERT INTO approval_bands(work_id,min_amount,max_amount,position)
                        VALUES (?,?,?,?) RETURNING id
                        """, Long.class, workId, specification.minAmount(), specification.maxAmount(), index + 1);
                for (int approverIndex = 0; approverIndex < specification.approverIds().size(); approverIndex++) {
                    approver(bandId, specification.approverIds().get(approverIndex), approverIndex + 1);
                }
            }
        }

        List<BandRow> persisted = jdbc.query("""
                SELECT id,min_amount,max_amount FROM approval_bands WHERE work_id=? ORDER BY position
                """, (rs, row) -> new BandRow(rs.getLong("id"), rs.getBigDecimal("min_amount"), rs.getBigDecimal("max_amount")), workId);
        if (persisted.size() != specifications.size()) {
            throw new IllegalStateException("As regras da obra de demonstração foram alteradas; recrie a base local antes de executar a carga novamente.");
        }

        for (int index = 0; index < specifications.size(); index++) {
            BandRow row = persisted.get(index);
            BandSpec specification = specifications.get(index);
            List<Long> approverIds = jdbc.queryForList("""
                    SELECT user_id FROM approval_band_approvers WHERE band_id=? ORDER BY position
                    """, Long.class, row.id());
            if (row.minAmount().compareTo(specification.minAmount()) != 0
                    || !sameAmount(row.maxAmount(), specification.maxAmount())
                    || !approverIds.equals(specification.approverIds())) {
                throw new IllegalStateException("As regras da obra de demonstração foram alteradas; recrie a base local antes de executar a carga novamente.");
            }
        }
        return persisted.stream().map(BandRow::id).toList();
    }

    private BandSpec band(String minAmount, String maxAmount, long... approverIds) {
        return new BandSpec(new BigDecimal(minAmount), maxAmount == null ? null : new BigDecimal(maxAmount),
                Arrays.stream(approverIds).boxed().toList());
    }

    private boolean sameAmount(BigDecimal left, BigDecimal right) {
        return left == null ? right == null : right != null && left.compareTo(right) == 0;
    }

    private boolean allDemoOrdersExist() {
        for (int number = 1; number <= 14; number++) {
            String key = String.format("%02d-", number);
            Boolean exists = jdbc.queryForObject("""
                    SELECT EXISTS (SELECT 1 FROM purchase_orders WHERE internal_notes LIKE ?)
                    """, Boolean.class, DEMO_PREFIX + key + "%");
            if (!Boolean.TRUE.equals(exists)) return false;
        }
        return true;
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

    private record BandSpec(BigDecimal minAmount, BigDecimal maxAmount, List<Long> approverIds) { }
    private record BandRow(long id, BigDecimal minAmount, BigDecimal maxAmount) { }
    private record Decision(long userId, int position, String outcome, String reason) { }
}
