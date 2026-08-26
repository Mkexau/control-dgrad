import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Database Schema & Migration Validation', () => {
    const migrationPath = path.resolve('supabase/migrations/20260826_000001_initial_schema.sql');
    const storagePath = path.resolve('supabase/migrations/20260826_000002_storage_setup.sql');
    const seedPath = path.resolve('supabase/seed.sql');

    it('migration files must exist', () => {
        assert.ok(fs.existsSync(migrationPath), 'Migration 20260826_000001_initial_schema.sql must exist');
        assert.ok(fs.existsSync(storagePath), 'Migration 20260826_000002_storage_setup.sql must exist');
        assert.ok(fs.existsSync(seedPath), 'Seed file seed.sql must exist');
    });

    it('must contain all 13 required ENUM types', () => {
        const sql = fs.readFileSync(migrationPath, 'utf-8');
        const expectedEnums = [
            'app_role',
            'mission_type',
            'mission_status',
            'validation_type',
            'validation_status',
            'equipe_status',
            'controle_status',
            'resultat_type',
            'pv_type',
            'signature_status',
            'currency_type',
            'assujetti_type',
            'document_type'
        ];

        for (const enumName of expectedEnums) {
            assert.ok(
                sql.includes(`CREATE TYPE ${enumName} AS ENUM`),
                `ENUM ${enumName} must be defined in the initial migration`
            );
        }
    });

    it('must contain all 33 expected tables', () => {
        const sql = fs.readFileSync(migrationPath, 'utf-8');
        const expectedTables = [
            'directions',
            'divisions',
            'bureaux',
            'secteurs',
            'profiles',
            'agents',
            'assujettis',
            'notes_perception',
            'ordonnancements',
            'analyses',
            'analyse_assujettis',
            'missions',
            'mission_assujettis',
            'mission_validations',
            'ordres_mission',
            'autorisations_controle_pieces',
            'equipes',
            'equipe_agents',
            'equipe_assujettis',
            'controles',
            'demandes_renseignements',
            'resultats_controle',
            'redressements',
            'penalites',
            'avis_recouvrement',
            'paiements_echelonnes',
            'proces_verbaux',
            'pv_signataires',
            'feuilles_observations',
            'rapports_mission',
            'documents',
            'notifications',
            'audit_logs'
        ];

        for (const table of expectedTables) {
            assert.ok(
                sql.includes(`CREATE TABLE ${table} (`) || sql.includes(`CREATE TABLE ${table}\n`),
                `Table ${table} must be defined in the initial migration`
            );
        }
    });

    it('must enforce financial integrity constraints on resultats_controle', () => {
        const sql = fs.readFileSync(migrationPath, 'utf-8');
        assert.ok(sql.includes('NUMERIC(18,2)'), 'Financial amounts must use NUMERIC(18,2)');
        assert.ok(sql.includes('chk_resultat_total_coherence'), 'Total amount coherence check must exist');
        assert.ok(sql.includes('chk_resultat_dechargee_justification'), 'Justification check for DECHARGEE must exist');
    });

    it('must enforce RLS with least privilege on profiles and agents', () => {
        const sql = fs.readFileSync(migrationPath, 'utf-8');
        assert.ok(sql.includes('ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;'));
        assert.ok(sql.includes('ALTER TABLE agents ENABLE ROW LEVEL SECURITY;'));
        assert.ok(sql.includes('Lecture des profils par permission métier'));
        assert.ok(sql.includes('Lecture des agents par permission métier'));
        // Check that open wildcard policy is not present
        assert.ok(!sql.includes('CREATE POLICY "Lecture des profils par les utilisateurs authentifiés"'));
        assert.ok(!sql.includes('CREATE POLICY "Lecture des agents par les utilisateurs authentifiés"'));
    });

    it('must enforce strict isolation of ADMIN on business validations', () => {
        const sql = fs.readFileSync(migrationPath, 'utf-8');
        // Validation insert policy must only permit designated business roles
        assert.ok(sql.includes("type_validation = 'CHEF_DIVISION' AND auth_user_role() = 'CHEF_DIVISION'"));
        assert.ok(sql.includes("type_validation = 'DIRECTEUR_CONTROLES' AND auth_user_role() = 'DIRECTEUR_CONTROLES'"));
        assert.ok(sql.includes("type_validation = 'DG' AND auth_user_role() = 'DIRECTEUR_GENERAL'"));
        assert.ok(sql.includes("type_validation = 'CHEF_SECTION' AND auth_user_role() = 'CHEF_SECTION'"));
        // Admin must not have permission to insert into mission_validations
        assert.ok(!sql.includes("type_validation = 'DG' AND auth_user_role() = 'ADMIN'"));
    });

    it('storage configuration must be private and restricted', () => {
        const sql = fs.readFileSync(storagePath, 'utf-8');
        assert.ok(sql.includes("'dgrad-documents'"), 'Bucket dgrad-documents must be defined');
        assert.ok(sql.includes('public = false') || sql.includes('false,'), 'Bucket must be private');
        assert.ok(sql.includes('Lecture restreinte des documents DGRAD'), 'Read access must be restricted');
        assert.ok(!sql.includes('Lecture des documents DGRAD pour les utilisateurs authentifiés'), 'No open read policy on storage');
    });

    it('seed file must include full administrative structure and all 36 sectors', () => {
        const seedSql = fs.readFileSync(seedPath, 'utf-8');
        // Direction and Divisions
        assert.ok(seedSql.includes('DCR'), 'Direction DCR must be seeded');
        assert.ok(seedSql.includes('DIV_REC'), 'Division Recoupement must be seeded');
        assert.ok(seedSql.includes('DIV_CTRL'), 'Division Contrôle must be seeded');

        // All 8 bureaux
        const expectedBureaux = [
            'BUR_ANA_REC', 'BUR_DOC',
            'BUR_CTRL_SOL', 'BUR_CTRL_SOUS_SOL', 'BUR_REC_JUD_PART',
            'BUR_CTRL_ADM1', 'BUR_CTRL_ADM2', 'BUR_CTRL_ADM3'
        ];
        for (const b of expectedBureaux) {
            assert.ok(seedSql.includes(b), `Bureau ${b} must be seeded`);
        }

        // 36 sectors (6 per control bureau)
        const expectedSecteurs = [
            // Sol (6)
            'SOL_FONCIER', 'SOL_CONCESSIONS', 'SOL_LOTISSEMENTS', 'SOL_DOMAINE_PUBLIC', 'SOL_IMMOBILIER', 'SOL_AMENAGEMENT',
            // Sous-sol (6)
            'SSOL_MINES', 'SSOL_HYDROCARBURES', 'SSOL_CARRIERES', 'SSOL_SUBSTANCES_MINERALES', 'SSOL_RECHERCHE_MINIERE', 'SSOL_EXPLOITATION_PETROLIERE',
            // Recettes Judiciaires et Participation (6)
            'RJP_COURS_TRIBUNAUX', 'RJP_PARQUETS', 'RJP_TRIBUNAUX_COMMERCE', 'RJP_COUR_CASSATION', 'RJP_COUR_CONSTITUTIONNELLE', 'RJP_PARTICIPATIONS_ETAT',
            // Administratif 1 (6)
            'ADM1_TRANSPORTS', 'ADM1_AVIATION', 'ADM1_NAVIGATION', 'ADM1_TELECOMMUNICATIONS', 'ADM1_POSTES', 'ADM1_COMMUNICATION',
            // Administratif 2 (6)
            'ADM2_COMMERCE', 'ADM2_INDUSTRIE', 'ADM2_TOURISME', 'ADM2_AGRICULTURE', 'ADM2_PECHE_ELEVAGE', 'ADM2_ENVIRONNEMENT',
            // Administratif 3 (6)
            'ADM3_EMPLOI_TRAVAIL', 'ADM3_AFFAIRES_SOCIALES', 'ADM3_SANTE', 'ADM3_ENSEIGNEMENT', 'ADM3_CULTURE', 'ADM3_ARTS'
        ];

        assert.strictEqual(expectedSecteurs.length, 36, 'There must be exactly 36 sectors defined');

        for (const s of expectedSecteurs) {
            assert.ok(seedSql.includes(s), `Secteur ${s} must be present in seed.sql`);
        }
    });
});
