package com.obraflow.reference.controller;

import com.obraflow.reference.dto.ReferenceDtos.WorkInput;
import com.obraflow.reference.dto.ReferenceDtos.WorkResponse;
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

/** Handles HTTP requests for work reference data. */
@RestController
@RequestMapping("/api/works")
public class WorkController {
    private final ReferenceService service;

    public WorkController(ReferenceService service) { this.service = service; }

    @GetMapping
    public List<WorkResponse> list() { return service.works(); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkResponse create(@Valid @RequestBody WorkInput input) { return service.createWork(input); }
}
