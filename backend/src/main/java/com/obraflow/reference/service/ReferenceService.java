package com.obraflow.reference.service;

import com.obraflow.reference.dto.ReferenceDtos.SupplierInput;
import com.obraflow.reference.dto.ReferenceDtos.SupplierResponse;
import com.obraflow.reference.dto.ReferenceDtos.UserInput;
import com.obraflow.reference.dto.ReferenceDtos.UserResponse;
import com.obraflow.reference.dto.ReferenceDtos.WorkInput;
import com.obraflow.reference.dto.ReferenceDtos.WorkResponse;
import com.obraflow.reference.repository.ReferenceRepository;
import org.springframework.stereotype.Service;

import java.util.List;

/** Implements create and list use cases for reference data. */
@Service
public class ReferenceService {
    private final ReferenceRepository repository;

    public ReferenceService(ReferenceRepository repository) { this.repository = repository; }

    public List<WorkResponse> works() { return repository.findWorks(); }

    public WorkResponse createWork(WorkInput input) {
        return repository.createWork(input.name().trim(), input.code().trim());
    }

    public List<UserResponse> users() { return repository.findUsers(); }

    public UserResponse createUser(UserInput input) {
        return repository.createUser(input.name().trim(), input.email().trim());
    }

    public List<SupplierResponse> suppliers() { return repository.findSuppliers(); }

    public SupplierResponse createSupplier(SupplierInput input) {
        return repository.createSupplier(input.name().trim(), input.taxId().trim());
    }
}
