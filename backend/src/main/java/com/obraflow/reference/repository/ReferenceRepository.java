package com.obraflow.reference.repository;

import com.obraflow.reference.dto.ReferenceDtos.SupplierResponse;
import com.obraflow.reference.dto.ReferenceDtos.UserResponse;
import com.obraflow.reference.dto.ReferenceDtos.WorkResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Set;

/** Runs JDBC queries for works, users, and suppliers. */
@Repository
public class ReferenceRepository {
    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate namedJdbc;

    public ReferenceRepository(JdbcTemplate jdbc, NamedParameterJdbcTemplate namedJdbc) {
        this.jdbc = jdbc;
        this.namedJdbc = namedJdbc;
    }

    public List<WorkResponse> findWorks() {
        return jdbc.query("SELECT id,name,code FROM works ORDER BY name",
                (rs, n) -> new WorkResponse(rs.getLong("id"), rs.getString("name"), rs.getString("code")));
    }

    public WorkResponse createWork(String name, String code) {
        Long id = jdbc.queryForObject("INSERT INTO works(name,code) VALUES (?,?) RETURNING id", Long.class, name, code);
        return new WorkResponse(id, name, code);
    }

    public List<UserResponse> findUsers() {
        return jdbc.query("SELECT id,name,email,active FROM app_users ORDER BY name",
                (rs, n) -> new UserResponse(rs.getLong("id"), rs.getString("name"), rs.getString("email"), rs.getBoolean("active")));
    }

    public UserResponse createUser(String name, String email) {
        Long id = jdbc.queryForObject("INSERT INTO app_users(name,email) VALUES (?,?) RETURNING id", Long.class, name, email);
        return new UserResponse(id, name, email, true);
    }

    public List<SupplierResponse> findSuppliers() {
        return jdbc.query("SELECT id,name,tax_id,active FROM suppliers ORDER BY name",
                (rs, n) -> new SupplierResponse(rs.getLong("id"), rs.getString("name"), rs.getString("tax_id"), rs.getBoolean("active")));
    }

    public SupplierResponse createSupplier(String name, String taxId) {
        Long id = jdbc.queryForObject("INSERT INTO suppliers(name,tax_id) VALUES (?,?) RETURNING id", Long.class, name, taxId);
        return new SupplierResponse(id, name, taxId, true);
    }

    public boolean workExists(long id) {
        Integer count = jdbc.queryForObject("SELECT count(*) FROM works WHERE id=?", Integer.class, id);
        return count != null && count > 0;
    }

    public boolean activeSupplierExists(long id) {
        Integer count = jdbc.queryForObject("SELECT count(*) FROM suppliers WHERE id=? AND active=true", Integer.class, id);
        return count != null && count > 0;
    }

    public Set<Long> findActiveUserIds(Collection<Long> ids) {
        if (ids.isEmpty()) return Set.of();
        return Set.copyOf(namedJdbc.queryForList("SELECT id FROM app_users WHERE active=true AND id IN (:ids)",
                java.util.Map.of("ids", ids), Long.class));
    }
}
