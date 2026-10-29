package com.obraflow.reference.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/** HTTP request and response contracts for reference data and approval rules. */
public final class ReferenceDtos {
    private ReferenceDtos() { }

    /** Work data returned by the reference API. */
    public record WorkResponse(long id, String name, String code) { }

    /** Fields required to create a work. */
    public record WorkInput(@NotBlank(message = "Informe o nome da obra.") @Size(max = 120, message = "O nome da obra deve ter até 120 caracteres.") String name,
                            @NotBlank(message = "Informe o código da obra.") @Size(max = 32, message = "O código deve ter até 32 caracteres.") String code) { }

    /** User data returned by the reference API. */
    public record UserResponse(long id, String name, String email, boolean active) { }

    /** Fields required to create an approver user. */
    public record UserInput(@NotBlank(message = "Informe o nome do usuário.") @Size(max = 120, message = "O nome deve ter até 120 caracteres.") String name,
                            @NotBlank(message = "Informe o e-mail do usuário.") @Email(message = "Informe um e-mail válido.") @Size(max = 254, message = "O e-mail deve ter até 254 caracteres.") String email) { }

    /** Supplier data returned by the reference API. */
    public record SupplierResponse(long id, String name, String taxId, boolean active) { }

    /** Fields required to create a supplier. */
    public record SupplierInput(@NotBlank(message = "Informe o nome do fornecedor.") @Size(max = 160, message = "O nome do fornecedor deve ter até 160 caracteres.") String name,
                                @NotBlank(message = "Informe o documento do fornecedor.") @Size(max = 32, message = "O documento deve ter até 32 caracteres.") String taxId) { }

    /** Approver data and its position in a band. */
    public record ApproverResponse(long id, String name, String email, int position) { }

    /** Approval band and its ordered approvers returned by the API. */
    public record BandResponse(long id, BigDecimal minAmount, BigDecimal maxAmount, int position,
                               List<ApproverResponse> approvers) { }

    /** Approval band and ordered approvers submitted for a work. */
    public record BandInput(@NotNull(message = "Informe o limite mínimo.") @PositiveOrZero(message = "O limite mínimo não pode ser negativo.") @Digits(integer = 12, fraction = 2, message = "Os limites devem ter no máximo duas casas decimais.") BigDecimal minAmount,
                            @Digits(integer = 12, fraction = 2, message = "Os limites devem ter no máximo duas casas decimais.") BigDecimal maxAmount,
                            @NotEmpty(message = "Cada faixa precisa de pelo menos um aprovador.") List<@NotNull Long> approverIds) { }
}
