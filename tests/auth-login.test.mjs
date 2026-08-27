import { describe, it } from 'node:test';
import assert from 'node:assert';
import { LoginSchema } from '../lib/validations/auth.ts';
import { getSafeRedirectUrl } from '../lib/auth/safe-redirect.ts';

describe('Page de Connexion — Validation Zod & Protection Open Redirect', () => {
  // ===========================================================================
  // 1. Tests du Schéma Zod LoginSchema
  // ===========================================================================
  describe('1. Schéma de Validation LoginSchema', () => {
    it('accepte des identifiants valides', () => {
      const input = {
        email: 'agent.controle@dgrad.cd',
        password: 'Password123!',
      };
      const result = LoginSchema.safeParse(input);
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.email, 'agent.controle@dgrad.cd');
      }
    });

    it('nettoie les espaces autour de l\'email (trim)', () => {
      const input = {
        email: '   dg@dgrad.cd   ',
        password: 'SecretPassword',
      };
      const result = LoginSchema.safeParse(input);
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.email, 'dg@dgrad.cd');
      }
    });

    it('rejette un format d\'email invalide', () => {
      const input = {
        email: 'not-an-email',
        password: 'Password123!',
      };
      const result = LoginSchema.safeParse(input);
      assert.strictEqual(result.success, false);
      assert.ok(result.error.issues.some((i) => i.path.includes('email')));
    });

    it('rejette un mot de passe trop court (< 6 caractères)', () => {
      const input = {
        email: 'agent@dgrad.cd',
        password: '123',
      };
      const result = LoginSchema.safeParse(input);
      assert.strictEqual(result.success, false);
      assert.ok(result.error.issues.some((i) => i.path.includes('password')));
    });

    it('rejette les champs vides', () => {
      const result = LoginSchema.safeParse({ email: '', password: '' });
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error.issues.length, 2);
    });
  });

  // ===========================================================================
  // 2. Tests de Sécurité : Protection contre les Open Redirects
  // ===========================================================================
  describe('2. Protection contre les Open Redirects (getSafeRedirectUrl)', () => {
    it('autorise les chemins internes relatifs standards', () => {
      assert.strictEqual(getSafeRedirectUrl('/missions'), '/missions');
      assert.strictEqual(getSafeRedirectUrl('/missions/nouvelle'), '/missions/nouvelle');
      assert.strictEqual(getSafeRedirectUrl('/admin/utilisateurs'), '/admin/utilisateurs');
      assert.strictEqual(getSafeRedirectUrl('/'), '/');
    });

    it('autorise les chemins internes avec query params et hash', () => {
      assert.strictEqual(
        getSafeRedirectUrl('/missions/12345?tab=equipes#details'),
        '/missions/12345?tab=equipes#details'
      );
    });

    it('bloque les redirections absolues externes (https://)', () => {
      assert.strictEqual(getSafeRedirectUrl('https://evil-attacker.com'), '/missions');
      assert.strictEqual(getSafeRedirectUrl('https://evil.com/phishing'), '/missions');
    });

    it('bloque les redirections absolues externes (http://)', () => {
      assert.strictEqual(getSafeRedirectUrl('http://evil-attacker.com'), '/missions');
    });

    it('bloque le bypass de protocole relatif (//evil.com)', () => {
      assert.strictEqual(getSafeRedirectUrl('//evil.com'), '/missions');
      assert.strictEqual(getSafeRedirectUrl('//evil.com/path'), '/missions');
    });

    it('bloque le bypass par antislash (/\\evil.com)', () => {
      assert.strictEqual(getSafeRedirectUrl('/\\evil.com'), '/missions');
    });

    it('bloque les pseudo-protocoles javascript: et data:', () => {
      assert.strictEqual(getSafeRedirectUrl('javascript:alert(1)'), '/missions');
      assert.strictEqual(getSafeRedirectUrl('data:text/html,<script>alert(1)</script>'), '/missions');
    });

    it('utilise le fallback par défaut lorsque target est null, undefined ou vide', () => {
      assert.strictEqual(getSafeRedirectUrl(null), '/missions');
      assert.strictEqual(getSafeRedirectUrl(undefined), '/missions');
      assert.strictEqual(getSafeRedirectUrl(''), '/missions');
      assert.strictEqual(getSafeRedirectUrl('   '), '/missions');
    });

    it('respecte un fallback personnalisé', () => {
      assert.strictEqual(getSafeRedirectUrl('https://evil.com', '/admin'), '/admin');
      assert.strictEqual(getSafeRedirectUrl(null, '/accueil'), '/accueil');
    });
  });
});
