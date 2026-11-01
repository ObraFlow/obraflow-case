package com.obraflow.reference.repository;

import com.obraflow.reference.dto.ReferenceDtos.ApproverResponse;
import com.obraflow.reference.dto.ReferenceDtos.BandInput;
import com.obraflow.reference.dto.ReferenceDtos.BandResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.sql.ResultSet;

/** Persists approval bands and loads them with their ordered approvers in one query. */
@Repository
public class ApprovalBandRepository {
    private final JdbcTemplate jdbc;

    public ApprovalBandRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<BandResponse> findByWorkId(long workId) {
        Map<Long, MutableBand> bands = new LinkedHashMap<>();
        return jdbc.query("""
                SELECT b.id, b.min_amount, b.max_amount, b.position,
                       u.id AS user_id, u.name AS user_name, u.email AS user_email,
                       a.position AS approver_position
                FROM approval_bands b
                LEFT JOIN approval_band_approvers a ON a.band_id=b.id
                LEFT JOIN app_users u ON u.id=a.user_id
                WHERE b.work_id=?
                ORDER BY b.position, a.position
                """, rs -> {
                    while (rs.next()) {
                        long id = rs.getLong("id");
                        MutableBand band = bands.computeIfAbsent(id, ignored -> rowToBand(rs, id));
                        long userId = rs.getLong("user_id");
                        if (!rs.wasNull()) band.approvers.add(new ApproverResponse(userId, rs.getString("user_name"),
                                rs.getString("user_email"), rs.getInt("approver_position")));
                    }
                    return bands.values().stream().map(MutableBand::toResponse).toList();
                }, workId);
    }

    public void deleteByWorkId(long workId) {
        jdbc.update("DELETE FROM approval_bands WHERE work_id=?", workId);
    }

    public long insert(long workId, BigDecimal min, BigDecimal max, int position) {
        return jdbc.queryForObject("INSERT INTO approval_bands(work_id,min_amount,max_amount,position) VALUES (?,?,?,?) RETURNING id",
                Long.class, workId, min, max, position);
    }

    public void insertApprover(long bandId, long userId, int position) {
        jdbc.update("INSERT INTO approval_band_approvers(band_id,user_id,position) VALUES (?,?,?)", bandId, userId, position);
    }

    /** Inserts all bands in submitted order and returns their persisted representation. */
    public List<BandResponse> replace(long workId, List<BandInput> inputs) {
        deleteByWorkId(workId);
        int position = 0;
        for (BandInput input : inputs) {
            long bandId = insert(workId, input.minAmount(), input.maxAmount(), ++position);
            for (int i = 0; i < input.approverIds().size(); i++)
                insertApprover(bandId, input.approverIds().get(i), i + 1);
        }
        return findByWorkId(workId);
    }

    private static MutableBand rowToBand(ResultSet rs, long id) {
        try {
            return new MutableBand(id, rs.getBigDecimal("min_amount"), rs.getBigDecimal("max_amount"), rs.getInt("position"));
        } catch (java.sql.SQLException exception) {
            throw new IllegalStateException(exception);
        }
    }

    /** Mutable accumulator used while grouping joined rows into band responses. */
    private static final class MutableBand {
        private final long id;
        private final BigDecimal min;
        private final BigDecimal max;
        private final int position;
        private final List<ApproverResponse> approvers = new ArrayList<>();

        private MutableBand(long id, BigDecimal min, BigDecimal max, int position) {
            this.id = id; this.min = min; this.max = max; this.position = position;
        }

        private BandResponse toResponse() { return new BandResponse(id, min, max, position, List.copyOf(approvers)); }
    }
}
