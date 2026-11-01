package com.obraflow.reference.service;

import com.obraflow.reference.dto.ReferenceDtos.BandInput;
import com.obraflow.reference.dto.ReferenceDtos.BandResponse;
import com.obraflow.reference.repository.ApprovalBandRepository;
import com.obraflow.reference.repository.ReferenceRepository;
import com.obraflow.rules.ApprovalBandSet;
import com.obraflow.shared.error.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Validates and coordinates approval rule queries and replacement. */
@Service
public class ApprovalBandService {
    private final ReferenceRepository referenceRepository;
    private final ApprovalBandRepository bandRepository;
    private final ApprovalBandSet bandSet = new ApprovalBandSet();

    public ApprovalBandService(ReferenceRepository referenceRepository, ApprovalBandRepository bandRepository) {
        this.referenceRepository = referenceRepository;
        this.bandRepository = bandRepository;
    }

    public List<BandResponse> bands(long workId) {
        ensureWorkExists(workId);
        return bandRepository.findByWorkId(workId);
    }

    @Transactional
    public List<BandResponse> replaceBands(long workId, List<BandInput> inputs) {
        ensureWorkExists(workId);
        if (inputs == null || inputs.isEmpty()) throw ApiException.badRequest("Configure ao menos uma faixa.");
        if (inputs.stream().anyMatch(java.util.Objects::isNull))
            throw ApiException.badRequest("Revise os dados das faixas informadas.");
        try {
            bandSet.validate(inputs.stream().map(input -> new ApprovalBandSet.Range(input.minAmount(), input.maxAmount())).toList());
        } catch (IllegalArgumentException exception) {
            throw ApiException.badRequest(exception.getMessage());
        }
        validateApprovers(inputs);
        return bandRepository.replace(workId, inputs);
    }

    private void validateApprovers(List<BandInput> inputs) {
        Set<Long> requestedIds = new HashSet<>();
        for (BandInput input : inputs) {
            if (input.approverIds() == null || input.approverIds().isEmpty())
                throw ApiException.badRequest("Cada faixa precisa de pelo menos um aprovador.");
            Set<Long> bandApprovers = new HashSet<>();
            for (Long id : input.approverIds()) {
                if (id == null || !bandApprovers.add(id))
                    throw ApiException.badRequest("Um usuário não pode aparecer duas vezes na mesma faixa.");
                requestedIds.add(id);
            }
        }
        if (!referenceRepository.findActiveUserIds(requestedIds).containsAll(requestedIds))
            throw ApiException.badRequest("Selecione somente usuários ativos cadastrados.");
    }

    private void ensureWorkExists(long workId) {
        if (!referenceRepository.workExists(workId)) throw ApiException.notFound("Obra não encontrada.");
    }
}
