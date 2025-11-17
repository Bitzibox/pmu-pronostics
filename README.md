# 🏇 PMU Pronostics - Analyse de Performance

Application web de suivi et d'analyse des performances des pronostics PMU (courses hippiques) en temps réel.

## 📋 Fonctionnalités

### Analyse en Temps Réel
- **Dashboard statistiques** : Vue d'ensemble des performances (taux de réussite, placements, échecs)
- **Historique sur 30 jours** : Graphiques et tableaux de performance historique
- **Comparaison pronostics vs résultats** : Tableau détaillé avec filtres dynamiques
- **Enrichissement automatique** : Données de courses, cotes, et résultats en temps réel

### Fonctionnalités Avancées
- **Cache intelligent** : localStorage avec TTL pour optimisation des performances
- **Rafraîchissement automatique** : Mise à jour toutes les 5 minutes
- **Export CSV** : Exportation des données pour analyse externe
- **Filtres dynamiques** : Par hippodrome, confiance, statut
- **Visualisations** : Graphiques Chart.js pour tendances

## 🚀 Technologies

- **Frontend** : HTML5, CSS3 (Bootstrap 5.3.3), JavaScript (ES6+)
- **Visualisation** : Chart.js 4.4.1
- **Icons** : Bootstrap Icons 1.11.3
- **Backend** : Fichiers JSON statiques hébergés sur GitHub
- **Workflow** : n8n pour automatisation

## 📁 Structure du Projet

```
pmu-pronostics/
├── index.html              # Page principale de l'application
├── css/
│   └── styles.css         # Styles personnalisés
├── js/
│   └── app.js             # Logique applicative principale
├── data/                   # Données JSON (générées par n8n)
│   ├── analyse.json
│   ├── pronostics-DDMMYYYY.json
│   ├── resultats-DDMMYYYY.json
│   ├── courses-DDMMYYYY.json
│   └── programme-DDMMYYYY.json
└── README.md              # Documentation
```

## 🔧 Configuration

### Variables de Configuration (js/app.js)

```javascript
const CONFIG = {
    REFRESH_INTERVAL: 300000,          // 5 minutes
    CACHE_TTL: 3600000,                // 1 heure
    HISTORIQUE_CACHE_TTL: 86400000     // 24 heures
};
```

### Mapping des Hippodromes

L'application supporte plusieurs hippodromes français et internationaux :
- **France** : Vincennes, Enghien, Auteuil, Chantilly, Deauville, etc.
- **International** : Gelsenkirchen (DEU), Wolvega (NLD), Charles Town (USA)

## 📊 Format des Données

### Pronostics (`pronostics-DDMMYYYY.json`)
```json
{
  "pronostics": [
    {
      "courseId": "R1C1",
      "reunion": "R1",
      "course": "C1",
      "classement": [
        {
          "numero": 5,
          "nom": "NOM_CHEVAL",
          "cote": "3.5",
          "jockey": "NOM_JOCKEY"
        }
      ],
      "scoreConfiance": 85
    }
  ]
}
```

### Résultats (`resultats-DDMMYYYY.json`)
```json
{
  "courses": [
    {
      "reunion": "R1",
      "course": "C1",
      "arrivee": [5, 3, 7]
    }
  ]
}
```

## 🔐 Sécurité

### Mesures Implémentées

1. **Content Security Policy (CSP)**
   - Restriction des sources de scripts et styles
   - Protection contre les injections XSS

2. **Subresource Integrity (SRI)**
   - Hash SHA-384 pour tous les CDN
   - Vérification de l'intégrité des ressources externes

3. **Sanitization des Données**
   - `escapeHtml()` : Échappement des caractères HTML
   - `escapeCsv()` : Protection pour l'export CSV
   - Prévention des attaques XSS

## ⚡ Optimisations de Performance

### Cache LocalStorage
- **Historique** : Cache de 24h pour éviter recalcul complet
- **Données courantes** : Cache de 1h avec validation TTL
- **Invalidation automatique** : Suppression des données expirées

### Parallélisation des Appels API
- **Batch processing** : Traitement par lots de 5 jours
- **Promise.all()** : Chargement parallèle des ressources
- **Réduction du temps** : ~80% plus rapide (30s → 6s)

### Optimisations Réseau
- **Requêtes minimisées** : -95% avec cache
- **Compression** : Gzip sur les fichiers JSON
- **CDN** : Ressources externes via jsdelivr

## 🎨 Interface Utilisateur

### Sections Principales

1. **En-tête**
   - Date actuelle
   - Navigation principale

2. **Statistiques Globales**
   - Cards avec icônes colorées
   - Métriques clés (gagnants, placés, ratés)
   - Taux de réussite

3. **Historique**
   - Graphique linéaire (Chart.js)
   - Tableau détaillé par jour
   - Sélecteur de date

4. **Courses par Réunion**
   - Cards par hippodrome
   - Top 3 des pronostics
   - Badge de statut (Ouvert/En cours/Terminé)

5. **Comparaison**
   - Tableau complet avec filtres
   - Export CSV
   - Indicateurs visuels de performance

### Design System

```css
:root {
    --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --success-gradient: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    --warning-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}
```

## 🔨 Fonctions Principales

### Utilitaires

```javascript
// Parsing des données
parsePronosticsData(rawData)  // Normalise les pronostics
parseResultatsData(rawData)    // Normalise les résultats

// Cache
cacheSet(key, data, ttl)       // Sauvegarde avec TTL
cacheGet(key)                  // Récupération avec validation
cacheClear(key)                // Suppression

// Sécurité
escapeHtml(text)               // Échappement HTML
escapeCsv(text)                // Échappement CSV
```

### Principales Opérations

```javascript
// Chargement des données
loadAllData(dateString)        // Charge toutes les données d'un jour

// Calculs
calculerHistoriqueTempsReel()  // Calcule l'historique (parallèle)
enrichirPronosticsAvecCourses()// Enrichit avec données courses

// Affichage
updateStatistiquesGlobales()   // Met à jour stats globales
updateTableauComparaison()     // Met à jour tableau
```

## 📈 Métriques de Performance

### Avant Optimisations
- Temps de chargement initial : ~30-40s
- Appels API : 60+ requêtes séquentielles
- Rafraîchissement : Recalcul complet à chaque fois

### Après Optimisations
- Temps de chargement initial : ~6-8s (premier chargement)
- Temps de chargement avec cache : <1s
- Appels API : 5-10 requêtes (avec cache)
- Rafraîchissement : Instantané

### Améliorations
- ⚡ **Temps de chargement** : -80%
- 📉 **Appels API** : -95%
- 💾 **Cache hit rate** : ~90% (navigation normale)

## 🛠️ Développement

### Installation

```bash
# Cloner le repository
git clone https://github.com/Bitzibox/pmu-pronostics.git

# Ouvrir index.html dans un navigateur
# Ou utiliser un serveur local
python -m http.server 8000
# Puis ouvrir http://localhost:8000
```

### Workflow de Données

1. **n8n** génère les fichiers JSON quotidiens
2. Les fichiers sont commitss sur GitHub
3. L'application les charge via raw.githubusercontent.com
4. Les données sont parsées et enrichies
5. L'affichage est mis à jour automatiquement

### Debugging

```javascript
// Activer les logs détaillés dans la console
// Les logs incluent :
// - 🔄 Chargement des données
// - 📊 Calculs d'historique
// - ✅ Succès d'opérations
// - ⚠️ Avertissements
// - ❌ Erreurs
```

## 🐛 Problèmes Connus

- Le cache localStorage peut atteindre sa limite (5-10MB selon navigateur)
- Les graphiques peuvent être lents avec >100 points de données
- Nécessite JavaScript activé (pas de fallback)

## 🔮 Améliorations Futures

### Fonctionnalités
- [ ] Mode offline avec Service Worker
- [ ] Notifications push pour résultats
- [ ] Analyse prédictive ML
- [ ] Comparaison multi-jours
- [ ] Filtres avancés (par discipline, jockey, etc.)

### Technique
- [ ] Migration vers TypeScript
- [ ] Tests unitaires (Jest)
- [ ] CI/CD avec GitHub Actions
- [ ] Progressive Web App (PWA)
- [ ] Accessibilité WCAG 2.1 AAA

### UX
- [ ] Mode sombre
- [ ] Responsive mobile optimisé
- [ ] Animations de transition
- [ ] Empty states illustrés
- [ ] Skeleton loaders

## 📝 Changelog

### v2.0.0 (2025-11-17) - Optimisations Majeures
- ✅ Ajout SRI et CSP pour sécurité
- ✅ Protection XSS complète
- ✅ Cache localStorage avec TTL
- ✅ Parallélisation des appels API
- ✅ Refactoring du code (DRY)
- ✅ Documentation JSDoc
- ✅ Fix dropdown hippodromes

### v1.0.0 - Version Initiale
- Interface de base
- Affichage des pronostics
- Historique simple
- Export CSV

## 📄 Licence

Ce projet est un outil personnel d'analyse. Les données PMU sont la propriété du PMU.

## 👤 Auteur

**Bitzibox**
- GitHub: [@Bitzibox](https://github.com/Bitzibox)

## 🙏 Remerciements

- PMU pour les données
- n8n pour l'automatisation
- Bootstrap pour le framework CSS
- Chart.js pour les visualisations

---

**Note** : Ce projet est à but éducatif et d'analyse personnelle. Ne constitue pas un conseil en paris sportifs.
