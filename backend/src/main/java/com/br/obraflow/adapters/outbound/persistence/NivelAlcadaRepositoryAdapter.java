package com.br.obraflow.adapters.outbound.persistence;

import com.br.obraflow.adapters.outbound.persistence.entity.AprovadorNivelEntity;
import com.br.obraflow.adapters.outbound.persistence.entity.NivelAlcadaEntity;
import com.br.obraflow.adapters.outbound.persistence.mapper.NivelAlcadaMapper;
import com.br.obraflow.adapters.outbound.persistence.repository.NivelAlcadaJpaRepository;
import com.br.obraflow.core.domain.alcada.NivelAlcada;
import com.br.obraflow.core.domain.repository.NivelAlcadaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Adaptador de saida que implementa a porta {@link NivelAlcadaRepository} sobre JPA.
 */
@Repository
public class NivelAlcadaRepositoryAdapter implements NivelAlcadaRepository {

    private final NivelAlcadaJpaRepository repository;

    public NivelAlcadaRepositoryAdapter(NivelAlcadaJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public NivelAlcada salvar(NivelAlcada nivel) {
        NivelAlcadaEntity entity = repository.findById(nivel.id()).orElseGet(NivelAlcadaEntity::new);
        entity.setId(nivel.id());
        entity.setObraId(nivel.obraId());
        entity.setLimiteInferior(nivel.faixa().limiteInferior());
        entity.setLimiteSuperior(nivel.faixa().limiteSuperior());
        entity.setDescricao(nivel.descricao());
        sincronizarAprovadores(entity, nivel);
        return NivelAlcadaMapper.toDomain(repository.save(entity));
    }

    @Override
    public Optional<NivelAlcada> porId(UUID id) {
        return repository.porIdComAprovadores(id).map(NivelAlcadaMapper::toDomain);
    }

    @Override
    public List<NivelAlcada> listarPorObra(UUID obraId) {
        return repository.listarPorObra(obraId).stream()
                .map(NivelAlcadaMapper::toDomain)
                .toList();
    }

    @Override
    public void remover(UUID id) {
        repository.deleteById(id);
    }

    /**
     * Mantem a cadeia de aprovadores alinhada com o agregado, reaproveitando as linhas
     * ja' persistidas sempre que possivel (evita remover e recriar a cadeia inteira).
     */
    private void sincronizarAprovadores(NivelAlcadaEntity entity, NivelAlcada nivel) {
        List<AprovadorNivelEntity> gerenciados = entity.getAprovadores();
        List<UUID> desejados = nivel.usuariosAprovadores();

        while (gerenciados.size() > desejados.size()) {
            gerenciados.remove(gerenciados.size() - 1);
        }

        for (int i = 0; i < desejados.size(); i++) {
            AprovadorNivelEntity alvo;
            if (i < gerenciados.size()) {
                alvo = gerenciados.get(i);
            } else {
                alvo = new AprovadorNivelEntity();
                alvo.setId(UUID.randomUUID());
                alvo.setNivel(entity);
                gerenciados.add(alvo);
            }
            alvo.setUsuarioId(desejados.get(i));
            alvo.setOrdem(i + 1);
        }
    }
}
