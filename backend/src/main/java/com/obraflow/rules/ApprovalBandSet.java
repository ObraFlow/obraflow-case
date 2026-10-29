package com.obraflow.rules;

import java.math.BigDecimal;
import java.util.List;

public class ApprovalBandSet {
    public record Range(BigDecimal min, BigDecimal max) { }

    public void validate(List<Range> ranges) {
        if (ranges == null || ranges.isEmpty()) throw new IllegalArgumentException("Configure ao menos uma faixa.");
        BigDecimal expectedMin = BigDecimal.ZERO;
        for (int i = 0; i < ranges.size(); i++) {
            Range range = ranges.get(i);
            if (range.min() == null || range.min().signum() < 0 || range.min().compareTo(expectedMin) != 0)
                throw new IllegalArgumentException("As faixas devem começar em zero e ser contíguas, sem lacunas ou sobreposições.");
            if (range.max() != null && range.max().compareTo(range.min()) <= 0)
                throw new IllegalArgumentException("O limite máximo deve ser maior que o mínimo.");
            if (i < ranges.size() - 1 && range.max() == null)
                throw new IllegalArgumentException("Somente a última faixa pode ser ilimitada.");
            if (i == ranges.size() - 1 && range.max() != null)
                throw new IllegalArgumentException("A última faixa deve cobrir valores sem limite superior.");
            if (range.max() != null) expectedMin = range.max();
        }
    }
}
