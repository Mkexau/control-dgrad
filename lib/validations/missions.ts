// =============================================================================
// DGRAD CONTROLE - SCHÉMAS DE VALIDATION ZOD POUR LE MODULE MISSIONS & WORKFLOWS
// =============================================================================

import { z } from 'zod';

// Types énumérés normalisés
export const MissionTypeEnum = z.enum(['SUR_PLACE', 'SUR_PIECES']);
export type MissionType = z.infer<typeof MissionTypeEnum>;

export const MissionStatusEnum = z.enum([
  'BROUILLON',
  'SOUMISE',
  'EXAMEN_CHEF_DIVISION',
  'EXAMEN_DIRECTEUR_CONTROLES',
  'ATTENTE_DG',
  'DEMANDE_SOUMISE',
  'EXAMEN_CHEF_SECTION',
  'APPROUVEE',
  'REJETEE',
  'ORDRE_MISSION_GENERE',
  'AUTORISATION_GENEREE',
  'CONTROLEUR_DESIGNE',
  'EQUIPES_AFFECTEES',
  'CONTROLE_EN_COURS',
  'CONTROLE_TERMINE',
  'RESULTAT',
  'PROCES_VERBAL',
  'FEUILLE_OBSERVATIONS',
  'RAPPORT',
  'CLOTUREE',
  'ANNULEE',
]);
export type MissionStatus = z.infer<typeof MissionStatusEnum>;

export const ValidationTypeEnum = z.enum([
  'CHEF_DIVISION',
  'DIRECTEUR_CONTROLES',
  'DG',
  'CHEF_SECTION',
]);
export type ValidationType = z.infer<typeof ValidationTypeEnum>;

export const ValidationStatusEnum = z.enum(['APPROUVE', 'REJETE', 'RETOURNE']);
export type ValidationStatus = z.infer<typeof ValidationStatusEnum>;

export const EquipeStatusEnum = z.enum(['PROPOSEE', 'CONFIRMEE', 'ANNULEE']);
export type EquipeStatus = z.infer<typeof EquipeStatusEnum>;

// Proposition d'équipe pour une mission SUR_PLACE
export const EquipeProposalSchema = z.object({
  nom: z.string().trim().min(2, 'Le nom de l\'équipe doit comporter au moins 2 caractères'),
  chef_equipe_id: z.string().uuid('L\'identifiant du chef d\'équipe doit être un UUID valide'),
  agents_ids: z.array(z.string().uuid()).min(1, 'Au moins un agent doit être affecté à l\'équipe'),
  assujettis_ids: z.array(z.string().uuid()).min(1, 'Au moins une entreprise doit être affectée à l\'équipe'),
});

// Création d'une mission
export const MissionCreateSchema = z.object({
  type_controle: MissionTypeEnum,
  bureau_id: z.string().uuid('L\'identifiant du bureau doit être un UUID valide'),
  secteur_id: z.string().uuid('L\'identifiant du secteur doit être un UUID valide').optional().nullable(),
  motif: z.string().trim().min(5, 'Le motif de la mission doit comporter au moins 5 caractères'),
  assujettis_ids: z.array(z.string().uuid()).min(1, 'Au moins une entreprise / assujetti doit être sélectionné'),
  equipes_propositions: z.array(EquipeProposalSchema).optional().nullable(),
});
export type MissionCreateInput = z.infer<typeof MissionCreateSchema>;

// Modification d'une mission (état BROUILLON)
export const MissionUpdateSchema = z.object({
  id: z.string().uuid('L\'identifiant de la mission doit être un UUID valide'),
  secteur_id: z.string().uuid().optional().nullable(),
  motif: z.string().trim().min(5, 'Le motif doit comporter au moins 5 caractères'),
  assujettis_ids: z.array(z.string().uuid()).min(1, 'Au moins une entreprise doit être sélectionnée'),
  equipes_propositions: z.array(EquipeProposalSchema).optional().nullable(),
});
export type MissionUpdateInput = z.infer<typeof MissionUpdateSchema>;

// Soumission d'une mission
export const MissionSubmitSchema = z.object({
  mission_id: z.string().uuid('L\'identifiant de la mission doit être un UUID valide'),
});
export type MissionSubmitInput = z.infer<typeof MissionSubmitSchema>;

// Décision hiérarchique (Chef Division, Directeur Contrôles, DG, Chef Section)
export const MissionValidationDecisionSchema = z.object({
  mission_id: z.string().uuid('L\'identifiant de la mission doit être un UUID valide'),
  decision: ValidationStatusEnum,
  motif: z.string().trim().optional().nullable(),
  commentaire: z.string().trim().optional().nullable(),
}).refine(
  (data) => {
    if ((data.decision === 'REJETE' || data.decision === 'RETOURNE') && (!data.motif || data.motif.trim().length < 5)) {
      return false;
    }
    return true;
  },
  {
    message: 'Un motif d\'au moins 5 caractères est obligatoire en cas de rejet ou de retour.',
    path: ['motif'],
  }
);
export type MissionValidationDecisionInput = z.infer<typeof MissionValidationDecisionSchema>;

// Désignation du contrôleur sur pièces
export const MissionDesignateControleurSchema = z.object({
  mission_id: z.string().uuid('L\'identifiant de la mission doit être un UUID valide'),
  controleur_id: z.string().uuid('L\'identifiant du contrôleur doit être un UUID valide'),
});
export type MissionDesignateControleurInput = z.infer<typeof MissionDesignateControleurSchema>;

// Reprise d'une mission rejetée vers BROUILLON
export const MissionResetToDraftSchema = z.object({
  mission_id: z.string().uuid('L\'identifiant de la mission doit être un UUID valide'),
});
export type MissionResetToDraftInput = z.infer<typeof MissionResetToDraftSchema>;

// Annulation d'une mission
export const MissionCancelSchema = z.object({
  mission_id: z.string().uuid('L\'identifiant de la mission doit être un UUID valide'),
  motif_annulation: z.string().trim().min(5, 'Le motif d\'annulation doit comporter au moins 5 caractères'),
});
export type MissionCancelInput = z.infer<typeof MissionCancelSchema>;
