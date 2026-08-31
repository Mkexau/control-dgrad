# Environnement de développement

## Prérequis

- Node.js `22.20.0` (LTS), également référencé dans `.nvmrc` ;
- npm `10` ou une version compatible avec Node 22 ;
- un accès au projet Supabase distant lorsque la consultation des données réelles est nécessaire.

Next.js `16.3.2` exige au minimum Node.js `20.9`. Sous Windows, installez Node 22 LTS depuis nodejs.org, ou utilisez un gestionnaire de versions compatible avec PowerShell, tel que `fnm`.

## Démarrage sur une machine propre

Dans PowerShell ou CMD :

```powershell
git clone <URL_DU_DEPOT>
cd dgrad-controle
npm ci
Copy-Item .env.example .env.local
```

Renseignez ensuite les valeurs de votre environnement dans `.env.local`. Ce fichier est volontairement ignoré par Git et ne doit jamais être commité.

```powershell
npm run dev
```

Ouvrez ensuite [http://localhost:3000](http://localhost:3000).

## Variables d’environnement

Les variables suivantes sont requises :

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` est réservée au serveur : ne la préfixez jamais par `NEXT_PUBLIC_` et ne la partagez jamais dans un ticket, un commit ou le navigateur.

## Commandes utiles

```powershell
npm run dev        # serveur de développement
npm run typecheck  # vérification TypeScript
npm run lint       # vérification ESLint
npm run test       # tests Node existants
npm run build      # build de production
npx supabase migration list # consultation read-only des migrations distantes
```

`npm ci` installe exactement les dépendances déclarées dans `package-lock.json`. Utilisez-le plutôt que `npm install` pour reproduire l’environnement.

## Supabase

Le projet utilise un Supabase distant. Les migrations sont versionnées dans `supabase/migrations`. Cette préparation ne fait ni `db reset`, ni `db push`, ni modification des données distantes.

## Contrôles avant contribution

Avant une modification, exécutez :

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```
