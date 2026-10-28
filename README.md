# Happen

Apprendre la tech avec ses potes et aller jusqu’au bout. Happen réunit vos formations, objectifs, sessions focus et preuves de progression dans des rooms privées.

## Produit

- Rooms et invitations par lien, avec contrôle de l’appartenance côté serveur.
- Formations, playlists et projets découpés en étapes ; progression propre à chaque membre.
- Minuteur focus conservé entre les onglets et les rechargements, pause et reprise.
- Journal de progression, liens de preuve, encouragements et validation par un autre membre.
- Planning partagé et fichiers calendrier avec une alerte 15 minutes avant la session.
- Statistiques, régularité et classement hebdomadaire calculés à partir de l’activité enregistrée.
- Démo interactive explicitement fictive, enregistrée uniquement dans le navigateur.

L’identité visuelle s’inspire principalement de Nuzz : fond sombre, vert doux, navigation latérale et fil social. DataFast inspire la lisibilité des indicateurs ; TrustMRR inspire le classement et la visibilité des preuves. L’interface, les illustrations CSS et l’identité Happen sont originales.

## Architecture

Next.js 16.3.4 App Router, React 19, TypeScript, PostgreSQL et Better Auth 1.7.14. Hébergement cible : Vercel ; source : `Kjoris27/must`.

L’application utilise ses propres comptes e-mail/mot de passe. Elle ne dépend plus de l’identité ChatGPT, de Cloudflare Workers ou de D1. Aucun secret ni compte réel n’est inclus dans le dépôt.

Les données partagées nécessitent une base PostgreSQL dédiée, ses tables et les variables serveur ci-dessous. Tant qu’elles ne sont pas configurées, la démo fonctionne ; l’API de l’espace partagé répond explicitement 503 et l’inscription n’est pas proposée comme disponible. La disponibilité de la configuration ne prouve pas, à elle seule, la connectivité à la base : le parcours doit être vérifié après provisionnement.

## Installation et publication

1. `npm ci` avec Node.js 24.
2. Importer ce dépôt dans l’équipe Vercel souhaitée, framework Next.js, racine du dépôt.
3. Connecter une base PostgreSQL dédiée via Vercel Marketplace. Préférer une URL avec pool de connexions ; ne pas réutiliser la base d’une autre application.
4. Configurer les variables serveur :
   - `DATABASE_URL` : URL privée de connexion PostgreSQL ; jamais envoyée au navigateur.
   - `BETTER_AUTH_SECRET` : secret aléatoire de 32 caractères minimum, conservé dans Vercel.
   - `BETTER_AUTH_URL` : origine HTTPS exacte de production. Pour les aperçus, ne pas définir cette variable : l’origine vient de la requête.
5. Vérifier la liaison du projet, puis récupérer les variables dans `.env.local` avec `vercel env pull .env.local`. Ce fichier est exclu de Git.
6. `npm run db:migrate` crée les tables de la version Better Auth installée, puis les tables applicatives dans cette base dédiée. Aucun compte ni exemple n’est inséré.
7. Déployer, puis vérifier inscription → création de room → invitation d’un second compte → progression → validation par un pair.

Les tables applicatives ont des contraintes, clés étrangères et index sur les accès par membre et par room. L’accès passe par l’API serveur, qui vérifie la session et l’appartenance. RLS est activé sans politique publique : la connexion privée doit utiliser le rôle propriétaire de la base. Les tables d’authentification sont protégées de la même façon au provisionnement. Le secret de session et la connexion SQL ne doivent jamais avoir le préfixe `NEXT_PUBLIC_`.

## Vérification

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Les tests créent des comptes Better Auth et des sessions signées dans un PostgreSQL embarqué éphémère (PGlite). Ils exécutent les véritables requêtes de l’API : connexion et déconnexion, rejet d’une fausse session, origine des requêtes, invitation, isolation entre rooms, progression individuelle, approbation par un pair, réactions, sessions idempotentes, échéances et planning. Un adaptateur de transport de test relie le pilote PostgreSQL à PGlite ; les décisions d’autorisation et les réponses ne sont pas simulées.

Les tests calendrier vérifient les heures, durées, échappements, pliage UTF-8 et alerte du fichier ICS. Le téléchargement et les notifications doivent aussi être vérifiés dans le calendrier utilisé par les membres.

## Limites de cette version

Les ressources sont ajoutées par lien et leurs étapes sont saisies manuellement. Pas encore d’import YouTube automatique, de visioconférence, de présence en direct ni d’envoi d’e-mails/Discord. Les données partagées sont actualisées toutes les 45 secondes quand la page est visible. Les rappels dans l’application exigent de la laisser ouverte ; les rappels calendrier exigent d’importer le fichier ICS et d’autoriser les notifications du calendrier.

L’authentification initiale n’inclut pas encore de vérification d’adresse ou de récupération de mot de passe par e-mail. Ces fonctions nécessitent un service d’envoi. La limitation des tentatives de connexion est stockée en base et partagée entre les instances Vercel.
