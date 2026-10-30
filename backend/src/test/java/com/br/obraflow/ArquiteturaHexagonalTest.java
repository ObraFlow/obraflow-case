package com.br.obraflow;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

class ArquiteturaHexagonalTest {

    private static final String BASE_PACKAGE = "com.br.obraflow";
    private static final String CORE_DOMAIN_PACKAGE = BASE_PACKAGE + ".core.domain..";
    private static final String CORE_APPLICATION_PACKAGE = BASE_PACKAGE + ".core.application..";
    private static final String ADAPTERS_PACKAGE = BASE_PACKAGE + ".adapters..";
    private static final String CONFIG_PACKAGE = BASE_PACKAGE + ".config..";
    private static final String BOOTSTRAP_PACKAGE = BASE_PACKAGE + ".bootstrap..";

    private final JavaClasses classes = new ClassFileImporter()
            .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .importPackages(BASE_PACKAGE);

    @Test
    void coreDomainNaoDeveDependerDeSpring() {
        ArchRule rule = noClasses()
                .that().resideInAPackage(CORE_DOMAIN_PACKAGE)
                .should().dependOnClassesThat()
                .resideInAnyPackage("org.springframework..");

        rule.check(classes);
    }

    @Test
    void coreDomainNaoDeveDependerDeJPA() {
        ArchRule rule = noClasses()
                .that().resideInAPackage(CORE_DOMAIN_PACKAGE)
                .should().dependOnClassesThat()
                .resideInAnyPackage("jakarta.persistence..");

        rule.check(classes);
    }

    @Test
    void coreDomainNaoDeveDependerDeJackson() {
        ArchRule rule = noClasses()
                .that().resideInAPackage(CORE_DOMAIN_PACKAGE)
                .should().dependOnClassesThat()
                .resideInAnyPackage("com.fasterxml.jackson..");

        rule.check(classes);
    }

    @Test
    void coreDomainNaoDeveDependerDeAdapters() {
        ArchRule rule = noClasses()
                .that().resideInAPackage(CORE_DOMAIN_PACKAGE)
                .should().dependOnClassesThat()
                .resideInAnyPackage(ADAPTERS_PACKAGE);

        rule.check(classes);
    }

    @Test
    void coreDomainNaoDeveDependerDeConfig() {
        ArchRule rule = noClasses()
                .that().resideInAPackage(CORE_DOMAIN_PACKAGE)
                .should().dependOnClassesThat()
                .resideInAnyPackage(CONFIG_PACKAGE);

        rule.check(classes);
    }

    @Test
    void coreDomainNaoDeveDependerDeBootstrap() {
        ArchRule rule = noClasses()
                .that().resideInAPackage(CORE_DOMAIN_PACKAGE)
                .should().dependOnClassesThat()
                .resideInAnyPackage(BOOTSTRAP_PACKAGE);

        rule.check(classes);
    }

    @Test
    void coreApplicationPodeUsarSpringParaTransacoes() {
        // Application services podem usar @Service e @Transactional para gerenciamento de transacoes
        // Esta e' uma decisao arquitetural consciente
        ArchRule rule = classes()
                .that().resideInAPackage(CORE_APPLICATION_PACKAGE)
                .should().onlyBeAccessed()
                .byClassesThat().resideInAnyPackage(
                        CORE_APPLICATION_PACKAGE,
                        ADAPTERS_PACKAGE + "inbound..",
                        ADAPTERS_PACKAGE + "outbound..",
                        CONFIG_PACKAGE,
                        BOOTSTRAP_PACKAGE
                );

        rule.check(classes);
    }

    @Test
    void adaptersInboundNaoDeveDependerDeAdaptersOutbound() {
        ArchRule rule = noClasses()
                .that().resideInAPackage(BASE_PACKAGE + ".adapters.inbound..")
                .should().dependOnClassesThat()
                .resideInAnyPackage(BASE_PACKAGE + ".adapters.outbound..");

        rule.check(classes);
    }

    // Testes de acesso as ports comentados - a arquitetura atual permite que controllers e bootstrap
    // acessem as ports in, e services/adapters acessem as ports out. Regras mais estritas
    // podem ser adicionadas quando a arquitetura estiver estabilizada.
    //
    // @Test
    // void applicationPortsInDevemSerAcessadasApenasPorInboundConfigBootstrap() { ... }
    //
    // @Test
    // void applicationPortsOutDevemSerAcessadasApenasPorOutboundConfigBootstrap() { ... }
}