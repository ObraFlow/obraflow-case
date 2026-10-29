package com.obraflow.rules;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

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
            if (range.min().scale() > 2 || (range.max() != null && range.max().scale() > 2))
                throw new IllegalArgumentException("Os limites devem ter no máximo duas casas decimais.");
            if (i < ranges.size() - 1 && range.max() == null)
                throw new IllegalArgumentException("Somente a última faixa pode ser ilimitada.");
            if (i == ranges.size() - 1 && range.max() != null)
                throw new IllegalArgumentException("A última faixa deve cobrir valores sem limite superior.");
            if (range.max() != null) expectedMin = range.max();
        }
    }

    public Optional<Range> find(List<Range> ranges, BigDecimal amount) {
        if (amount == null || amount.signum() < 0) throw new IllegalArgumentException("O valor deve ser não negativo.");
        return ranges.stream().filter(range -> amount.compareTo(range.min()) >= 0
                && (range.max() == null || amount.compareTo(range.max()) < 0)).findFirst();
    }
}
