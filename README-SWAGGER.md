# REST API Documentation avec Swagger

Cette API REST complète pour la gestion d'un système e-commerce est maintenant entièrement documentée avec Swagger/OpenAPI 3.0.

## 🚀 Accès à la documentation

### Documentation interactive
Une fois le serveur démarré, accédez à la documentation interactive à :
```
http://localhost:5000/api-docs
```

### Formats de documentation disponibles
- **Interface interactive** : `http://localhost:5000/api-docs`
- **JSON OpenAPI** : `http://localhost:5000/api-docs/json`
- **YAML OpenAPI** : `http://localhost:5000/api-docs/yaml`

## 📦 Installation des dépendances Swagger

Les nouvelles dépendances ont été ajoutées au package.json :
```bash
npm install swagger-ui-express yamljs
```

## 🔧 Configuration

### 1. Structure des fichiers
```
restapi/
├── swagger.yaml          # Spécification OpenAPI 3.0 complète
├── docs.js              # Configuration Swagger UI
├── server.js            # Serveur principal (modifié)
└── package.json         # Dépendances mises à jour
```

### 2. Démarrage du serveur
```bash
# Développement
npm run dev

# Production
npm start
```

## 📚 Documentation complète

### Points d'accès (Endpoints) documentés

#### 🔐 Authentification (`/api/auth`)
- `POST /api/auth/login` - Connexion administrateur
- `POST /api/auth/logout` - Déconnexion
- `POST /api/auth/refresh-token` - Rafraîchissement du token
- `GET /api/auth/verify` - Vérification d'authentification
- `GET /api/auth/profile` - Récupération du profil
- `POST /api/auth/update-profile` - Mise à jour du profil
- `GET /api/auth/admins` - Liste des administrateurs
- `POST /api/auth/admins` - Création d'administrateur
- `PUT /api/auth/admins/{id}` - Mise à jour d'administrateur
- `DELETE /api/auth/admins/{id}` - Suppression d'administrateur

#### 🛍️ Produits (`/api/products`)
- `GET /api/products/test` - Test de connexion
- `GET /api/products/promotions` - Produits en promotion
- `GET /api/products/search` - Recherche de produits
- `GET /api/products` - Liste des produits (public)
- `GET /api/products/admin` - Liste des produits (admin)
- `POST /api/products` - Création de produit
- `GET /api/products/{id}` - Récupération d'un produit
- `PUT /api/products/{id}` - Mise à jour de produit
- `DELETE /api/products/{id}` - Suppression de produit
- `POST /api/products/{id}/check-availability` - Vérification de disponibilité
- `GET /api/products/export` - Export Excel/CSV
- `POST /api/products/{id}/variations` - Ajout de variation
- `PUT /api/products/{id}/variations/{variationId}` - Mise à jour de variation
- `DELETE /api/products/{id}/variations/{variationId}` - Suppression de variation
- `PATCH /api/products/{id}/stock` - Mise à jour du stock

#### 📂 Catégories (`/api/categories`)
- `GET /api/categories` - Liste des catégories
- `POST /api/categories` - Création de catégorie
- `GET /api/categories/{id}` - Récupération d'une catégorie
- `PUT /api/categories/{id}` - Mise à jour de catégorie
- `DELETE /api/categories/{id}` - Suppression de catégorie

#### 📂 Sous-catégories (`/api/subcategories`)
- `GET /api/subcategories` - Liste des sous-catégories
- `POST /api/subcategories` - Création de sous-catégorie
- `GET /api/subcategories/{id}` - Récupération d'une sous-catégorie
- `PUT /api/subcategories/{id}` - Mise à jour de sous-catégorie
- `DELETE /api/subcategories/{id}` - Suppression de sous-catégorie

#### 🏢 Entreprises (`/api/companies`)
- `GET /api/companies` - Liste des entreprises
- `POST /api/companies` - Création d'entreprise
- `GET /api/companies/{id}` - Récupération d'une entreprise
- `PUT /api/companies/{id}` - Mise à jour d'entreprise
- `DELETE /api/companies/{id}` - Suppression d'entreprise

#### 📦 Commandes (`/api/orders`)
- `GET /api/orders` - Liste des commandes
- `POST /api/orders` - Création de commande
- `GET /api/orders/{id}` - Récupération d'une commande
- `PUT /api/orders/{id}` - Mise à jour de commande
- `DELETE /api/orders/{id}` - Suppression de commande
- `PATCH /api/orders/{id}/status` - Mise à jour du statut
- `GET /api/orders/export` - Export Excel/CSV

#### 📊 Statistiques (`/api/stats`)
- `GET /api/stats/dashboard` - Statistiques du tableau de bord
- `GET /api/stats/products` - Statistiques des produits
- `GET /api/stats/orders` - Statistiques des commandes

#### 🏠 Page d'accueil (`/api/home`)
- `GET /api/home/data` - Données de la page d'accueil

#### 🔔 Notifications (`/api/notifications`)
- `GET /api/notifications` - Liste des notifications
- `POST /api/notifications` - Création de notification
- `GET /api/notifications/unread-count` - Nombre de notifications non lues
- `PATCH /api/notifications/{id}/read` - Marquer comme lue
- `PATCH /api/notifications/mark-all-read` - Marquer toutes comme lues
- `DELETE /api/notifications/{id}` - Suppression de notification

#### 📁 Uploads (`/api/uploads`)
- `GET /api/uploads/{filename}` - Récupération de fichier
- `POST /api/uploads/upload` - Upload de fichiers

#### 🔍 Recherche avancée
- `GET /api/search/global` - Recherche globale

#### ⚙️ Système
- `GET /api/health` - État de santé du système
- `POST /api/cache/clear` - Vider le cache
- `POST /api/backup/create` - Créer une sauvegarde

## 🔑 Authentification dans Swagger

### 1. Obtenir un token JWT
1. Utilisez l'endpoint `POST /api/auth/login` avec vos identifiants
2. Copiez le token retourné dans la réponse

### 2. Configurer l'authentification
1. Cliquez sur le bouton **"Authorize"** en haut à droite
2. Entrez `Bearer <votre-token>` dans le champ
3. Cliquez sur **"Authorize"**

### 3. Tester les endpoints protégés
Une fois authentifié, vous pouvez tester tous les endpoints qui nécessitent une authentification.

## 🏗️ Schémas de données

### Modèles principaux documentés :
- **Admin** : Gestion des administrateurs avec rôles et permissions
- **Product** : Produits simples et variables avec variations
- **Category** : Catégories de produits
- **Subcategory** : Sous-catégories
- **Company** : Entreprises partenaires
- **Order** : Commandes avec gestion d'état
- **Notification** : Système de notifications
- **ProductVariation** : Variations de produits (couleur, taille, etc.)

### Système de permissions
- **superAdmin** : Accès complet à toutes les fonctionnalités
- **productManager** : Gestion complète des produits
- **orderManager** : Gestion des commandes
- **contentEditor** : Édition de contenu et catégories

## 🎯 Fonctionnalités avancées documentées

### Gestion des produits variables
- Support des attributs multiples (couleur, taille)
- Gestion du stock par variation
- Prix spécifiques par variation
- Images dédiées par variation

### Gestion des commandes
- Processus de commande complet
- Suivi des statuts avec historique
- Gestion des stocks automatique
- Export des commandes

### Upload et optimisation d'images
- Upload vers Cloudinary
- Optimisation automatique
- Redimensionnement à la volée
- Support de plusieurs formats

### Statistiques et rapports
- Tableau de bord avec métriques clés
- Statistiques détaillées par période
- Export Excel/CSV
- Rapports de performance

## 🚨 Codes de réponse standardisés

- **200** : Succès
- **201** : Créé avec succès
- **400** : Erreur de validation
- **401** : Non authentifié
- **403** : Permissions insuffisantes
- **404** : Ressource non trouvée
- **500** : Erreur serveur

## 📝 Exemples d'utilisation

### Connexion et authentification
```bash
# Connexion
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# Utilisation du token
curl -X GET http://localhost:5000/api/products/admin \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Création d'un produit simple
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "T-shirt Premium",
    "description": "T-shirt de haute qualité",
    "productType": "simple",
    "quantite": 100,
    "Company_id": "507f1f77bcf86cd799439011",
    "oldPrice": 39.99
  }'
```

### Création d'une commande
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "firstName": "Ahmed",
      "lastName": "Essyad",
      "phone": "+222 12 34 56 78"
    },
    "shippingAddress": {
      "address": "123 Rue de la Paix",
      "city": "Nouakchott",
      "postalCode": "18020"
    },
    "items": [
      {
        "product": "507f1f77bcf86cd799439014",
        "quantity": 2
      }
    ]
  }'
```

## 🔧 Configuration avancée

### Variables d'environnement documentées
```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
PORT=5000
```

### Personnalisation de Swagger UI
Le fichier `docs.js` peut être modifié pour :
- Changer le thème et les couleurs
- Ajouter des CSS personnalisées
- Configurer les options d'affichage
- Modifier le titre et la description

## 📖 Utilisation de la documentation

### Navigation
- **Tags** : Les endpoints sont organisés par fonctionnalité
- **Filtrage** : Utilisez la barre de recherche pour filtrer
- **Expansion** : Cliquez sur les sections pour voir les détails
- **Try it out** : Testez directement les endpoints

### Test des endpoints
1. Sélectionnez un endpoint
2. Cliquez sur **"Try it out"**
3. Remplissez les paramètres requis
4. Cliquez sur **"Execute"**
5. Consultez la réponse

## 🔄 Mise à jour de la documentation

Pour mettre à jour la documentation :
1. Modifiez le fichier `swagger.yaml`
2. Redémarrez le serveur
3. La documentation sera automatiquement mise à jour

## 🎉 Avantages de cette documentation

- **Complète** : Tous les endpoints sont documentés
- **Interactive** : Tests en temps réel
- **Standardisée** : Format OpenAPI 3.0
- **Accessible** : Interface web intuitive
- **Maintenable** : Facilement mise à jour
- **Professionnelle** : Présentation claire et organisée

La documentation Swagger est maintenant prête et accessible. Elle fournit une interface complète pour explorer, comprendre et tester votre API REST.
