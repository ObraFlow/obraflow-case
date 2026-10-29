package com.obraflow.reference.controller;

import com.obraflow.reference.dto.ReferenceDtos.SupplierInput;
import com.obraflow.reference.dto.ReferenceDtos.SupplierResponse;
import com.obraflow.reference.service.ReferenceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Handles HTTP requests for supplier reference data. */
@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {
    private final ReferenceService service;

    public SupplierController(ReferenceService service) { this.service = service; }

    @GetMapping
    public List<SupplierResponse> list() { return service.suppliers(); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SupplierResponse create(@Valid @RequestBody SupplierInput input) { return service.createSupplier(input); }
}
