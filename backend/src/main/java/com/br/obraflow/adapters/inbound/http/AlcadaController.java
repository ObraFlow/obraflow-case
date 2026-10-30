package com.br.obraflow.adapters.inbound.http;

import com.br.obraflow.adapters.inbound.http.dto.NivelAlcadaRequest;
import com.br.obraflow.core.application.dto.command.NivelAlcadaComando;
import com.br.obraflow.core.application.dto.result.NivelAlcadaResultado;
import com.br.obraflow.core.application.dto.result.SimulacaoAlcadaResultado;
import com.br.obraflow.core.application.port.in.AlcadaUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.math.BigDecimal;
import java.net.URI;
import java.util.List;
import java.util.UUID;

/**
 * Endpoints das regras de alcada por obra.
 */
@RestController
@RequestMapping("/api/v1")
@Tag(name = "Alcadas", description = "Faixas de valor e cadeias de aprovacao de cada obra")
public class AlcadaController {

    private final AlcadaUseCase alcada;

    public AlcadaController(AlcadaUseCase alcada) {
        this.alcada = alcada;
    }

    @GetMapping("/obras/{obraId}/niveis")
    @Operation(summary = "Lista as faixas de alcada de uma obra")
    public ResponseEntity<List<NivelAlcadaResultado>> listarNiveis(@PathVariable UUID obraId) {
        return ResponseEntity.ok(alcada.listarNiveis(obraId));
    }

    @PostMapping("/obras/{obraId}/niveis")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Cadastra uma nova faixa de alcada na obra")
    public ResponseEntity<NivelAlcadaResultado> criarNivel(
            @PathVariable UUID obraId,
            @Valid @RequestBody NivelAlcadaRequest request) {

        NivelAlcadaResultado resultado = alcada.criarNivel(new NivelAlcadaComando(
                obraId,
                request.limiteInferior(),
                request.limiteSuperior(),
                request.descricao(),
                request.usuariosAprovadores()));

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(resultado.id())
                .toUri();
        return ResponseEntity.created(location).body(resultado);
    }

    @PutMapping("/niveis/{nivelId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Atualiza a faixa de valor e a cadeia de aprovadores")
    public ResponseEntity<NivelAlcadaResultado> atualizarNivel(
            @PathVariable UUID nivelId,
            @Valid @RequestBody NivelAlcadaRequest request) {

        return ResponseEntity.ok(alcada.atualizarNivel(nivelId, new NivelAlcadaComando(
                request.obraId(),
                request.limiteInferior(),
                request.limiteSuperior(),
                request.descricao(),
                request.usuariosAprovadores())));
    }

    @DeleteMapping("/niveis/{nivelId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Remove uma faixa de alcada (bloqueada se houver pedidos vinculados)")
    public ResponseEntity<Void> removerNivel(@PathVariable UUID nivelId) {
        alcada.removerNivel(nivelId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/niveis/{nivelId}/simulacao")
    @Operation(summary = "Simula a cadeia de aprovacao de uma faixa para um valor informado")
    public ResponseEntity<SimulacaoAlcadaResultado> simular(
            @PathVariable UUID nivelId,
            @RequestParam BigDecimal valor) {
        return ResponseEntity.ok(alcada.simular(nivelId, valor));
    }
}
