package com.obraflow.orders;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.stereotype.Component;

/** Applies the monetary rounding policy for order lines and totals. */
@Component
public class OrderTotals {
    public BigDecimal lineTotal(BigDecimal quantity, BigDecimal unitPrice) {
        return quantity.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal total(List<BigDecimal> lineTotals) {
        return lineTotals.stream().reduce(BigDecimal.ZERO.setScale(2), BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
    }
}
