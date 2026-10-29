package com.obraflow.orders;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OrderTotalsTest {
    private final OrderTotals totals = new OrderTotals();

    @Test
    void roundsEachLineToTwoDecimalsBeforeSumming() {
        assertEquals(new BigDecimal("0.02"), totals.lineTotal(new BigDecimal("1.500"), new BigDecimal("0.01")));
        assertEquals(new BigDecimal("10.00"), totals.total(List.of(
                new BigDecimal("3.333"), new BigDecimal("6.667"))));
    }

    @Test
    void calculatesLineTotalFromQuantityAndUnitPrice() {
        assertEquals(new BigDecimal("30.00"), totals.lineTotal(new BigDecimal("2.500"), new BigDecimal("12.00")));
    }
}
