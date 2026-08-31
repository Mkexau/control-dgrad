-- =============================================================================
-- DGRAD CONTROLE - MIGRATION : 144 AGENTS DE RECETTE PAR BUREAU ET SECTEUR
--
-- 8 Bureaux officiels x 6 Secteurs x 3 Agents = 144 Agents de Recette
-- Les agents sont des ressources métier sélectionnables dans les missions sans compte Auth.
-- =============================================================================

BEGIN;

-- 1. Ajout des 6 secteurs pour les deux bureaux de la Division Recoupement
-- afin que les 8 bureaux disposent tous de 6 secteurs de spécialité.
INSERT INTO secteurs (bureau_id, code, nom, actif)
SELECT b.id, v.code, v.nom, true
FROM (VALUES
  ('BUR_ANA_REC', 'ANA_RECOUPEMENT_BANCAIRE', 'Recoupement bancaire et flux financiers'),
  ('BUR_ANA_REC', 'ANA_DOUANES',               'Données douanières et commerce extérieur'),
  ('BUR_ANA_REC', 'ANA_IMPOTS',                'Données fiscales et déclaratives'),
  ('BUR_ANA_REC', 'ANA_MARCHES_PUBLICS',       'Marchés publics et contrats d''État'),
  ('BUR_ANA_REC', 'ANA_FLUX_FINANCIERS',       'Transferts de fonds et devises'),
  ('BUR_ANA_REC', 'ANA_SECTORIEL',             'Synthèse et enquêtes sectorielles'),
  ('BUR_DOC',     'DOC_ARCHIVAGE_NUMERIQUE',   'Archivage numérique et numérisation'),
  ('BUR_DOC',     'DOC_COLLECTE_ACTES',        'Collecte des actes générateurs'),
  ('BUR_DOC',     'DOC_REGISTRES',             'Gestion des registres et répertoires'),
  ('BUR_DOC',     'DOC_TITRES_VALEUR',         'Conservation des titres et valeurs'),
  ('BUR_DOC',     'DOC_AUTHENTIFICATION',      'Authentification des pièces justificatives'),
  ('BUR_DOC',     'DOC_VEILLE_DOCUMENTAIRE',   'Veille et documentation non fiscale')
) AS v(bureau_code, code, nom)
JOIN bureaux b ON b.code = v.bureau_code
ON CONFLICT (code) DO UPDATE
SET bureau_id = EXCLUDED.bureau_id,
    nom = EXCLUDED.nom,
    actif = EXCLUDED.actif;

-- 2. Évolution du schéma de la table agents pour supporter les agents métier sans compte Auth
ALTER TABLE agents ALTER COLUMN profile_id DROP NOT NULL;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS nom TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS prenom TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS bureau_id UUID REFERENCES bureaux(id) ON DELETE RESTRICT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS secteur_id UUID REFERENCES secteurs(id) ON DELETE RESTRICT;

-- Synchronisation des colonnes directes pour les profils agents existants
UPDATE agents a
SET bureau_id = p.bureau_id,
    nom = COALESCE(a.nom, p.nom),
    prenom = COALESCE(a.prenom, p.prenom)
FROM profiles p
WHERE a.profile_id = p.id;

-- 3. Insertion des 144 Agents de Recette Métier (8 bureaux x 6 secteurs x 3 agents)
INSERT INTO agents (matricule, nom, prenom, bureau_id, secteur_id, specialite, domaine_competence, actif)
SELECT
  v.matricule,
  v.nom,
  v.prenom,
  b.id,
  s.id,
  v.specialite,
  'Contrôle et vérification non fiscale',
  true
FROM (VALUES
  -- ---------------------------------------------------------------------------
  -- 1. BUREAU CONTROLE SOL (BUR_CTRL_SOL) - 18 agents (6 secteurs x 3)
  -- ---------------------------------------------------------------------------
  -- SOL_FONCIER
  ('AGT-SOL-FONC-001', 'Ilunga', 'Jean-Claude', 'BUR_CTRL_SOL', 'SOL_FONCIER', 'Contrôle des affaires foncières'),
  ('AGT-SOL-FONC-002', 'Mbuyi', 'Patrick', 'BUR_CTRL_SOL', 'SOL_FONCIER', 'Contrôle des affaires foncières'),
  ('AGT-SOL-FONC-003', 'Tshibanda', 'Grâce', 'BUR_CTRL_SOL', 'SOL_FONCIER', 'Contrôle des affaires foncières'),
  -- SOL_CONCESSIONS
  ('AGT-SOL-CONC-001', 'Kalala', 'Dieudonné', 'BUR_CTRL_SOL', 'SOL_CONCESSIONS', 'Contrôle des concessions foncières'),
  ('AGT-SOL-CONC-002', 'Kapinga', 'Mireille', 'BUR_CTRL_SOL', 'SOL_CONCESSIONS', 'Contrôle des concessions foncières'),
  ('AGT-SOL-CONC-003', 'Mwamba', 'Alain', 'BUR_CTRL_SOL', 'SOL_CONCESSIONS', 'Contrôle des concessions foncières'),
  -- SOL_LOTISSEMENTS
  ('AGT-SOL-LOT-001', 'Mutombo', 'Serge', 'BUR_CTRL_SOL', 'SOL_LOTISSEMENTS', 'Contrôle des lotissements et titres'),
  ('AGT-SOL-LOT-002', 'Bilonda', 'Chantal', 'BUR_CTRL_SOL', 'SOL_LOTISSEMENTS', 'Contrôle des lotissements et titres'),
  ('AGT-SOL-LOT-003', 'Kabongo', 'Éric', 'BUR_CTRL_SOL', 'SOL_LOTISSEMENTS', 'Contrôle des lotissements et titres'),
  -- SOL_DOMAINE_PUBLIC
  ('AGT-SOL-DOMP-001', 'Lukusa', 'Roger', 'BUR_CTRL_SOL', 'SOL_DOMAINE_PUBLIC', 'Contrôle du domaine public'),
  ('AGT-SOL-DOMP-002', 'Kasongo', 'Nadine', 'BUR_CTRL_SOL', 'SOL_DOMAINE_PUBLIC', 'Contrôle du domaine public'),
  ('AGT-SOL-DOMP-003', 'Tshilumba', 'Freddy', 'BUR_CTRL_SOL', 'SOL_DOMAINE_PUBLIC', 'Contrôle du domaine public'),
  -- SOL_IMMOBILIER
  ('AGT-SOL-IMM-001', 'Kazadi', 'Joseph', 'BUR_CTRL_SOL', 'SOL_IMMOBILIER', 'Contrôle des revenus immobiliers'),
  ('AGT-SOL-IMM-002', 'Mbombo', 'Francine', 'BUR_CTRL_SOL', 'SOL_IMMOBILIER', 'Contrôle des revenus immobiliers'),
  ('AGT-SOL-IMM-003', 'Ngoie', 'Christian', 'BUR_CTRL_SOL', 'SOL_IMMOBILIER', 'Contrôle des revenus immobiliers'),
  -- SOL_AMENAGEMENT
  ('AGT-SOL-AMEN-001', 'Banza', 'Guy', 'BUR_CTRL_SOL', 'SOL_AMENAGEMENT', 'Contrôle d''aménagement du territoire'),
  ('AGT-SOL-AMEN-002', 'Kanku', 'Judith', 'BUR_CTRL_SOL', 'SOL_AMENAGEMENT', 'Contrôle d''aménagement du territoire'),
  ('AGT-SOL-AMEN-003', 'Mukendi', 'Blaise', 'BUR_CTRL_SOL', 'SOL_AMENAGEMENT', 'Contrôle d''aménagement du territoire'),

  -- ---------------------------------------------------------------------------
  -- 2. BUREAU CONTROLE SOUS-SOL (BUR_CTRL_SOUS_SOL) - 18 agents (6 secteurs x 3)
  -- ---------------------------------------------------------------------------
  -- SSOL_MINES
  ('AGT-SSOL-MIN-001', 'Katende', 'Moïse', 'BUR_CTRL_SOUS_SOL', 'SSOL_MINES', 'Contrôle des redevances minières'),
  ('AGT-SSOL-MIN-002', 'Kyungu', 'Béatrice', 'BUR_CTRL_SOUS_SOL', 'SSOL_MINES', 'Contrôle des redevances minières'),
  ('AGT-SSOL-MIN-003', 'Ilunga', 'David', 'BUR_CTRL_SOUS_SOL', 'SSOL_MINES', 'Contrôle des redevances minières'),
  -- SSOL_HYDROCARBURES
  ('AGT-SSOL-HYD-001', 'Mpiana', 'Fiston', 'BUR_CTRL_SOUS_SOL', 'SSOL_HYDROCARBURES', 'Contrôle des hydrocarbures'),
  ('AGT-SSOL-HYD-002', 'Masengu', 'Solange', 'BUR_CTRL_SOUS_SOL', 'SSOL_HYDROCARBURES', 'Contrôle des hydrocarbures'),
  ('AGT-SSOL-HYD-003', 'Kabasele', 'Hervé', 'BUR_CTRL_SOUS_SOL', 'SSOL_HYDROCARBURES', 'Contrôle des hydrocarbures'),
  -- SSOL_CARRIERES
  ('AGT-SSOL-CAR-001', 'Malaba', 'Olivier', 'BUR_CTRL_SOUS_SOL', 'SSOL_CARRIERES', 'Contrôle des carrières et matériaux'),
  ('AGT-SSOL-CAR-002', 'Tshimanga', 'Sylvie', 'BUR_CTRL_SOUS_SOL', 'SSOL_CARRIERES', 'Contrôle des carrières et matériaux'),
  ('AGT-SSOL-CAR-003', 'Kalonji', 'Doudou', 'BUR_CTRL_SOUS_SOL', 'SSOL_CARRIERES', 'Contrôle des carrières et matériaux'),
  -- SSOL_SUBSTANCES_MINERALES
  ('AGT-SSOL-SUB-001', 'Banze', 'Fabrice', 'BUR_CTRL_SOUS_SOL', 'SSOL_SUBSTANCES_MINERALES', 'Contrôle des substances minérales'),
  ('AGT-SSOL-SUB-002', 'Ndaya', 'Carine', 'BUR_CTRL_SOUS_SOL', 'SSOL_SUBSTANCES_MINERALES', 'Contrôle des substances minérales'),
  ('AGT-SSOL-SUB-003', 'Kabeya', 'Thierry', 'BUR_CTRL_SOUS_SOL', 'SSOL_SUBSTANCES_MINERALES', 'Contrôle des substances minérales'),
  -- SSOL_RECHERCHE_MINIERE
  ('AGT-SSOL-REC-001', 'Lwamba', 'Hugues', 'BUR_CTRL_SOUS_SOL', 'SSOL_RECHERCHE_MINIERE', 'Contrôle de recherche minière'),
  ('AGT-SSOL-REC-002', 'Mwadi', 'Rachel', 'BUR_CTRL_SOUS_SOL', 'SSOL_RECHERCHE_MINIERE', 'Contrôle de recherche minière'),
  ('AGT-SSOL-REC-003', 'Mujinga', 'Yannick', 'BUR_CTRL_SOUS_SOL', 'SSOL_RECHERCHE_MINIERE', 'Contrôle de recherche minière'),
  -- SSOL_EXPLOITATION_PETROLIERE
  ('AGT-SSOL-PET-001', 'Mande', 'Cédric', 'BUR_CTRL_SOUS_SOL', 'SSOL_EXPLOITATION_PETROLIERE', 'Contrôle d''exploitation pétrolière'),
  ('AGT-SSOL-PET-002', 'Kalombo', 'Sandrine', 'BUR_CTRL_SOUS_SOL', 'SSOL_EXPLOITATION_PETROLIERE', 'Contrôle d''exploitation pétrolière'),
  ('AGT-SSOL-PET-003', 'Nyembo', 'Paulin', 'BUR_CTRL_SOUS_SOL', 'SSOL_EXPLOITATION_PETROLIERE', 'Contrôle d''exploitation pétrolière'),

  -- ---------------------------------------------------------------------------
  -- 3. BUREAU RECETTES JUDICIAIRES ET PARTICIPATION (BUR_REC_JUD_PART) - 18 agents
  -- ---------------------------------------------------------------------------
  -- RJP_COURS_TRIBUNAUX
  ('AGT-RJP-CT-001', 'Mwana', 'Stanislas', 'BUR_REC_JUD_PART', 'RJP_COURS_TRIBUNAUX', 'Contrôle des cours et tribunaux'),
  ('AGT-RJP-CT-002', 'Kalambayi', 'Dorcas', 'BUR_REC_JUD_PART', 'RJP_COURS_TRIBUNAUX', 'Contrôle des cours et tribunaux'),
  ('AGT-RJP-CT-003', 'Mbikayi', 'Martin', 'BUR_REC_JUD_PART', 'RJP_COURS_TRIBUNAUX', 'Contrôle des cours et tribunaux'),
  -- RJP_PARQUETS
  ('AGT-RJP-PARQ-001', 'Kanku', 'Gabriel', 'BUR_REC_JUD_PART', 'RJP_PARQUETS', 'Contrôle des recettes de parquets'),
  ('AGT-RJP-PARQ-002', 'Lusamba', 'Noëlla', 'BUR_REC_JUD_PART', 'RJP_PARQUETS', 'Contrôle des recettes de parquets'),
  ('AGT-RJP-PARQ-003', 'Musampa', 'André', 'BUR_REC_JUD_PART', 'RJP_PARQUETS', 'Contrôle des recettes de parquets'),
  -- RJP_TRIBUNAUX_COMMERCE
  ('AGT-RJP-TCOM-001', 'Luboya', 'Félix', 'BUR_REC_JUD_PART', 'RJP_TRIBUNAUX_COMMERCE', 'Contrôle des tribunaux de commerce'),
  ('AGT-RJP-TCOM-002', 'Mbiya', 'Jacqueline', 'BUR_REC_JUD_PART', 'RJP_TRIBUNAUX_COMMERCE', 'Contrôle des tribunaux de commerce'),
  ('AGT-RJP-TCOM-003', 'Banza', 'Richard', 'BUR_REC_JUD_PART', 'RJP_TRIBUNAUX_COMMERCE', 'Contrôle des tribunaux de commerce'),
  -- RJP_COUR_CASSATION
  ('AGT-RJP-CASS-001', 'Mpoyi', 'Gilbert', 'BUR_REC_JUD_PART', 'RJP_COUR_CASSATION', 'Contrôle des droits de cassation'),
  ('AGT-RJP-CASS-002', 'Mukaji', 'Christine', 'BUR_REC_JUD_PART', 'RJP_COUR_CASSATION', 'Contrôle des droits de cassation'),
  ('AGT-RJP-CASS-003', 'Ilunga', 'Victor', 'BUR_REC_JUD_PART', 'RJP_COUR_CASSATION', 'Contrôle des droits de cassation'),
  -- RJP_COUR_CONSTITUTIONNELLE
  ('AGT-RJP-CCON-001', 'Kayembe', 'Michel', 'BUR_REC_JUD_PART', 'RJP_COUR_CONSTITUTIONNELLE', 'Contrôle des actes constitutionnels'),
  ('AGT-RJP-CCON-002', 'Ngoya', 'Esther', 'BUR_REC_JUD_PART', 'RJP_COUR_CONSTITUTIONNELLE', 'Contrôle des actes constitutionnels'),
  ('AGT-RJP-CCON-003', 'Tshomba', 'Prosper', 'BUR_REC_JUD_PART', 'RJP_COUR_CONSTITUTIONNELLE', 'Contrôle des actes constitutionnels'),
  -- RJP_PARTICIPATIONS_ETAT
  ('AGT-RJP-PART-001', 'Kalala', 'Benjamin', 'BUR_REC_JUD_PART', 'RJP_PARTICIPATIONS_ETAT', 'Contrôle des dividendes et participations'),
  ('AGT-RJP-PART-002', 'Ditutu', 'Vanessa', 'BUR_REC_JUD_PART', 'RJP_PARTICIPATIONS_ETAT', 'Contrôle des dividendes et participations'),
  ('AGT-RJP-PART-003', 'Tshilolo', 'Denis', 'BUR_REC_JUD_PART', 'RJP_PARTICIPATIONS_ETAT', 'Contrôle des dividendes et participations'),

  -- ---------------------------------------------------------------------------
  -- 4. BUREAU CONTROLE ADMINISTRATIF 1 (BUR_CTRL_ADM1) - 18 agents
  -- ---------------------------------------------------------------------------
  -- ADM1_TRANSPORTS
  ('AGT-ADM1-TRP-001', 'Lukoki', 'Sylvain', 'BUR_CTRL_ADM1', 'ADM1_TRANSPORTS', 'Contrôle des transports terrestres'),
  ('AGT-ADM1-TRP-002', 'Kibambe', 'Brigitte', 'BUR_CTRL_ADM1', 'ADM1_TRANSPORTS', 'Contrôle des transports terrestres'),
  ('AGT-ADM1-TRP-003', 'Kasongo', 'Norbert', 'BUR_CTRL_ADM1', 'ADM1_TRANSPORTS', 'Contrôle des transports terrestres'),
  -- ADM1_AVIATION
  ('AGT-ADM1-AVI-001', 'Bipendu', 'Emmanuel', 'BUR_CTRL_ADM1', 'ADM1_AVIATION', 'Contrôle de l''aviation civile'),
  ('AGT-ADM1-AVI-002', 'Kapinga', 'Clarisse', 'BUR_CTRL_ADM1', 'ADM1_AVIATION', 'Contrôle de l''aviation civile'),
  ('AGT-ADM1-AVI-003', 'Tshisekedi', 'Justin', 'BUR_CTRL_ADM1', 'ADM1_AVIATION', 'Contrôle de l''aviation civile'),
  -- ADM1_NAVIGATION
  ('AGT-ADM1-NAV-001', 'Mbombo', 'Pascal', 'BUR_CTRL_ADM1', 'ADM1_NAVIGATION', 'Contrôle des voies navigables'),
  ('AGT-ADM1-NAV-002', 'Ntumba', 'Odette', 'BUR_CTRL_ADM1', 'ADM1_NAVIGATION', 'Contrôle des voies navigables'),
  ('AGT-ADM1-NAV-003', 'Katompa', 'Jacques', 'BUR_CTRL_ADM1', 'ADM1_NAVIGATION', 'Contrôle des voies navigables'),
  -- ADM1_TELECOMMUNICATIONS
  ('AGT-ADM1-TEL-001', 'Mukadi', 'Daniel', 'BUR_CTRL_ADM1', 'ADM1_TELECOMMUNICATIONS', 'Contrôle des télécommunications'),
  ('AGT-ADM1-TEL-002', 'Malu', 'Patricia', 'BUR_CTRL_ADM1', 'ADM1_TELECOMMUNICATIONS', 'Contrôle des télécommunications'),
  ('AGT-ADM1-TEL-003', 'Muteba', 'Laurent', 'BUR_CTRL_ADM1', 'ADM1_TELECOMMUNICATIONS', 'Contrôle des télécommunications'),
  -- ADM1_POSTES
  ('AGT-ADM1-POS-001', 'Tshibangu', 'Auguste', 'BUR_CTRL_ADM1', 'ADM1_POSTES', 'Contrôle des services postaux'),
  ('AGT-ADM1-POS-002', 'Ilunga', 'Marie-Claire', 'BUR_CTRL_ADM1', 'ADM1_POSTES', 'Contrôle des services postaux'),
  ('AGT-ADM1-POS-003', 'Kalenda', 'Bruno', 'BUR_CTRL_ADM1', 'ADM1_POSTES', 'Contrôle des services postaux'),
  -- ADM1_COMMUNICATION
  ('AGT-ADM1-COM-001', 'Kayembe', 'Vincent', 'BUR_CTRL_ADM1', 'ADM1_COMMUNICATION', 'Contrôle des médias et communication'),
  ('AGT-ADM1-COM-002', 'Mbuyi', 'Jeanne', 'BUR_CTRL_ADM1', 'ADM1_COMMUNICATION', 'Contrôle des médias et communication'),
  ('AGT-ADM1-COM-003', 'Ngoie', 'Christophe', 'BUR_CTRL_ADM1', 'ADM1_COMMUNICATION', 'Contrôle des médias et communication'),

  -- ---------------------------------------------------------------------------
  -- 5. BUREAU CONTROLE ADMINISTRATIF 2 (BUR_CTRL_ADM2) - 18 agents
  -- ---------------------------------------------------------------------------
  -- ADM2_COMMERCE
  ('AGT-ADM2-COM-001', 'Kabwe', 'Godefroid', 'BUR_CTRL_ADM2', 'ADM2_COMMERCE', 'Contrôle des redevances commerciales'),
  ('AGT-ADM2-COM-002', 'Mujinga', 'Charlotte', 'BUR_CTRL_ADM2', 'ADM2_COMMERCE', 'Contrôle des redevances commerciales'),
  ('AGT-ADM2-COM-003', 'Nsenda', 'Arthur', 'BUR_CTRL_ADM2', 'ADM2_COMMERCE', 'Contrôle des redevances commerciales'),
  -- ADM2_INDUSTRIE
  ('AGT-ADM2-IND-001', 'Kasereka', 'Séraphin', 'BUR_CTRL_ADM2', 'ADM2_INDUSTRIE', 'Contrôle des établissements industriels'),
  ('AGT-ADM2-IND-002', 'Masika', 'Florence', 'BUR_CTRL_ADM2', 'ADM2_INDUSTRIE', 'Contrôle des établissements industriels'),
  ('AGT-ADM2-IND-003', 'Kambale', 'Émile', 'BUR_CTRL_ADM2', 'ADM2_INDUSTRIE', 'Contrôle des établissements industriels'),
  -- ADM2_TOURISME
  ('AGT-ADM2-TOU-001', 'Mumbere', 'Gustave', 'BUR_CTRL_ADM2', 'ADM2_TOURISME', 'Contrôle du tourisme et hôtellerie'),
  ('AGT-ADM2-TOU-002', 'Kavira', 'Alice', 'BUR_CTRL_ADM2', 'ADM2_TOURISME', 'Contrôle du tourisme et hôtellerie'),
  ('AGT-ADM2-TOU-003', 'Paluku', 'Léonard', 'BUR_CTRL_ADM2', 'ADM2_TOURISME', 'Contrôle du tourisme et hôtellerie'),
  -- ADM2_AGRICULTURE
  ('AGT-ADM2-AGR-001', 'Mutima', 'Joseph', 'BUR_CTRL_ADM2', 'ADM2_AGRICULTURE', 'Contrôle des filières agricoles'),
  ('AGT-ADM2-AGR-002', 'Kahindo', 'Angélique', 'BUR_CTRL_ADM2', 'ADM2_AGRICULTURE', 'Contrôle des filières agricoles'),
  ('AGT-ADM2-AGR-003', 'Muhindo', 'Innocent', 'BUR_CTRL_ADM2', 'ADM2_AGRICULTURE', 'Contrôle des filières agricoles'),
  -- ADM2_PECHE_ELEVAGE
  ('AGT-ADM2-PEC-001', 'Kakule', 'Dieudonné', 'BUR_CTRL_ADM2', 'ADM2_PECHE_ELEVAGE', 'Contrôle de pêche et élevage'),
  ('AGT-ADM2-PEC-002', 'Katungu', 'Madeleine', 'BUR_CTRL_ADM2', 'ADM2_PECHE_ELEVAGE', 'Contrôle de pêche et élevage'),
  ('AGT-ADM2-PEC-003', 'Kasoki', 'Jérôme', 'BUR_CTRL_ADM2', 'ADM2_PECHE_ELEVAGE', 'Contrôle de pêche et élevage'),
  -- ADM2_ENVIRONNEMENT
  ('AGT-ADM2-ENV-001', 'Paluku', 'Zacharie', 'BUR_CTRL_ADM2', 'ADM2_ENVIRONNEMENT', 'Contrôle environnemental et forêts'),
  ('AGT-ADM2-ENV-002', 'Kavugho', 'Yvonne', 'BUR_CTRL_ADM2', 'ADM2_ENVIRONNEMENT', 'Contrôle environnemental et forêts'),
  ('AGT-ADM2-ENV-003', 'Kambale', 'Bernard', 'BUR_CTRL_ADM2', 'ADM2_ENVIRONNEMENT', 'Contrôle environnemental et forêts'),

  -- ---------------------------------------------------------------------------
  -- 6. BUREAU CONTROLE ADMINISTRATIF 3 (BUR_CTRL_ADM3) - 18 agents
  -- ---------------------------------------------------------------------------
  -- ADM3_EMPLOI_TRAVAIL
  ('AGT-ADM3-EMP-001', 'Bolamba', 'Thomas', 'BUR_CTRL_ADM3', 'ADM3_EMPLOI_TRAVAIL', 'Contrôle de l''emploi et main d''œuvre'),
  ('AGT-ADM3-EMP-002', 'Boketshu', 'Henriette', 'BUR_CTRL_ADM3', 'ADM3_EMPLOI_TRAVAIL', 'Contrôle de l''emploi et main d''œuvre'),
  ('AGT-ADM3-EMP-003', 'Lokole', 'Charles', 'BUR_CTRL_ADM3', 'ADM3_EMPLOI_TRAVAIL', 'Contrôle de l''emploi et main d''œuvre'),
  -- ADM3_AFFAIRES_SOCIALES
  ('AGT-ADM3-SOC-001', 'Mbongo', 'Simon', 'BUR_CTRL_ADM3', 'ADM3_AFFAIRES_SOCIALES', 'Contrôle des affaires sociales'),
  ('AGT-ADM3-SOC-002', 'Boteko', 'Geneviève', 'BUR_CTRL_ADM3', 'ADM3_AFFAIRES_SOCIALES', 'Contrôle des affaires sociales'),
  ('AGT-ADM3-SOC-003', 'Ifeko', 'Raymond', 'BUR_CTRL_ADM3', 'ADM3_AFFAIRES_SOCIALES', 'Contrôle des affaires sociales'),
  -- ADM3_SANTE
  ('AGT-ADM3-SAN-001', 'Iyeli', 'Théophile', 'BUR_CTRL_ADM3', 'ADM3_SANTE', 'Contrôle des structures de santé'),
  ('AGT-ADM3-SAN-002', 'Mpembe', 'Colette', 'BUR_CTRL_ADM3', 'ADM3_SANTE', 'Contrôle des structures de santé'),
  ('AGT-ADM3-SAN-003', 'Bomolo', 'Faustin', 'BUR_CTRL_ADM3', 'ADM3_SANTE', 'Contrôle des structures de santé'),
  -- ADM3_ENSEIGNEMENT
  ('AGT-ADM3-ENS-001', 'Mboyo', 'Albert', 'BUR_CTRL_ADM3', 'ADM3_ENSEIGNEMENT', 'Contrôle de l''enseignement supérieur'),
  ('AGT-ADM3-ENS-002', 'Bompongo', 'Julienne', 'BUR_CTRL_ADM3', 'ADM3_ENSEIGNEMENT', 'Contrôle de l''enseignement supérieur'),
  ('AGT-ADM3-ENS-003', 'Lofombo', 'Maurice', 'BUR_CTRL_ADM3', 'ADM3_ENSEIGNEMENT', 'Contrôle de l''enseignement supérieur'),
  -- ADM3_CULTURE
  ('AGT-ADM3-CUL-001', 'Besala', 'Donatien', 'BUR_CTRL_ADM3', 'ADM3_CULTURE', 'Contrôle des industries culturelles'),
  ('AGT-ADM3-CUL-002', 'Boale', 'Pauline', 'BUR_CTRL_ADM3', 'ADM3_CULTURE', 'Contrôle des industries culturelles'),
  ('AGT-ADM3-CUL-003', 'Ekila', 'Gilbert', 'BUR_CTRL_ADM3', 'ADM3_CULTURE', 'Contrôle des industries culturelles'),
  -- ADM3_ARTS
  ('AGT-ADM3-ART-001', 'Bongeli', 'Honoré', 'BUR_CTRL_ADM3', 'ADM3_ARTS', 'Contrôle du patrimoine artistique'),
  ('AGT-ADM3-ART-002', 'Boyoo', 'Clémentine', 'BUR_CTRL_ADM3', 'ADM3_ARTS', 'Contrôle du patrimoine artistique'),
  ('AGT-ADM3-ART-003', 'Isandjola', 'Robert', 'BUR_CTRL_ADM3', 'ADM3_ARTS', 'Contrôle du patrimoine artistique'),

  -- ---------------------------------------------------------------------------
  -- 7. BUREAU ANALYSE ET RECOUPEMENT (BUR_ANA_REC) - 18 agents
  -- ---------------------------------------------------------------------------
  -- ANA_RECOUPEMENT_BANCAIRE
  ('AGT-ANA-BNK-001', 'Mokonzi', 'Samuel', 'BUR_ANA_REC', 'ANA_RECOUPEMENT_BANCAIRE', 'Analyse des transactions et relevés bancaires'),
  ('AGT-ANA-BNK-002', 'Ngoyi', 'Rebecca', 'BUR_ANA_REC', 'ANA_RECOUPEMENT_BANCAIRE', 'Analyse des transactions et relevés bancaires'),
  ('AGT-ANA-BNK-003', 'Bilolo', 'Jonas', 'BUR_ANA_REC', 'ANA_RECOUPEMENT_BANCAIRE', 'Analyse des transactions et relevés bancaires'),
  -- ANA_DOUANES
  ('AGT-ANA-DOU-001', 'Makambo', 'Élisée', 'BUR_ANA_REC', 'ANA_DOUANES', 'Recoupement des déclarations douanières'),
  ('AGT-ANA-DOU-002', 'Kakese', 'Déborah', 'BUR_ANA_REC', 'ANA_DOUANES', 'Recoupement des déclarations douanières'),
  ('AGT-ANA-DOU-003', 'Lumbala', 'Nathan', 'BUR_ANA_REC', 'ANA_DOUANES', 'Recoupement des déclarations douanières'),
  -- ANA_IMPOTS
  ('AGT-ANA-IMP-001', 'Kalengayi', 'Matthieu', 'BUR_ANA_REC', 'ANA_IMPOTS', 'Recoupement des données d''imposition'),
  ('AGT-ANA-IMP-002', 'Ngalula', 'Sarah', 'BUR_ANA_REC', 'ANA_IMPOTS', 'Recoupement des données d''imposition'),
  ('AGT-ANA-IMP-003', 'Mukuna', 'Élie', 'BUR_ANA_REC', 'ANA_IMPOTS', 'Recoupement des données d''imposition'),
  -- ANA_MARCHES_PUBLICS
  ('AGT-ANA-MCH-001', 'Banza', 'Jonathan', 'BUR_ANA_REC', 'ANA_MARCHES_PUBLICS', 'Contrôle des marchés et contrats publics'),
  ('AGT-ANA-MCH-002', 'Tshilobo', 'Naomi', 'BUR_ANA_REC', 'ANA_MARCHES_PUBLICS', 'Contrôle des marchés et contrats publics'),
  ('AGT-ANA-MCH-003', 'Mpoyi', 'Caleb', 'BUR_ANA_REC', 'ANA_MARCHES_PUBLICS', 'Contrôle des marchés et contrats publics'),
  -- ANA_FLUX_FINANCIERS
  ('AGT-ANA-FLX-001', 'Tshimanga', 'Daniel', 'BUR_ANA_REC', 'ANA_FLUX_FINANCIERS', 'Analyse des transferts et flux de devises'),
  ('AGT-ANA-FLX-002', 'Kabena', 'Eunice', 'BUR_ANA_REC', 'ANA_FLUX_FINANCIERS', 'Analyse des transferts et flux de devises'),
  ('AGT-ANA-FLX-003', 'Kazadi', 'Timothée', 'BUR_ANA_REC', 'ANA_FLUX_FINANCIERS', 'Analyse des transferts et flux de devises'),
  -- ANA_SECTORIEL
  ('AGT-ANA-SEC-001', 'Mwamba', 'Josué', 'BUR_ANA_REC', 'ANA_SECTORIEL', 'Enquêtes et synthèse de recoupement'),
  ('AGT-ANA-SEC-002', 'Mbuyi', 'Priscilla', 'BUR_ANA_REC', 'ANA_SECTORIEL', 'Enquêtes et synthèse de recoupement'),
  ('AGT-ANA-SEC-003', 'Ngoie', 'Silas', 'BUR_ANA_REC', 'ANA_SECTORIEL', 'Enquêtes et synthèse de recoupement'),

  -- ---------------------------------------------------------------------------
  -- 8. BUREAU DOCUMENTATION (BUR_DOC) - 18 agents
  -- ---------------------------------------------------------------------------
  -- DOC_ARCHIVAGE_NUMERIQUE
  ('AGT-DOC-ARC-001', 'Mayele', 'Benjamin', 'BUR_DOC', 'DOC_ARCHIVAGE_NUMERIQUE', 'Archivage et numérisation des dossiers'),
  ('AGT-DOC-ARC-002', 'Masika', 'Ruth', 'BUR_DOC', 'DOC_ARCHIVAGE_NUMERIQUE', 'Archivage et numérisation des dossiers'),
  ('AGT-DOC-ARC-003', 'Kimbangu', 'Salomon', 'BUR_DOC', 'DOC_ARCHIVAGE_NUMERIQUE', 'Archivage et numérisation des dossiers'),
  -- DOC_COLLECTE_ACTES
  ('AGT-DOC-COL-001', 'Mbemba', 'Jérémie', 'BUR_DOC', 'DOC_COLLECTE_ACTES', 'Collecte et classement des actes générateurs'),
  ('AGT-DOC-COL-002', 'Luwawa', 'Ketsia', 'BUR_DOC', 'DOC_COLLECTE_ACTES', 'Collecte et classement des actes générateurs'),
  ('AGT-DOC-COL-003', 'Matondo', 'Gédéon', 'BUR_DOC', 'DOC_COLLECTE_ACTES', 'Collecte et classement des actes générateurs'),
  -- DOC_REGISTRES
  ('AGT-DOC-REG-001', 'Ndombe', 'Moïse', 'BUR_DOC', 'DOC_REGISTRES', 'Tenue des registres des assujettis'),
  ('AGT-DOC-REG-002', 'Nsimba', 'Tabitha', 'BUR_DOC', 'DOC_REGISTRES', 'Tenue des registres des assujettis'),
  ('AGT-DOC-REG-003', 'Nzuzi', 'Aaron', 'BUR_DOC', 'DOC_REGISTRES', 'Tenue des registres des assujettis'),
  -- DOC_TITRES_VALEUR
  ('AGT-DOC-TIT-001', 'Kiese', 'Éphraïm', 'BUR_DOC', 'DOC_TITRES_VALEUR', 'Conservation et sécurisation des titres'),
  ('AGT-DOC-TIT-002', 'Malonda', 'Dorcas', 'BUR_DOC', 'DOC_TITRES_VALEUR', 'Conservation et sécurisation des titres'),
  ('AGT-DOC-TIT-003', 'Mavungu', 'Manassé', 'BUR_DOC', 'DOC_TITRES_VALEUR', 'Conservation et sécurisation des titres'),
  -- DOC_AUTHENTIFICATION
  ('AGT-DOC-AUT-001', 'Bula', 'Siméon', 'BUR_DOC', 'DOC_AUTHENTIFICATION', 'Authentification des pièces justificatives'),
  ('AGT-DOC-AUT-002', 'Lelo', 'Divine', 'BUR_DOC', 'DOC_AUTHENTIFICATION', 'Authentification des pièces justificatives'),
  ('AGT-DOC-AUT-003', 'Mabiala', 'Lévi', 'BUR_DOC', 'DOC_AUTHENTIFICATION', 'Authentification des pièces justificatives'),
  -- DOC_VEILLE_DOCUMENTAIRE
  ('AGT-DOC-VEI-001', 'Landu', 'Joël', 'BUR_DOC', 'DOC_VEILLE_DOCUMENTAIRE', 'Veille réglementaire et documentaire'),
  ('AGT-DOC-VEI-002', 'Mavinga', 'Grâce', 'BUR_DOC', 'DOC_VEILLE_DOCUMENTAIRE', 'Veille réglementaire et documentaire'),
  ('AGT-DOC-VEI-003', 'Tsasa', 'Ruben', 'BUR_DOC', 'DOC_VEILLE_DOCUMENTAIRE', 'Veille réglementaire et documentaire')
) AS v(matricule, nom, prenom, bureau_code, secteur_code, specialite)
JOIN bureaux b ON b.code = v.bureau_code
JOIN secteurs s ON s.code = v.secteur_code
ON CONFLICT (matricule) DO UPDATE
SET nom = EXCLUDED.nom,
    prenom = EXCLUDED.prenom,
    bureau_id = EXCLUDED.bureau_id,
    secteur_id = EXCLUDED.secteur_id,
    specialite = EXCLUDED.specialite,
    domaine_competence = EXCLUDED.domaine_competence,
    actif = EXCLUDED.actif;

-- 4. Mise à jour de la politique RLS sur agents pour cloisonner la visibilité par bureau
DROP POLICY IF EXISTS "agents_select_hierarchie" ON agents;
CREATE POLICY "agents_select_hierarchie" ON agents FOR SELECT TO authenticated USING (
  -- L'agent accède à son propre dossier si rattaché à un profil
  profile_id = auth_user_profile_id()
  -- L'administrateur technique et les directeurs ont une vue globale
  OR auth_user_role() IN ('ADMIN', 'DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CONSULTATION')
  -- Le Chef de Division voit les agents des bureaux de sa division
  OR (auth_user_role() = 'CHEF_DIVISION' AND EXISTS (
      SELECT 1 FROM bureaux b
      WHERE b.id = COALESCE(agents.bureau_id, (SELECT p.bureau_id FROM profiles p WHERE p.id = agents.profile_id))
      AND b.division_id = auth_user_division_id()
  ))
  -- Le Chef de Bureau et l'Analyste voient uniquement les agents de leur bureau
  OR (auth_user_role() IN ('CHEF_BUREAU', 'ANALYSTE') AND (
      COALESCE(agents.bureau_id, (SELECT p.bureau_id FROM profiles p WHERE p.id = agents.profile_id)) = auth_user_bureau_id()
  ))
  -- Le Chef d'équipe et Contrôleur voient les agents de leur bureau ou de leurs missions/équipes
  OR (auth_user_role() IN ('CHEF_EQUIPE', 'CONTROLEUR') AND (
      COALESCE(agents.bureau_id, (SELECT p.bureau_id FROM profiles p WHERE p.id = agents.profile_id)) = auth_user_bureau_id()
      OR id IN (
          SELECT ea.agent_id FROM equipe_agents ea
          JOIN equipes eq ON eq.id = ea.equipe_id
          WHERE eq.chef_equipe_id = auth_user_agent_id()
      )
  ))
);

COMMIT;
