package com.obraflow.rules;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ApprovalBandSetTest {
    private final ApprovalBandSet bands = new ApprovalBandSet();

    @Test
    void acceptsContiguousBandsFromZeroThroughUnboundedMaximum() {
        assertDoesNotThrow(() -> bands.validate(List.of(
                new ApprovalBandSet.Range(new BigDecimal("0.00"), new BigDecimal("10000.00")),
                new ApprovalBandSet.Range(new BigDecimal("10000.00"), new BigDecimal("25000.00")),
                new ApprovalBandSet.Range(new BigDecimal("25000.00"), null)
        )));
    }

    @Test
    void rejectsGapsOverlapsAndMissingUnboundedLastBand() {
        assertThrows(IllegalArgumentException.class, () -> bands.validate(List.of(
                new ApprovalBandSet.Range(BigDecimal.ZERO, new BigDecimal("100")),
                new ApprovalBandSet.Range(new BigDecimal("101"), null)
        )));
        assertThrows(IllegalArgumentException.class, () -> bands.validate(List.of(
                new ApprovalBandSet.Range(BigDecimal.ZERO, new BigDecimal("101")),
                new ApprovalBandSet.Range(new BigDecimal("100"), null)
        )));
        assertThrows(IllegalArgumentException.class, () -> bands.validate(List.of(
                new ApprovalBandSet.Range(BigDecimal.ZERO, new BigDecimal("100"))
        )));
    }

    @Test
    void rejectsNegativeAmountsAndEmptyBandSet() {
        assertThrows(IllegalArgumentException.class, () -> bands.validate(List.of()));
        assertThrows(IllegalArgumentException.class, () -> bands.validate(List.of(
                new ApprovalBandSet.Range(new BigDecimal("-1"), null)
        )));
    }

    @Test
    void selectsExactlyOneBandAtAndAroundEachBoundary() {
        List<ApprovalBandSet.Range> ranges = List.of(
                new ApprovalBandSet.Range(BigDecimal.ZERO, new BigDecimal("10000.00")),
                new ApprovalBandSet.Range(new BigDecimal("10000.00"), null)
        );
        assertEquals(ranges.get(0), bands.find(ranges, new BigDecimal("9999.99")).orElseThrow());
        assertEquals(ranges.get(1), bands.find(ranges, new BigDecimal("10000.00")).orElseThrow());
        assertEquals(ranges.get(1), bands.find(ranges, new BigDecimal("10000.01")).orElseThrow());
        assertTrue(bands.find(ranges, new BigDecimal("0.00")).isPresent());
    }

    @Test
    void rejectsPrecisionBeyondCents() {
        assertThrows(IllegalArgumentException.class, () -> bands.validate(List.of(
                new ApprovalBandSet.Range(new BigDecimal("0.001"), null)
        )));
    }

    @Test
    void returnsNoApplicableBandWhenWorkHasNoConfiguredRules() {
        assertTrue(bands.find(List.of(), new BigDecimal("42.00")).isEmpty());
    }
}
