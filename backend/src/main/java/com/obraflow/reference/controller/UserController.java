package com.obraflow.reference.controller;

import com.obraflow.reference.dto.ReferenceDtos.UserInput;
import com.obraflow.reference.dto.ReferenceDtos.UserResponse;
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

/** Handles HTTP requests for approver user reference data. */
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final ReferenceService service;

    public UserController(ReferenceService service) { this.service = service; }

    @GetMapping
    public List<UserResponse> list() { return service.users(); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody UserInput input) { return service.createUser(input); }
}
