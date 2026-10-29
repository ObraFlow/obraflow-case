package com.obraflow.health;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Exposes application and database health over HTTP. */
@RestController
@RequestMapping("/api/health")
public class HealthController {
    private final HealthService service;

    public HealthController(HealthService service) { this.service = service; }

    @GetMapping
    public Map<String, String> health() { return service.health(); }
}
