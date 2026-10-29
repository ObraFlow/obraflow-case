package com.obraflow.reference;

import com.obraflow.reference.dto.ReferenceDtos.BandInput;
import com.obraflow.reference.repository.ApprovalBandRepository;
import com.obraflow.reference.repository.ReferenceRepository;
import com.obraflow.reference.service.ApprovalBandService;
import com.obraflow.shared.error.ApiException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ApprovalBandServiceTest {
    private final ReferenceRepository referenceRepository = mock(ReferenceRepository.class);
    private final ApprovalBandRepository bandRepository = mock(ApprovalBandRepository.class);
    private final ApprovalBandService service = new ApprovalBandService(referenceRepository, bandRepository);

    @Test
    void rejectsGappedBandsBeforeChangingPersistence() {
        when(referenceRepository.workExists(1)).thenReturn(true);
        List<BandInput> inputs = List.of(
                new BandInput(new BigDecimal("0.00"), new BigDecimal("100.00"), List.of(4L)),
                new BandInput(new BigDecimal("101.00"), null, List.of(5L)));

        ApiException exception = assertThrows(ApiException.class, () -> service.replaceBands(1, inputs));

        assertEquals(400, exception.status().value());
        verifyNoInteractions(bandRepository);
    }

    @Test
    void rejectsNullBandEntriesAsClientInput() {
        when(referenceRepository.workExists(1)).thenReturn(true);

        ApiException exception = assertThrows(ApiException.class,
                () -> service.replaceBands(1, Collections.singletonList(null)));

        assertEquals(400, exception.status().value());
        verifyNoInteractions(bandRepository);
    }

    @Test
    void validatesAllApproversInOneLookupBeforeReplacingBands() {
        when(referenceRepository.workExists(1)).thenReturn(true);
        when(referenceRepository.findActiveUserIds(Set.of(4L, 5L))).thenReturn(Set.of(4L, 5L));
        List<BandInput> inputs = List.of(
                new BandInput(BigDecimal.ZERO, new BigDecimal("100.00"), List.of(4L)),
                new BandInput(new BigDecimal("100.00"), null, List.of(5L)));

        service.replaceBands(1, inputs);

        verify(referenceRepository).findActiveUserIds(Set.of(4L, 5L));
        verify(bandRepository).replace(1, inputs);
    }
}
