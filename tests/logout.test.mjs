import test from 'node:test';
import assert from 'node:assert/strict';
import { signOutAndRedirect } from '../lib/auth/logout-client.ts';

test('la déconnexion appelle Supabase, rafraîchit le cache puis redirige vers /connexion', async () => {
  const calls = [];
  const result = await signOutAndRedirect(
    async () => {
      calls.push('signOut');
      return { error: null };
    },
    {
      refresh: () => calls.push('refresh'),
      replace: (href) => calls.push(`replace:${href}`),
    }
  );

  assert.deepEqual(result, { success: true });
  assert.deepEqual(calls, ['signOut', 'refresh', 'replace:/connexion']);
});

test('une erreur Supabase conserve la page et expose un message générique', async () => {
  const calls = [];
  const result = await signOutAndRedirect(
    async () => ({ error: { message: 'network detail that must not be exposed' } }),
    {
      refresh: () => calls.push('refresh'),
      replace: (href) => calls.push(`replace:${href}`),
    }
  );

  assert.deepEqual(result, {
    success: false,
    message: 'La déconnexion a échoué. Veuillez réessayer.',
  });
  assert.deepEqual(calls, []);
});
