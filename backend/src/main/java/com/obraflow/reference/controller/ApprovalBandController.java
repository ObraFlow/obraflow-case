package com.obraflow.reference.controller;

import com.obraflow.reference.dto.ReferenceDtos.BandInput;
import com.obraflow.reference.dto.ReferenceDtos.BandResponse;
import com.obraflow.reference.service.ApprovalBandService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Handles HTTP requests for approval bands belonging to a work. */
@RestController
@RequestMapping("/api/works/{workId}/approval-bands")
public class ApprovalBandController {
    private final ApprovalBandService service;

    public ApprovalBandController(ApprovalBandService service) { this.service = service; }

    @GetMapping
    public List<BandResponse> list(@PathVariable long workId) { return service.bands(workId); }

    @PutMapping
    public List<BandResponse> replace(@PathVariable long workId,
                                      @Valid @RequestBody List<@Valid BandInput> inputs) {
        return service.replaceBands(workId, inputs);
    }
}
