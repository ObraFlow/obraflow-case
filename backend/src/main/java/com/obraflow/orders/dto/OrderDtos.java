package com.obraflow.orders.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** HTTP contracts for order creation and consultation. */
public final class OrderDtos {
    private OrderDtos() { }

    /** Order data provided by a buyer; monetary totals are always calculated by the server. */
    public record CreateOrderRequest(
            @NotNull(message = "Selecione a obra.") Long workId,
            @NotNull(message = "Selecione o fornecedor.") Long supplierId,
            @NotNull(message = "Informe a data do pedido.") LocalDate orderDate,
            @Size(max = 2000, message = "As observações devem ter até 2000 caracteres.") String internalNotes,
            @NotEmpty(message = "Adicione pelo menos um item ao pedido.")
            @Size(max = 100, message = "O pedido pode ter no máximo 100 itens.")
            List<@NotNull(message = "Revise os itens informados.") @Valid OrderItemInput> items) { }

    /** An order item without any client-supplied totals. */
    public record OrderItemInput(
            @NotBlank(message = "Informe a descrição do item.")
            @Size(max = 250, message = "A descrição deve ter até 250 caracteres.") String description,
            @NotNull(message = "Informe a quantidade.") @Positive(message = "A quantidade deve ser maior que zero.")
            @Digits(integer = 9, fraction = 3, message = "A quantidade deve ter até 9 dígitos inteiros e 3 decimais.") BigDecimal quantity,
            @NotBlank(message = "Informe a unidade do item.")
            @Size(max = 20, message = "A unidade deve ter até 20 caracteres.") String unit,
            @NotNull(message = "Informe o preço unitário.") @PositiveOrZero(message = "O preço unitário não pode ser negativo.")
            @Digits(integer = 12, fraction = 2, message = "O preço unitário deve ter até 12 dígitos inteiros e 2 decimais.") BigDecimal unitPrice) { }

    /** Item and calculated values returned by the API. */
    public record OrderItemResponse(long id, int position, String description, BigDecimal quantity,
                                    String unit, BigDecimal unitPrice, BigDecimal total) { }

    /** Frozen approver identity and order as selected at order creation time. */
    public record OrderApproverResponse(long id, String name, String email, int position) { }

    /** Complete order view, including the initial approval chain snapshot. */
    public record OrderResponse(long id, long workId, String workName, long supplierId, String supplierName,
                                LocalDate orderDate, String internalNotes, List<OrderItemResponse> items,
                                BigDecimal total, long approvalBandId, String status,
                                List<OrderApproverResponse> approvers) { }
}
