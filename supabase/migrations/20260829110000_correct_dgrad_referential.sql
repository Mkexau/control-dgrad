-- =============================================================================
-- DGRAD CONTROLE - CORRECTION DU REFERENTIEL ORGANISATIONNEL OFFICIEL
--
-- Cette migration est idempotente et ne supprime aucune donnee. Elle conserve
-- les identifiants existants afin de preserver les rattachements FK.
-- =============================================================================

BEGIN;

-- Correction des libelles et du code historique constates dans le referentiel.
UPDATE directions
SET nom = 'Direction des Contrôles et du Recoupement', actif = true
WHERE code = 'DCR';

UPDATE divisions
SET code = 'DIV_REC', nom = 'Division Recoupement', actif = true
WHERE code = 'DIV_RCPM'
  AND NOT EXISTS (SELECT 1 FROM divisions WHERE code = 'DIV_REC');

-- Direction et divisions officielles.
INSERT INTO directions (code, nom, actif)
VALUES ('DCR', 'Direction des Contrôles et du Recoupement', true)
ON CONFLICT (code) DO UPDATE
SET nom = EXCLUDED.nom,
    actif = EXCLUDED.actif;

INSERT INTO divisions (direction_id, code, nom, actif)
SELECT d.id, v.code, v.nom, true
FROM directions d
CROSS JOIN (VALUES
  ('DIV_REC', 'Division Recoupement'),
  ('DIV_CTRL', 'Division Contrôle')
) AS v(code, nom)
WHERE d.code = 'DCR'
ON CONFLICT (code) DO UPDATE
SET direction_id = EXCLUDED.direction_id,
    nom = EXCLUDED.nom,
    actif = EXCLUDED.actif;

-- Huit bureaux officiels : deux de recoupement et six de contrôle.
INSERT INTO bureaux (division_id, code, nom, type, actif)
SELECT dv.id, v.code, v.nom, v.type, true
FROM (VALUES
  ('DIV_REC',  'BUR_ANA_REC',      'Bureau Analyse et Recoupement',                         'RECOUPEMENT'),
  ('DIV_REC',  'BUR_DOC',          'Bureau Documentation',                                  'RECOUPEMENT'),
  ('DIV_CTRL', 'BUR_CTRL_SOL',     'Bureau Contrôle Sol',                                    'CONTROLE'),
  ('DIV_CTRL', 'BUR_CTRL_SOUS_SOL','Bureau Contrôle Sous-sol',                               'CONTROLE'),
  ('DIV_CTRL', 'BUR_REC_JUD_PART', 'Bureau Recettes judiciaires et de participation',        'CONTROLE'),
  ('DIV_CTRL', 'BUR_CTRL_ADM1',    'Bureau Contrôle Administratif 1',                        'CONTROLE'),
  ('DIV_CTRL', 'BUR_CTRL_ADM2',    'Bureau Contrôle Administratif 2',                        'CONTROLE'),
  ('DIV_CTRL', 'BUR_CTRL_ADM3',    'Bureau Contrôle Administratif 3',                        'CONTROLE')
) AS v(division_code, code, nom, type)
JOIN divisions dv ON dv.code = v.division_code
ON CONFLICT (code) DO UPDATE
SET division_id = EXCLUDED.division_id,
    nom = EXCLUDED.nom,
    type = EXCLUDED.type,
    actif = EXCLUDED.actif;

-- Les 36 secteurs officiels de la Division Contrôle (RM-055).
INSERT INTO secteurs (bureau_id, code, nom, actif)
SELECT b.id, v.code, v.nom, true
FROM (VALUES
  ('BUR_CTRL_SOL',      'SOL_FONCIER',                 'Affaires foncières'),
  ('BUR_CTRL_SOL',      'SOL_CONCESSIONS',             'Concessions foncières'),
  ('BUR_CTRL_SOL',      'SOL_LOTISSEMENTS',            'Lotissements'),
  ('BUR_CTRL_SOL',      'SOL_DOMAINE_PUBLIC',          'Occupation du domaine public'),
  ('BUR_CTRL_SOL',      'SOL_IMMOBILIER',              'Immobilier'),
  ('BUR_CTRL_SOL',      'SOL_AMENAGEMENT',             'Aménagement du territoire'),
  ('BUR_CTRL_SOUS_SOL', 'SSOL_MINES',                  'Mines'),
  ('BUR_CTRL_SOUS_SOL', 'SSOL_HYDROCARBURES',          'Hydrocarbures'),
  ('BUR_CTRL_SOUS_SOL', 'SSOL_CARRIERES',              'Carrières'),
  ('BUR_CTRL_SOUS_SOL', 'SSOL_SUBSTANCES_MINERALES',   'Substances minérales'),
  ('BUR_CTRL_SOUS_SOL', 'SSOL_RECHERCHE_MINIERE',      'Recherche minière'),
  ('BUR_CTRL_SOUS_SOL', 'SSOL_EXPLOITATION_PETROLIERE','Exploitation pétrolière'),
  ('BUR_REC_JUD_PART',  'RJP_COURS_TRIBUNAUX',         'Cours et tribunaux'),
  ('BUR_REC_JUD_PART',  'RJP_PARQUETS',                'Parquets'),
  ('BUR_REC_JUD_PART',  'RJP_TRIBUNAUX_COMMERCE',      'Tribunaux de commerce'),
  ('BUR_REC_JUD_PART',  'RJP_COUR_CASSATION',          'Cour de cassation'),
  ('BUR_REC_JUD_PART',  'RJP_COUR_CONSTITUTIONNELLE',  'Cour constitutionnelle'),
  ('BUR_REC_JUD_PART',  'RJP_PARTICIPATIONS_ETAT',     'Participations de l''État'),
  ('BUR_CTRL_ADM1',     'ADM1_TRANSPORTS',             'Transports'),
  ('BUR_CTRL_ADM1',     'ADM1_AVIATION',               'Aviation'),
  ('BUR_CTRL_ADM1',     'ADM1_NAVIGATION',             'Navigation maritime et fluviale'),
  ('BUR_CTRL_ADM1',     'ADM1_TELECOMMUNICATIONS',     'Télécommunications'),
  ('BUR_CTRL_ADM1',     'ADM1_POSTES',                 'Postes'),
  ('BUR_CTRL_ADM1',     'ADM1_COMMUNICATION',          'Communication'),
  ('BUR_CTRL_ADM2',     'ADM2_COMMERCE',               'Commerce'),
  ('BUR_CTRL_ADM2',     'ADM2_INDUSTRIE',              'Industrie'),
  ('BUR_CTRL_ADM2',     'ADM2_TOURISME',               'Tourisme'),
  ('BUR_CTRL_ADM2',     'ADM2_AGRICULTURE',            'Agriculture'),
  ('BUR_CTRL_ADM2',     'ADM2_PECHE_ELEVAGE',          'Pêche et élevage'),
  ('BUR_CTRL_ADM2',     'ADM2_ENVIRONNEMENT',          'Environnement'),
  ('BUR_CTRL_ADM3',     'ADM3_EMPLOI_TRAVAIL',         'Emploi et travail'),
  ('BUR_CTRL_ADM3',     'ADM3_AFFAIRES_SOCIALES',      'Affaires sociales'),
  ('BUR_CTRL_ADM3',     'ADM3_SANTE',                  'Santé'),
  ('BUR_CTRL_ADM3',     'ADM3_ENSEIGNEMENT',           'Enseignement'),
  ('BUR_CTRL_ADM3',     'ADM3_CULTURE',                'Culture'),
  ('BUR_CTRL_ADM3',     'ADM3_ARTS',                   'Arts')
) AS v(bureau_code, code, nom)
JOIN bureaux b ON b.code = v.bureau_code
ON CONFLICT (code) DO UPDATE
SET bureau_id = EXCLUDED.bureau_id,
    nom = EXCLUDED.nom,
    actif = EXCLUDED.actif;

COMMIT;
