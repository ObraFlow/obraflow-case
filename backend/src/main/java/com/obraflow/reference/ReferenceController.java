package com.obraflow.reference;

import com.obraflow.rules.ApprovalBandSet;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api")
public class ReferenceController {
    private final JdbcTemplate jdbc;
    private final ApprovalBandSet validator = new ApprovalBandSet();

    public ReferenceController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public record Work(long id, String name, String code) { }
    public record AppUser(long id, String name, String email, boolean active) { }
    public record Supplier(long id, String name, String taxId, boolean active) { }
    public record WorkInput(String name, String code) { }
    public record UserInput(String name, String email) { }
    public record SupplierInput(String name, String taxId) { }
    public record Approver(long id, String name, String email, int position) { }
    public record Band(long id, BigDecimal minAmount, BigDecimal maxAmount, int position, List<Approver> approvers) { }
    public record BandInput(BigDecimal minAmount, BigDecimal maxAmount, List<Long> approverIds) { }

    @GetMapping("/works")
    public List<Work> works() {
        return jdbc.query("SELECT id,name,code FROM works ORDER BY name", (rs, n) -> new Work(rs.getLong("id"), rs.getString("name"), rs.getString("code")));
    }

    @PostMapping("/works") @ResponseStatus(HttpStatus.CREATED)
    public Work createWork(@RequestBody WorkInput input) {
        String name = required(input == null ? null : input.name(), "Informe o nome da obra.");
        String code = required(input.code(), "Informe o código da obra.");
        long id = jdbc.queryForObject("INSERT INTO works(name,code) VALUES (?,?) RETURNING id", Long.class, name, code);
        return new Work(id, name, code);
    }

    @GetMapping("/users")
    public List<AppUser> users() {
        return jdbc.query("SELECT id,name,email,active FROM app_users ORDER BY name", (rs,n) -> new AppUser(rs.getLong("id"),rs.getString("name"),rs.getString("email"),rs.getBoolean("active")));
    }

    @PostMapping("/users") @ResponseStatus(HttpStatus.CREATED)
    public AppUser createUser(@RequestBody UserInput input) {
        String name = required(input == null ? null : input.name(), "Informe o nome do usuário.");
        String email = required(input.email(), "Informe o e-mail do usuário.");
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) throw bad("Informe um e-mail válido.");
        long id = jdbc.queryForObject("INSERT INTO app_users(name,email) VALUES (?,?) RETURNING id", Long.class, name, email);
        return new AppUser(id,name,email,true);
    }

    @GetMapping("/suppliers")
    public List<Supplier> suppliers() {
        return jdbc.query("SELECT id,name,tax_id,active FROM suppliers ORDER BY name", (rs,n) -> new Supplier(rs.getLong("id"),rs.getString("name"),rs.getString("tax_id"),rs.getBoolean("active")));
    }

    @PostMapping("/suppliers") @ResponseStatus(HttpStatus.CREATED)
    public Supplier createSupplier(@RequestBody SupplierInput input) {
        String name = required(input == null ? null : input.name(), "Informe o nome do fornecedor.");
        String taxId = required(input.taxId(), "Informe o documento do fornecedor.");
        long id = jdbc.queryForObject("INSERT INTO suppliers(name,tax_id) VALUES (?,?) RETURNING id", Long.class, name, taxId);
        return new Supplier(id,name,taxId,true);
    }

    @GetMapping("/works/{workId}/approval-bands")
    public List<Band> bands(@PathVariable long workId) { ensureWork(workId); return loadBands(workId); }

    @PutMapping("/works/{workId}/approval-bands")
    @Transactional
    public List<Band> replaceBands(@PathVariable long workId, @RequestBody List<BandInput> inputs) {
        ensureWork(workId);
        if (inputs == null || inputs.isEmpty()) throw bad("Configure ao menos uma faixa.");
        try { validator.validate(inputs.stream().map(i -> new ApprovalBandSet.Range(i.minAmount(), i.maxAmount())).toList()); }
        catch (IllegalArgumentException e) { throw bad(e.getMessage()); }
        Set<Long> used = new HashSet<>();
        for (BandInput input : inputs) {
            if (input.approverIds() == null || input.approverIds().isEmpty()) throw bad("Cada faixa precisa de pelo menos um aprovador.");
            for (Long id : input.approverIds()) {
                if (id == null || !used.add(id)) throw bad("Um usuário não pode aparecer duas vezes na mesma configuração de faixa.");
                Integer count = jdbc.queryForObject("SELECT count(*) FROM app_users WHERE id=? AND active=true", Integer.class, id);
                if (count == null || count == 0) throw bad("Selecione somente usuários ativos cadastrados.");
            }
            used.clear();
        }
        jdbc.update("DELETE FROM approval_bands WHERE work_id=?", workId);
        int position = 0;
        for (BandInput input : inputs) {
            long bandId = jdbc.queryForObject("INSERT INTO approval_bands(work_id,min_amount,max_amount,position) VALUES (?,?,?,?) RETURNING id", Long.class, workId, input.minAmount(), input.maxAmount(), ++position);
            for (int i = 0; i < input.approverIds().size(); i++)
                jdbc.update("INSERT INTO approval_band_approvers(band_id,user_id,position) VALUES (?,?,?)", bandId, input.approverIds().get(i), i + 1);
        }
        return loadBands(workId);
    }

    private List<Band> loadBands(long workId) {
        List<Band> result = new ArrayList<>();
        var rows = jdbc.query("SELECT id,min_amount,max_amount,position FROM approval_bands WHERE work_id=? ORDER BY position", (rs,n) -> new Object[]{rs.getLong("id"),rs.getBigDecimal("min_amount"),rs.getBigDecimal("max_amount"),rs.getInt("position")}, workId);
        for (Object[] row : rows) {
            long id = (long) row[0];
            List<Approver> approvers = jdbc.query("SELECT u.id,u.name,u.email,a.position FROM approval_band_approvers a JOIN app_users u ON u.id=a.user_id WHERE a.band_id=? ORDER BY a.position", (rs,n) -> new Approver(rs.getLong("id"),rs.getString("name"),rs.getString("email"),rs.getInt("position")), id);
            result.add(new Band(id,(BigDecimal)row[1],(BigDecimal)row[2],(int)row[3],approvers));
        }
        return result;
    }

    private void ensureWork(long id) {
        Integer count = jdbc.queryForObject("SELECT count(*) FROM works WHERE id=?", Integer.class, id);
        if (count == null || count == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Obra não encontrada.");
    }
    private String required(String value, String message) { if (value == null || value.isBlank()) throw bad(message); return value.trim(); }
    private ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
}
