\# Système de Pronostics PMU - Analyse Temps Réel



Ce projet fournit un système automatisé pour générer des pronostics de courses hippiques PMU, les afficher sur une page web temps réel et suivre leur performance.



\## Prérequis



1\.  \*\*Instance n8n\*\* : Installée localement (via Docker) ou sur le cloud.

2\.  \*\*Compte GitHub\*\* : Pour héberger la page web (GitHub Pages) et les fichiers de données.

3\.  \*\*Clé API Gemini\*\* : Obtenue depuis Google AI Studio.

4\.  \*\*Node.js et Git\*\* : Installés sur la machine où n8n exécute les commandes `git`.



\## Guide de Déploiement



\### Étape 1 : Configuration du Repository GitHub



1\.  Clonez ce repository sur la machine où votre n8n est installé.

2\.  Dans les paramètres de votre repository GitHub, allez dans la section "Pages".

3\.  Choisissez la branche `main` (ou `master`) et le dossier `/ (root)` comme source. Activez GitHub Pages.



\### Étape 2 : Configuration de n8n



1\.  Ouvrez votre interface n8n.

2\.  Allez dans "Credentials" et ajoutez votre clé API Gemini. Nommez-la `GeminiApi` pour qu'elle corresponde aux workflows.

3\.  Importez les 2 workflows fournis (`workflow1.json`, `workflow2.json`).

4\.  Ouvrez le \*\*Workflow 2\*\* et modifiez le noeud "Execute Command". Remplacez `/path/to/your/repo` par le chemin absolu vers le dossier du repository cloné sur votre machine.

5\.  Activez les deux workflows.



\### Étape 3 : Lancement



1\.  Le Workflow 1 s'exécutera automatiquement toutes les 15 minutes. Vous pouvez le lancer manuellement une première fois.

2\.  Une fois le fichier `courses-{date}.json` créé, lancez manuellement le Workflow 2 pour générer les premiers pronostics.

3\.  Le workflow poussera les fichiers JSON vers GitHub.

4\.  Accédez à votre URL GitHub Pages (ex: `https://votre-nom.github.io/pmu-pronostics/`) pour voir le résultat.



Le système est maintenant opérationnel. n8n mettra à jour les données et les pronostics automatiquement, et la page web se rafraîchira pour afficher les dernières informations.

