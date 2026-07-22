# Moujtahid Mobile

Application mobile React Native (Expo) de Moujtahid - le pendant mobile de l'application web Angular du dépôt parent.

## Deux espaces

- **Espace Directeur** (admin) : tableau de bord, étudiants (recherche, filtres, fiche détaillée), calendrier hebdomadaire, finances (encaissements, impayés), groupes & cours, professeurs, analytiques (revenus, présence, risque d'abandon).
- **Espace Parents** : accueil (moyenne, présence, prochains cours), cours & emploi du temps, historique de présence, notes par matière, paiements.

## Lancer l'application

```bash
cd mobile
npm install        # si ce n'est pas déjà fait
npx expo start
```

Puis scanner le QR code avec l'application **Expo Go** (Android/iOS), ou appuyer sur `a` (émulateur Android) / `w` (web).

## Mode démo et connexion au backend

L'app démarre en **mode démo** (aucun serveur requis) :

- **Directeur** : n'importe quel e-mail valide + mot de passe ≥ 4 caractères.
- **Parents** : code élève `ETU-001` + n'importe quel numéro de téléphone.

Pour brancher le vrai backend (le même que l'app web, `/api/v1/*`) :

1. Ouvrir `src/api/client.ts`
2. Passer `DEMO_MODE` à `false`
3. Renseigner `API_URL` avec l'adresse IP locale de votre machine (pas `localhost` - un appareil physique ne peut pas y accéder), ex : `http://192.168.1.10:8000/api`

## Structure

```
src/
  theme.ts             Design tokens (couleurs/espacements - mêmes valeurs que le web)
  types.ts             Modèles (miroir de src/app/models de l'app Angular)
  api/client.ts        Client API (Bearer token, AsyncStorage) + mode démo
  data/demo.ts         Données de démonstration
  data/selectors.ts    Agrégations (finances, risque, présence…)
  context/AuthContext  Session (admin / parent)
  components/ui.tsx    UI partagée (Card, StatCard, Badge, Button, Field…)
  navigation/          Stacks + onglets (admin : 5 onglets, parents : 5 onglets)
  screens/             auth/ · admin/ · parent/
```
