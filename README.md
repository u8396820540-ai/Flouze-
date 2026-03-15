# 💸 Flouze — Application de gestion de budget personnel

Une application SaaS moderne, minimaliste et intuitive pour gérer vos revenus, charges, épargne et dépenses.

---

## 🚀 Démarrage rapide

### Prérequis
- **Node.js** v18+ — [nodejs.org](https://nodejs.org)
- **npm** v9+

---

## ⚙️ Installation

### 1. Cloner / dézipper le projet

```bash
cd budget-app
```

### 2. Installer et démarrer le Backend

```bash
cd backend
npm install
npm start
# ✅ API démarrée sur http://localhost:3001
```

> La base de données SQLite (`budget.db`) est créée automatiquement au premier lancement dans le dossier `backend/`.

### 3. Installer et démarrer le Frontend

Dans un nouveau terminal :

```bash
cd frontend
npm install
npm run dev
# ✅ Application disponible sur http://localhost:5173
```

### 4. Ouvrir l'application

👉 Rendez-vous sur **http://localhost:5173**

---

## 🏗️ Architecture du projet

```
budget-app/
├── backend/                    # API REST Node.js + Express
│   ├── server.js               # Point d'entrée du serveur
│   ├── db/
│   │   └── database.js         # Initialisation SQLite
│   ├── middleware/
│   │   └── auth.js             # Vérification JWT
│   └── routes/
│       ├── auth.js             # Inscription / Connexion
│       ├── income.js           # Revenus
│       ├── fixed.js            # Charges fixes
│       ├── savings.js          # Épargne
│       ├── variable.js         # Dépenses variables
│       └── categories.js       # Catégories personnalisées
│
└── frontend/                   # Application React + Tailwind
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx             # Composant principal + layout
        ├── main.jsx
        ├── index.css           # Styles globaux + thème CSS
        ├── context/
        │   └── AuthContext.jsx # Gestion de l'authentification
        ├── services/
        │   └── api.js          # Appels API avec Axios
        └── components/
            ├── Auth/
            │   └── AuthPage.jsx
            ├── Dashboard/
            │   └── Summary.jsx  # Graphiques + résumé
            ├── Sections/
            │   ├── IncomeSection.jsx
            │   ├── FixedSection.jsx
            │   ├── SavingsSection.jsx
            │   └── VariableSection.jsx
            └── UI/
                └── index.jsx    # Composants réutilisables
```

---

## 🗄️ Base de données (SQLite)

Tables créées automatiquement :

| Table | Description |
|-------|-------------|
| `users` | Comptes utilisateurs |
| `categories` | Catégories (défaut + personnalisées) |
| `income` | Revenus |
| `fixed_expenses` | Charges fixes |
| `savings` | Objectifs d'épargne |
| `variable_expenses` | Dépenses variables |

---

## 🔌 API REST

### Auth
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/register` | Créer un compte |
| POST | `/api/auth/login` | Se connecter |
| GET | `/api/auth/me` | Profil utilisateur |
| PUT | `/api/auth/preferences` | Préférences (mode sombre, période) |

### Toutes les routes ci-dessous nécessitent `Authorization: Bearer <token>`

### Revenus
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/income?month=YYYY-MM` | Liste + total |
| POST | `/api/income` | Créer |
| PUT | `/api/income/:id` | Modifier |
| DELETE | `/api/income/:id` | Supprimer |

### Charges fixes
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/fixed?month=YYYY-MM` | Liste + total |
| POST | `/api/fixed` | Créer |
| PUT | `/api/fixed/:id` | Modifier |
| DELETE | `/api/fixed/:id` | Supprimer |

### Épargne
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/savings?month=YYYY-MM` | Liste + total mensuel |
| POST | `/api/savings` | Créer |
| PUT | `/api/savings/:id` | Modifier |
| DELETE | `/api/savings/:id` | Supprimer |

### Dépenses variables
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/variable?month=YYYY-MM` | Liste + total + par catégorie |
| POST | `/api/variable` | Créer |
| PUT | `/api/variable/:id` | Modifier |
| DELETE | `/api/variable/:id` | Supprimer |
| GET | `/api/variable/history` | Historique 12 derniers mois |

---

## ✨ Fonctionnalités

### 💰 Gestion budgétaire
- **4 sections** : Revenus · Charges fixes · Épargne · Dépenses variables
- **Calcul automatique** : Argent disponible en temps réel
- **Budget intelligent** : Calculé par semaine / 2 semaines / mois
- **Alertes visuelles** : Avertissement dès 80% du budget, danger à 100%

### 📊 Visualisations
- **Graphique camembert** : Répartition des dépenses par catégorie
- **Graphique barres** : Historique mensuel des dépenses
- **Barres de progression** : Avancement des objectifs d'épargne
- **Codes couleur** : 🟢 Positif · 🟠 Attention · 🔴 Dépassement

### 🎨 Interface
- **Mode sombre/clair** avec mémorisation
- **Navigation mensuelle** pour consulter l'historique
- **Filtres par catégorie** sur les dépenses variables
- **Vue cartes ou tableau** pour l'épargne
- **Export CSV** du mois en cours

### 🔒 Sécurité
- Authentification JWT (30 jours)
- Mot de passe hashé avec bcrypt
- Données privées par utilisateur

---

## 🔧 Variables d'environnement

Le backend accepte ces variables (optionnelles) :

```env
PORT=3001               # Port du serveur (défaut: 3001)
JWT_SECRET=your_secret  # Clé secrète JWT (défaut: valeur hardcodée)
```

---

## 🚀 Déploiement en production

### Backend
```bash
# Définir les variables d'environnement
export JWT_SECRET="votre_secret_très_long_et_aléatoire"
export PORT=3001
node server.js
```

### Frontend
```bash
npm run build
# Servir le dossier dist/ avec Nginx, Caddy, ou n'importe quel serveur statique
```

Mettre à jour `vite.config.js` avec l'URL de l'API en production :
```js
server: {
  proxy: {
    '/api': { target: 'https://votre-api.com' }
  }
}
```

---

## 🛠️ Évolutions possibles

- 📧 Notifications email de résumé mensuel
- 📱 Application mobile (React Native)
- 🔄 Import de relevés bancaires (OFX/CSV)
- 🏦 Connexion open banking (Budget Insight, Nordigen)
- 👥 Gestion multi-budgets (personnel + professionnel)
- 🌍 Multi-devises
- 📊 Rapports annuels PDF

---

## 📄 Licence

MIT — Libre d'utilisation et de modification.
