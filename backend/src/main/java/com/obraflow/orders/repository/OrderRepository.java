package com.obraflow.orders.repository;

import com.obraflow.orders.dto.OrderDtos.CreateOrderRequest;
import com.obraflow.orders.dto.OrderDtos.OrderApproverResponse;
import com.obraflow.orders.dto.OrderDtos.OrderItemResponse;
import com.obraflow.orders.dto.OrderDtos.OrderResponse;
import com.obraflow.reference.dto.ReferenceDtos.ApproverResponse;
import com.obraflow.reference.dto.ReferenceDtos.BandResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/** Persists complete orders, their items, and a frozen copy of the applicable approver chain. */
@Repository
public class OrderRepository {
    private final JdbcTemplate jdbc;

    public OrderRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public OrderResponse create(CreateOrderRequest request, List<BigDecimal> itemTotals,
                                BigDecimal orderTotal, BandResponse band) {
        long orderId = jdbc.queryForObject("""
                INSERT INTO purchase_orders(work_id,supplier_id,order_date,internal_notes,total_amount,approval_band_id)
                VALUES (?,?,?,?,?,?) RETURNING id
                """, Long.class, request.workId(), request.supplierId(), request.orderDate(),
                blankToNull(request.internalNotes()), orderTotal, band.id());

        for (int index = 0; index < request.items().size(); index++) {
            var item = request.items().get(index);
            jdbc.update("""
                    INSERT INTO purchase_order_items(order_id,position,description,quantity,unit,unit_price,line_total)
                    VALUES (?,?,?,?,?,?,?)
                    """, orderId, index + 1, item.description().trim(), item.quantity(), item.unit().trim(),
                    item.unitPrice(), itemTotals.get(index));
        }
        for (ApproverResponse approver : band.approvers()) {
            jdbc.update("""
                    INSERT INTO purchase_order_approvers(order_id,user_id,position,approver_name,approver_email)
                    VALUES (?,?,?,?,?)
                    """, orderId, approver.id(), approver.position(), approver.name(), approver.email());
        }
        return findById(orderId).orElseThrow();
    }

    public List<OrderResponse> findAll() {
        List<Long> ids = jdbc.queryForList("SELECT id FROM purchase_orders ORDER BY created_at DESC, id DESC", Long.class);
        return ids.stream().map(id -> findById(id).orElseThrow()).toList();
    }

    public Optional<OrderResponse> findById(long id) {
        List<OrderHeader> headers = jdbc.query("""
                SELECT o.id,o.work_id,w.name AS work_name,o.supplier_id,s.name AS supplier_name,
                       o.order_date,o.internal_notes,o.total_amount,o.approval_band_id,o.status
                FROM purchase_orders o
                JOIN works w ON w.id=o.work_id
                JOIN suppliers s ON s.id=o.supplier_id
                WHERE o.id=?
                """, (rs, row) -> new OrderHeader(rs.getLong("id"), rs.getLong("work_id"),
                rs.getString("work_name"), rs.getLong("supplier_id"), rs.getString("supplier_name"),
                rs.getObject("order_date", java.time.LocalDate.class), rs.getString("internal_notes"),
                rs.getBigDecimal("total_amount"), rs.getLong("approval_band_id"), rs.getString("status")), id);
        if (headers.isEmpty()) return Optional.empty();
        OrderHeader header = headers.getFirst();
        List<OrderItemResponse> items = jdbc.query("""
                SELECT id,position,description,quantity,unit,unit_price,line_total
                FROM purchase_order_items WHERE order_id=? ORDER BY position
                """, (rs, row) -> new OrderItemResponse(rs.getLong("id"), rs.getInt("position"),
                rs.getString("description"), rs.getBigDecimal("quantity"), rs.getString("unit"),
                rs.getBigDecimal("unit_price"), rs.getBigDecimal("line_total")), id);
        List<OrderApproverResponse> approvers = jdbc.query("""
                SELECT user_id,approver_name,approver_email,position
                FROM purchase_order_approvers WHERE order_id=? ORDER BY position
                """, (rs, row) -> new OrderApproverResponse(rs.getLong("user_id"),
                rs.getString("approver_name"), rs.getString("approver_email"), rs.getInt("position")), id);
        return Optional.of(new OrderResponse(header.id, header.workId, header.workName, header.supplierId,
                header.supplierName, header.orderDate, header.internalNotes, items, header.total,
                header.approvalBandId, header.status, approvers));
    }

    private static String blankToNull(String notes) {
        return notes == null || notes.isBlank() ? null : notes.trim();
    }

    private record OrderHeader(long id, long workId, String workName, long supplierId, String supplierName,
                               java.time.LocalDate orderDate, String internalNotes, BigDecimal total,
                               long approvalBandId, String status) { }
}
