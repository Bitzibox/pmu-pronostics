// Configuration GitHub
const GITHUB_USERNAME = 'Bitzibox';
const REPO_NAME = 'pmu-pronostics';
const BRANCH = 'main';
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH}/data/`;
const CONFIG = {
    REFRESH_INTERVAL: 300000, // 5 minutes
    DATE_FORMAT: 'DD/MM/YYYY'
};

// --- MODIFICATION 1 ---
// Mapping des hippodromes PAR PAYS et numéro de réunion
const HIPPODROMES_PAR_PAYS = {
    'FRA': {
        1: { nom: 'Vincennes', ville: 'Paris' },
        2: { nom: 'Enghien', ville: 'Enghien' },
        3: { nom: 'Auteuil', ville: 'Paris' },
        4: { nom: 'Chantilly', ville: 'Chantilly' },
        5: { nom: 'Deauville', ville: 'Deauville' },
        6: { nom: 'Lyon-Parilly', ville: 'Lyon' },
        7: { nom: 'Marseille-Borély', ville: 'Marseille' },
        8: { nom: 'Cagnes-sur-Mer', ville: 'Cagnes-sur-Mer' }
    },
    'DEU': {
        2: { nom: 'Gelsenkirchen', ville: 'Gelsenkirchen' }
    },
    'NLD': {
        5: { nom: 'Wolvega', ville: 'Wolvega' }
    },
    'USA': {
        6: { nom: 'Charles Town', ville: 'Charles Town' }
    }
};

// Gardez aussi l'ancien HIPPODROMES comme fallback
const HIPPODROMES = {
    'R1': { nom: 'Vincennes', ville: 'Paris', discipline: 'trot' },
    'R2': { nom: 'Enghien', ville: 'Enghien', discipline: 'trot' },
    'R3': { nom: 'Auteuil', ville: 'Paris', discipline: 'obstacle' },
    'R4': { nom: 'Chantilly', ville: 'Chantilly', discipline: 'plat' },
    'R5': { nom: 'Deauville', ville: 'Deauville', discipline: 'plat' },
    'R6': { nom: 'Lyon-Parilly', ville: 'Lyon', discipline: 'trot' },
    'R7': { nom: 'Marseille-Borély', ville: 'Marseille', discipline: 'plat' },
    'R8': { nom: 'Cagnes-sur-Mer', ville: 'Cagnes-sur-Mer', discipline: 'plat' }
};
// --- FIN MODIFICATION 1 ---

// --- MODIFICATION 2 ---
const DISCIPLINES = {
    'ATTELE': { label: 'Trot Attelé', icon: '🏇', color: '#2196F3', type: 'trot' },
    'MONTE': { label: 'Trot Monté', icon: '🐎', color: '#1976D2', type: 'trot' },
    'PLAT': { label: 'Plat', icon: '🏃', color: '#9C27B0', type: 'plat' },
    'HAIE': { label: 'Haies', icon: '🏆', color: '#FF9800', type: 'obstacle' },
    'STEEPLECHASE': { label: 'Steeple-Chase', icon: '🎯', color: '#F57C00', type: 'obstacle' },
    'CROSS': { label: 'Cross-Country', icon: '🌲', color: '#4CAF50', type: 'obstacle' },
    'TROT': { label: 'Trot', icon: '🏇', color: '#2196F3', type: 'trot' },
    'OBSTACLE': { label: 'Obstacle', icon: '🏆', color: '#FF9800', type: 'obstacle' }
};
// --- FIN MODIFICATION 2 ---

// Variables globales
let performanceChart = null;
// --- MODIFICATION 3 ---
let allData = {
    analyse: null,
    pronostics: null,
    resultats: null,
    courses: null,
    programme: null  // ← AJOUT
};
// --- FIN MODIFICATION 3 ---

// NOUVEAU: Variable pour suivre la date affichée
let currentDateString = '';

// Fonction principale de chargement
// MODIFICATION: Accepte maintenant une date en paramètre
async function loadAllData(dateStringDDMMYYYY) {
    console.log(`🔄 Chargement des données depuis GitHub pour le ${dateStringDDMMYYYY}...`);
    showLoadingState(true); // Afficher les spinners
    
    currentDateString = dateStringDDMMYYYY; // Mémoriser la date en cours
    
    // const dateString = getDateString(); // Format: DDMMYYYY -> ANCIEN
    const dateString = dateStringDDMMYYYY; // NOUVEAU
    console.log('📅 Date du jour:', dateString);
    
    // Ajouter un timestamp pour éviter le cache
    const timestamp = new Date().getTime();
    
    try {
        // --- MODIFICATION 4 ---
        // Charger tous les fichiers en parallèle avec la date du jour
        // C'EST CETTE LIGNE QUI CORRIGE L'ERREUR : 'programmeRes' est ajouté à la liste
        const [analyseRes, pronosticsRes, resultatsRes, coursesRes, programmeRes] = await Promise.all([
            fetch(GITHUB_RAW_BASE + 'analyse.json?t=' + timestamp).catch(e => null),
            fetch(GITHUB_RAW_BASE + 'pronostics-' + dateString + '.json?t=' + timestamp).catch(e => null),
            fetch(GITHUB_RAW_BASE + 'resultats-' + dateString + '.json?t=' + timestamp).catch(e => null),
            fetch(GITHUB_RAW_BASE + 'courses-' + dateString + '.json?t=' + timestamp).catch(e => null),
            fetch(GITHUB_RAW_BASE + 'programme-' + dateString + '.json?t=' + timestamp).catch(e => null)  // ← AJOUTER
        ]);

        console.log('📡 URLs chargées:');
        console.log('  - analyse.json');
        console.log('  - pronostics-' + dateString + '.json');
        console.log('  - resultats-' + dateString + '.json');
        console.log('  - courses-' + dateString + '.json');
        console.log('  - programme-' + dateString + '.json');  // ← AJOUTER
        // --- FIN MODIFICATION 4 ---

        // Parser les réponses
        if (analyseRes && analyseRes.ok) {
            const rawAnalyse = await analyseRes.json();
            // Gérer les différents formats possibles
            if (Array.isArray(rawAnalyse)) {
                // Si c'est un tableau, prendre le premier élément
                if (rawAnalyse[0] && rawAnalyse[0].historique) {
                    allData.analyse = rawAnalyse[0];
                    allData.analyse.historique.reverse(); // <-- AJOUTER CETTE LIGNE
                    console.log('✅ Analyse chargée (depuis tableau):', allData.analyse.historique?.length || 0, 'jours');
                } else {
                    // Tableau d'objets historique direct
                    allData.analyse = { historique: rawAnalyse.reverse(), stats_globales: {} }; // <-- MODIFIER CETTE LIGNE (ajouter .reverse())
                    console.log('✅ Analyse chargée (tableau direct):', rawAnalyse.length, 'jours');
                }
            } else if (rawAnalyse.historique) {
                // Structure correcte avec historique
                allData.analyse = rawAnalyse;
                allData.analyse.historique.reverse(); // <-- AJOUTER CETTE LIGNE
                console.log('✅ Analyse chargée:', allData.analyse.historique?.length || 0, 'jours');
            } else {
                // Structure inconnue, créer une structure vide
                allData.analyse = { historique: [], stats_globales: {} };
                console.warn('⚠️ Structure analyse.json inconnue');
            }
            
            // NOUVEAU: Mettre à jour le sélecteur de date une fois que l'analyse est chargée
            populateDateSelector();

        } else {
            console.warn('⚠️ analyse.json non disponible');
            allData.analyse = { historique: [], stats_globales: {} };
        }
        
        if (pronosticsRes && pronosticsRes.ok) {
            const rawPronostics = await pronosticsRes.json();
            // Gérer les multiples niveaux d'imbrication
            if (Array.isArray(rawPronostics)) {
                // Format: [{pronostics: [{pronostics: [...]}]}]
                if (rawPronostics[0] && rawPronostics[0].pronostics) {
                    // Vérifier s'il y a un 3ème niveau
                    if (Array.isArray(rawPronostics[0].pronostics) && 
                        rawPronostics[0].pronostics[0] && 
                        rawPronostics[0].pronostics[0].pronostics) {
                        // Triple imbrication : prendre le niveau le plus profond
                        allData.pronostics = { pronostics: rawPronostics[0].pronostics[0].pronostics };
                    } else {
                        // Double imbrication
                        allData.pronostics = { pronostics: rawPronostics[0].pronostics };
                    }
                } else {
                    // Simple tableau
                    allData.pronostics = { pronostics: rawPronostics };
                }
            } else if (rawPronostics.pronostics) {
                allData.pronostics = rawPronostics;
            } else {
                allData.pronostics = { pronostics: [] };
            }
            console.log('✅ Pronostics chargés:', allData.pronostics.pronostics?.length || 0, 'pronostics');
        } else {
            console.warn('⚠️ pronostics-' + dateString + '.json non disponible');
            allData.pronostics = { pronostics: [] };
        }
        
        if (resultatsRes && resultatsRes.ok) {
            const rawResultats = await resultatsRes.json();
            // Gérer les deux formats possibles
            if (Array.isArray(rawResultats)) {
                // Format: [{date: "...", courses: [...]}]
                if (rawResultats[0] && rawResultats[0].courses) {
                    allData.resultats = rawResultats[0];
                } else {
                    allData.resultats = { courses: rawResultats };
                }
            } else if (rawResultats.courses) {
                allData.resultats = rawResultats;
            } else if (rawResultats.resultats) {
                allData.resultats = { courses: rawResultats.resultats };
            } else {
                allData.resultats = { courses: [] };
            }
            console.log('✅ Résultats chargés:', allData.resultats.courses?.length || 0, 'résultats');
        } else {
            console.warn('⚠️ resultats-' + dateString + '.json non disponible');
            allData.resultats = { courses: [] };
        }
        
        if (coursesRes && coursesRes.ok) {
            allData.courses = await coursesRes.json();
            console.log('✅ Courses chargées');
        } else {
            console.warn('⚠️ courses-' + dateString + '.json non disponible');
        }
        
        // --- MODIFICATION 5 ---
        // Ce bloc ne causera plus d'erreur car 'programmeRes' est défini Ligne 79
        if (programmeRes && programmeRes.ok) {
            const rawProgramme = await programmeRes.json();
            // Gérer le format tableau ou objet
            if (Array.isArray(rawProgramme) && rawProgramme.length > 0) {
                allData.programme = rawProgramme[0];
            } else {
                allData.programme = rawProgramme;
            }
            console.log('✅ Programme chargé:', allData.programme?.reunions?.length || 0, 'réunions');
        } else {
            console.warn('⚠️ programme-' + dateString + '.json non disponible');
            allData.programme = { reunions: [] };
        }
        // --- FIN MODIFICATION 5 ---

        console.log('📊 Données complètes:', allData);

        // --- MODIFICATION 7 ---
        enrichirPronostics();
        // --- FIN MODIFICATION 7 ---

        // Mettre à jour l'interface
        updateDashboard();
        updateHistorique();
        updateCoursesSection();
        updateComparaisonSection();
        updateLastUpdateTime();

    } catch (error) {
        console.error('❌ Erreur lors du chargement des données:', error);
        showError('Erreur de chargement des données. Vérifiez la configuration GitHub.');
    } finally {
        showLoadingState(false); // Cacher les spinners
    }
}

// Fonction pour obtenir la date au format DDMMYYYY
// MODIFICATION: Accepte un objet Date
function getDateString(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}${month}${year}`;
}

// NOUVEAU: Convertir une date DD/MM/YYYY en DDMMYYYY
function displayDateToDDMMYYYY(displayDate) {
    const parts = displayDate.split('/');
    if (parts.length === 3) {
        return `${parts[0]}${parts[1]}${parts[2]}`;
    }
    return '';
}

// NOUVEAU: Convertir une date DDMMYYYY en DD/MM/YYYY
function ddmmyyyyToDisplay(ddmmyyyy) {
    if (ddmmyyyy.length === 8) {
        const day = ddmmyyyy.substring(0, 2);
        const month = ddmmyyyy.substring(2, 4);
        const year = ddmmyyyy.substring(4, 8);
        return `${day}/${month}/${year}`;
    }
    return ddmmyyyy; // Retourne tel quel si le format est mauvais
}

// --- MODIFICATION 6 ---
// Convertir un timestamp Unix (millisecondes) en heure HH:MM
function timestampToHeure(timestamp) {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp);
    const heures = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${heures}:${minutes}`;
}

// Enrichir les pronostics avec les données du programme
function enrichirPronostics() {
    if (!allData.programme || !allData.programme.reunions || !allData.pronostics || !allData.pronostics.pronostics) {
        console.warn('⚠️ Données manquantes pour enrichissement');
        return;
    }
    
    console.log('🔄 Enrichissement des pronostics avec le programme...');
    
    allData.pronostics.pronostics.forEach(prono => {
        const reunionNum = parseInt(prono.reunion.replace('R', ''));
        const courseNum = parseInt(prono.course.replace('C', ''));
        
        // Trouver la réunion dans le programme
        const reunion = allData.programme.reunions.find(r => r.numOfficiel === reunionNum);
        
        if (reunion) {
            // Nom de l'hippodrome
            const codePays = reunion.pays?.code || 'FRA';
            const hippoInfo = HIPPODROMES_PAR_PAYS[codePays]?.[reunionNum];
            
            if (hippoInfo) {
                prono.hippodrome = hippoInfo.nom;
                prono.ville = hippoInfo.ville;
            } else {
                prono.hippodrome = reunion.hippodrome?.nom || `Réunion ${reunionNum}`;
                prono.ville = reunion.hippodrome?.ville || '';
            }
            
            prono.pays = reunion.pays?.libelle || '';
            prono.codePays = codePays;
            
            // Trouver la course spécifique
            const course = reunion.courses.find(c => c.numOrdre === courseNum);
            
            if (course) {
                // Convertir le timestamp en heure
                prono.heure = timestampToHeure(course.heureDepart);
                
                // Discipline
                const disciplineInfo = DISCIPLINES[course.discipline];
                if (disciplineInfo) {
                    prono.discipline = course.discipline;
                    prono.disciplineLabel = disciplineInfo.label;
                    prono.disciplineIcon = disciplineInfo.icon;
                    prono.disciplineColor = disciplineInfo.color;
                    prono.disciplineType = disciplineInfo.type;
                } else {
                    prono.discipline = course.discipline;
                    prono.disciplineLabel = course.discipline;
                }
                
                // Autres infos
                prono.distance = course.distance;
                prono.libelle = course.libelleCourt;
            }
        }
    });
    
    console.log('✅ Enrichissement terminé');
}
// --- FIN MODIFICATION 6 ---

// NOUVEAU: Calculer les statistiques en temps réel depuis les pronostics et résultats
function calculerStatsTempsReel() {
    if (!allData.pronostics || !allData.pronostics.pronostics || allData.pronostics.pronostics.length === 0) {
        return null;
    }

    let total_courses = allData.pronostics.pronostics.length;
    let nb_gagnants = 0;
    let nb_places = 0;
    let nb_rates = 0;
    let somme_confiance = 0;
    let courses_avec_resultats = 0;

    allData.pronostics.pronostics.forEach(prono => {
        // Ajouter la confiance
        somme_confiance += prono.scoreConfiance || 0;

        // Chercher le résultat correspondant
        if (allData.resultats && allData.resultats.courses) {
            const resultat = allData.resultats.courses.find(r => 
                r.reunion === prono.reunion && r.course === prono.course
            );

            if (resultat && resultat.arrivee && resultat.arrivee.length > 0) {
                courses_avec_resultats++;
                
                const numeroGagnant = resultat.arrivee[0];
                const top3 = resultat.arrivee.slice(0, 3);
                
                const chevalPronostique = prono.classement && prono.classement.length > 0 ? 
                    prono.classement[0].numero : null;

                if (chevalPronostique) {
                    if (chevalPronostique === numeroGagnant) {
                        nb_gagnants++;
                        nb_places++; // Un gagnant est aussi placé
                    } else if (top3.includes(chevalPronostique)) {
                        nb_places++;
                    } else {
                        nb_rates++;
                    }
                }
            }
        }
    });

    // Calculer les taux
    const taux_gagnant = courses_avec_resultats > 0 ? 
        Math.round((nb_gagnants / courses_avec_resultats) * 100 * 10) / 10 : 0;
    
    const taux_place = courses_avec_resultats > 0 ? 
        Math.round((nb_places / courses_avec_resultats) * 100 * 10) / 10 : 0;
    
    const confiance_moyenne = total_courses > 0 ? 
        Math.round(somme_confiance / total_courses) : 0;

    return {
        date: ddmmyyyyToDisplay(currentDateString),
        total_courses: total_courses,
        nb_gagnants: nb_gagnants,
        nb_places: nb_places,
        nb_rates: nb_rates,
        taux_gagnant: taux_gagnant,
        taux_place: taux_place,
        confiance_moyenne: confiance_moyenne,
        pronostics_disponibles: true,
        courses_avec_resultats: courses_avec_resultats,
        calcule_temps_reel: true
    };
}

// Mettre à jour le dashboard de performance
function updateDashboard() {
    if (!allData.analyse || !allData.analyse.historique || allData.analyse.historique.length === 0) {
        console.warn('⚠️ Pas de données d\'analyse disponibles');
        return;
    }

    // MODIFICATION: Utiliser la date en cours au lieu de 'historique[0]'
    const currentDisplayDate = ddmmyyyyToDisplay(currentDateString);
    let dernierJour = allData.analyse.historique.find(j => j.date === currentDisplayDate);

    // NOUVEAU: Si le jour n'existe pas OU si les stats sont à zéro, calculer en temps réel
    if (!dernierJour || (dernierJour.total_courses === 0 && allData.pronostics && allData.pronostics.pronostics && allData.pronostics.pronostics.length > 0)) {
        console.log('📊 Calcul des statistiques en temps réel...');
        const statsTempsReel = calculerStatsTempsReel();
        
        if (statsTempsReel) {
            dernierJour = statsTempsReel;
            console.log('✅ Statistiques calculées en temps réel:', dernierJour);
        } else if (!dernierJour) {
            console.warn(`⚠️ Aucune donnée d'analyse trouvée pour le ${currentDisplayDate}`);
            document.getElementById('taux-gagnant').textContent = `0%`;
            document.getElementById('taux-place').textContent = `0%`;
            document.getElementById('confiance-moyenne').textContent = `0%`;
            document.getElementById('courses-analysees').textContent = `0`;
            document.getElementById('nb-gagnants').textContent = `0`;
            document.getElementById('nb-places').textContent = `0`;
            document.getElementById('nb-rates').textContent = `0`;
            return;
        }
    }

    // Mise à jour des KPIs principaux
    document.getElementById('taux-gagnant').textContent = `${dernierJour.taux_gagnant || 0}%`;
    document.getElementById('taux-place').textContent = `${dernierJour.taux_place || 0}%`;
    document.getElementById('confiance-moyenne').textContent = `${dernierJour.confiance_moyenne || 0}%`;
    document.getElementById('courses-analysees').textContent = dernierJour.total_courses || 0;

    // Mise à jour du récapitulatif
    document.getElementById('nb-gagnants').textContent = dernierJour.nb_gagnants || 0;
    document.getElementById('nb-places').textContent = dernierJour.nb_places || 0;
    document.getElementById('nb-rates').textContent = dernierJour.nb_rates || 0;

    // Mettre à jour le graphique avec tous les jours disponibles (jusqu'à 7)
    const nbJoursDisponibles = allData.analyse.historique.length;
    const historique7j = allData.analyse.historique.slice(0, Math.min(7, nbJoursDisponibles)).reverse();
    renderPerformanceChart(historique7j);

    console.log('✅ Dashboard mis à jour avec les données du', dernierJour.date);
    console.log(`📊 Historique : ${nbJoursDisponibles} jour(s) disponible(s), ${historique7j.length} jour(s) affiché(s) dans le graphique`);
}

// Afficher le graphique de performance
function renderPerformanceChart(historique) {
    const ctx = document.getElementById('performance-chart');
    if (!ctx) return;

    const dates = historique.map(h => h.date);
    const tauxGagnants = historique.map(h => h.taux_gagnant || 0);
    const tauxPlaces = historique.map(h => h.taux_place || 0);

    // Détruire l'ancien graphique s'il existe
    if (performanceChart) {
        performanceChart.destroy();
    }

    performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Taux Gagnant (%)',
                    data: tauxGagnants,
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25, 135, 84, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Taux Placé (%)',
                    data: tauxPlaces,
                    borderColor: '#ffc107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// Mettre à jour la section historique
function updateHistorique() {
    const tbody = document.getElementById('historique-body');
    if (!tbody) return;

    if (!allData.analyse || !allData.analyse.historique || allData.analyse.historique.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Aucune donnée historique disponible</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    
    // NOUVEAU: Récupérer la date affichée pour la surbrillance
    const currentDisplayDate = ddmmyyyyToDisplay(currentDateString);
    
    allData.analyse.historique.forEach(jour => {
        const row = document.createElement('tr');
        
        // Colorer la ligne selon les performances
        if (jour.taux_gagnant >= 30) {
            row.classList.add('table-success');
        } else if (jour.taux_place >= 60) {
            row.classList.add('table-warning');
        }
        
        // NOUVEAU: Surligner la ligne du jour sélectionné
        if (jour.date === currentDisplayDate) {
            row.classList.add('table-primary', 'fw-bold');
        }

        row.innerHTML = `
            <td><strong>${jour.date}</strong></td>
            <td>${jour.total_courses || 0}</td>
            <td class="text-success"><strong>${jour.nb_gagnants || 0}</strong></td>
            <td class="text-warning"><strong>${jour.nb_places || 0}</strong></td>
            <td class="text-danger"><strong>${jour.nb_rates || 0}</strong></td>
            <td>
                <span class="badge ${jour.taux_gagnant >= 30 ? 'bg-success' : jour.taux_gagnant >= 15 ? 'bg-warning' : 'bg-secondary'}">
                    ${jour.taux_gagnant || 0}%
                </span>
            </td>
            <td>
                <span class="badge ${jour.taux_place >= 60 ? 'bg-success' : jour.taux_place >= 40 ? 'bg-warning' : 'bg-secondary'}">
                    ${jour.taux_place || 0}%
                </span>
            </td>
            <td>
                <span class="badge bg-info">
                    ${jour.confiance_moyenne || 0}%
                </span>
            </td>
        `;
        
        tbody.appendChild(row);
    });

    console.log('✅ Historique mis à jour avec', allData.analyse.historique.length, 'jours');
}

// Mettre à jour la section comparaison
function updateComparaisonSection() {
    const tbody = document.getElementById('comparaison-body');
    if (!tbody) return;

    if (!allData.pronostics || !allData.pronostics.pronostics || allData.pronostics.pronostics.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">Aucun pronostic disponible</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    let totalPronostics = 0;
    let pronosticsGagnants = 0;
    let pronosticsPlaces = 0;

    allData.pronostics.pronostics.forEach(prono => {
        totalPronostics++;
        
        const row = document.createElement('tr');
        
        // Chercher le résultat correspondant
        let resultatReel = '⏳ En attente';
        let statut = 'En attente';
        let statutClass = 'bg-secondary';
        let rowClass = '';

        if (allData.resultats && allData.resultats.courses) {
            const resultat = allData.resultats.courses.find(r => 
                r.reunion === prono.reunion && r.course === prono.course
            );

            if (resultat && resultat.arrivee && resultat.arrivee.length > 0) {
                const numeroGagnant = resultat.arrivee[0];
                const top3 = resultat.arrivee.slice(0, 3);
                
                resultatReel = `#${numeroGagnant}`;
                
                // Vérifier si le cheval pronostiqué est dans le top 3
                const chevalPronostique = prono.classement && prono.classement.length > 0 ? 
                    prono.classement[0].numero : null;

                if (chevalPronostique) {
                    if (chevalPronostique === numeroGagnant) {
                        statut = '✅ Gagnant';
                        statutClass = 'bg-success';
                        rowClass = 'table-success';
                        pronosticsGagnants++;
                    } else if (top3.includes(chevalPronostique)) {
                        statut = '🥉 Placé';
                        statutClass = 'bg-warning';
                        rowClass = 'table-warning';
                        pronosticsPlaces++;
                    } else {
                        statut = '❌ Raté';
                        statutClass = 'bg-danger';
                        rowClass = 'table-danger';
                    }
                }
            }
        }

        // Construire le nom du cheval et sa cote
        const chevalInfo = prono.classement && prono.classement.length > 0 ? 
            `#${prono.classement[0].numero} - ${prono.classement[0].nom}` : 'N/A';
        
        const cote = prono.classement && prono.classement.length > 0 && prono.classement[0].cote ? 
            prono.classement[0].cote : 'N/A';

        const confiance = prono.scoreConfiance || 0;

        row.className = rowClass;
        row.setAttribute('data-reunion', prono.reunion);
        row.setAttribute('data-confiance', confiance);
        row.setAttribute('data-statut', statut.toLowerCase().includes('gagnant') ? 'gagnant' : 
                                        statut.toLowerCase().includes('placé') ? 'place' : 'rate');
        
        // ==== CORRECTION ICI ====
        // Génère 9 colonnes pour correspondre aux 9 en-têtes
        row.innerHTML = `
            <td>${prono.hippodrome || prono.reunion}</td>
            <td>${prono.heure || '--:--'}</td>
            <td><strong>${prono.reunion}${prono.course}</strong></td>
            <td>${chevalInfo}</td>
            <td>${cote}</td>
            <td>
                <span class="badge ${confiance >= 80 ? 'bg-success' : confiance >= 60 ? 'bg-warning' : 'bg-secondary'}">
                    ${confiance}%
                </span>
            </td>
            <td>1er</td>
            <td>${resultatReel}</td>
            <td><span class="badge ${statutClass}">${statut}</span></td>
        `;
        // ==== FIN CORRECTION ====
        
        tbody.appendChild(row);
    });

    console.log('✅ Comparaison mise à jour:', totalPronostics, 'pronostics |', 
                pronosticsGagnants, 'gagnants |', pronosticsPlaces, 'placés');

    // Mettre en place les filtres
    setupFilters();
}

// Configuration des filtres
function setupFilters() {
    // Filtre par réunion
    const filterReunion = document.getElementById('filter-reunion');
    if (filterReunion) {
        // Récupérer toutes les réunions uniques
        const reunions = new Set();
        document.querySelectorAll('#comparaison-body tr').forEach(row => {
            const reunion = row.getAttribute('data-reunion');
            if (reunion) reunions.add(reunion);
        });

        filterReunion.innerHTML = '<option value="">Toutes les réunions</option>';
        Array.from(reunions).sort().forEach(reunion => {
            filterReunion.innerHTML += `<option value="${reunion}">${reunion}</option>`;
        });

        filterReunion.addEventListener('change', applyFilters);
    }

    // Filtre par confiance
    const filterConfiance = document.getElementById('filter-confiance');
    if (filterConfiance) {
        filterConfiance.addEventListener('change', applyFilters);
    }

    // Filtre par statut
    const filterStatut = document.getElementById('filter-statut');
    if (filterStatut) {
        filterStatut.addEventListener('change', applyFilters);
    }
}

// Appliquer les filtres
function applyFilters() {
    const filterReunion = document.getElementById('filter-reunion')?.value || '';
    const filterConfiance = document.getElementById('filter-confiance')?.value || '';
    const filterStatut = document.getElementById('filter-statut')?.value || '';

    document.querySelectorAll('#comparaison-body tr').forEach(row => {
        const reunion = row.getAttribute('data-reunion');
        const confiance = parseInt(row.getAttribute('data-confiance')) || 0;
        const statut = row.getAttribute('data-statut');

        let show = true;

        if (filterReunion && reunion !== filterReunion) show = false;
        if (filterConfiance && confiance < parseInt(filterConfiance)) show = false;
        if (filterStatut && statut !== filterStatut) show = false;

        row.style.display = show ? '' : 'none';
    });
}

// Mettre à jour la section courses du jour
function updateCoursesSection() {
    if (!allData.pronostics || !allData.pronostics.pronostics || allData.pronostics.pronostics.length === 0) {
        console.warn('⚠️ Pas de pronostics disponibles pour afficher les courses');
        document.getElementById('reunions-tabs').innerHTML = '<li class="nav-item"><span class="nav-link disabled">Aucun pronostic pour ce jour.</span></li>';
        document.getElementById('reunions-content').innerHTML = ''; // Vider le contenu
        return;
    }

    // Grouper les pronostics par réunion
    const pronosticsParReunion = {};
    allData.pronostics.pronostics.forEach(prono => {
        if (!pronosticsParReunion[prono.reunion]) {
            pronosticsParReunion[prono.reunion] = [];
        }
        pronosticsParReunion[prono.reunion].push(prono);
    });

    // Générer les onglets
    const tabsContainer = document.getElementById('reunions-tabs');
    const contentContainer = document.getElementById('reunions-content');
    
    if (!tabsContainer || !contentContainer) return;

    tabsContainer.innerHTML = '';
    contentContainer.innerHTML = '';

    let isFirst = true;
    Object.keys(pronosticsParReunion).sort().forEach(reunion => {
        const tabId = `reunion-${reunion}`;
        
        // --- MODIFICATION 8 ---
        const premierProno = pronosticsParReunion[reunion][0];
        
        // Créer l'onglet
        const tab = document.createElement('li');
        tab.className = 'nav-item';
        // Utilisation de la classe CSS 'reunion-tab' de votre nouveau CSS
        tab.innerHTML = `
            <button class="reunion-tab ${isFirst ? 'active' : ''}" 
                    data-bs-toggle="tab" 
                    data-bs-target="#${tabId}" 
                    type="button">
                <strong>${reunion} (${pronosticsParReunion[reunion].length})</strong>
                <br>
                <small>${premierProno.hippodrome || reunion}${premierProno.ville ? ` (${premierProno.ville})` : ''}</small>
            </button>
        `;
        // --- FIN MODIFICATION 8 ---
        tabsContainer.appendChild(tab);

        // Créer le contenu
        const content = document.createElement('div');
        content.className = `tab-pane fade ${isFirst ? 'show active' : ''}`;
        content.id = tabId;
        
        renderReunionCourses(content, reunion, pronosticsParReunion[reunion]);
        contentContainer.appendChild(content);

        isFirst = false;
    });

    console.log('✅ Section courses mise à jour avec', Object.keys(pronosticsParReunion).length, 'réunions');
}

// Afficher les courses d'une réunion
function renderReunionCourses(container, reunion, courses) {
    let html = '<div class="row g-4 mt-1">'; // g-4 pour plus d'espace

    courses.forEach(prono => {
        // Chercher le résultat
        let resultat = null;
        if (allData.resultats && allData.resultats.courses) {
            resultat = allData.resultats.courses.find(r => 
                r.reunion === prono.reunion && r.course === prono.course
            );
        }

        const confiance = prono.scoreConfiance || 0;
        let confianceClass = 'confiance-low';
        if (confiance >= 80) confianceClass = 'confiance-high';
        else if (confiance >= 60) confianceClass = 'confiance-medium';


        let statusBadge = '<span class="statut-badge statut-attente"><i class="bi bi-hourglass-split"></i> En attente</span>';

        if (resultat && resultat.arrivee && resultat.arrivee.length > 0) {
            const numeroGagnant = resultat.arrivee[0];
            const chevalPronostique = prono.classement && prono.classement.length > 0 ? 
                prono.classement[0].numero : null;

            if (chevalPronostique === numeroGagnant) {
                statusBadge = '<span class="statut-badge statut-gagnant"><i class="bi bi-check-circle-fill"></i> Gagnant</span>';
            } else if (resultat.arrivee.slice(0, 3).includes(chevalPronostique)) {
                statusBadge = '<span class="statut-badge statut-place"><i class="bi bi-award-fill"></i> Placé</span>';
            } else {
                statusBadge = '<span class="statut-badge statut-rate"><i class="bi bi-x-circle-fill"></i> Raté</span>';
            }
        }
        
        // Utilisation des nouvelles classes CSS de index.html
        html += `
            <div class="col-md-6 col-lg-4 fade-in">
                <div class="course-card">
                    <!-- En-tête de la carte -->
                    <div class="course-header">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h4 class="mb-0 fw-bold">${reunion}${prono.course}</h4>
                            ${prono.heure ? `
                                <span class="time-badge">
                                    <i class="bi bi-clock-fill"></i>
                                    ${prono.heure}
                                </span>
                            ` : ''}
                        </div>
                        <div class="hippodrome-info">
                            <span class="hippodrome-badge">
                                <i class="bi bi-geo-alt-fill"></i>
                                ${prono.hippodrome || reunion}${prono.ville ? ` - ${prono.ville}` : ''}
                            </span>
                            ${prono.disciplineLabel ? `
                                <span class="discipline-badge discipline-${prono.disciplineType || 'trot'}">
                                    ${prono.disciplineIcon || ''} ${prono.disciplineLabel} ${prono.distance ? ` - ${prono.distance}m` : ''}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Corps de la carte -->
                    <div class="card-body p-4">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6 class="card-title mb-0 fw-bold"><i class="bi bi-person-check-fill"></i> Pronostic (Confiance ${confiance}%)</h6>
                            ${statusBadge}
                        </div>
        `;

        if (prono.classement && prono.classement.length > 0) {
            // MODIFICATION: slice(0, 1) changé en slice(0, 4) pour afficher les 4 premiers
            prono.classement.slice(0, 4).forEach((cheval, index) => {
                
                // Logique pour assigner la bonne classe de couleur au badge
                let positionClass = `position-${index + 1}`;
                if (index >= 3) { // 4ème (index 3) et au-delà
                    positionClass = 'position-other';
                }

                html += `
                    <div class="pronostic-item">
                        <div class="d-flex align-items-center">
                            <div class="position-badge ${positionClass}">
                                ${index + 1}
                            </div>
                            <div class="ms-3 flex-grow-1">
                                <h5 class="mb-0 fw-bold">#${cheval.numero} - ${cheval.nom}</h5>
                                <small class="text-muted">${prono.libelle || ''}</small>
                            </div>
                            <div class="cote-badge">
                                ${cheval.cote || 'N/A'}
                            </div>
                        </div>
                        <div class="confiance-container">
                            <div class="confiance-bar">
                                <div class="confiance-fill ${confianceClass}" style="width: ${confiance}%;"></div>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
             html += `<div class="pronostic-item"><p class="text-muted mb-0">Aucun pronostic disponible pour cette course.</p></div>`;
        }

        // Afficher les résultats si disponibles
        if (resultat && resultat.arrivee && resultat.arrivee.length > 0) {
            html += `
                        <hr>
                        <h6 class="text-success fw-bold"><i class="bi bi-trophy-fill"></i> Résultat Arrivée</h6>
                        <div class="d-flex gap-2 flex-wrap">
            `;
            
            resultat.arrivee.slice(0, 5).forEach((numero, index) => {
                const badgeClass = index === 0 ? 'resultat-1er' : index === 1 ? 'resultat-2er' : index === 2 ? 'resultat-3er' : 'resultat-autres';
                html += `<span class="resultat-badge ${badgeClass}">${index + 1}er: <strong>#${numero}</strong></span>`;
            });
            
            html += '</div>';
        }

        html += `
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Mettre à jour l'heure de dernière mise à jour
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('last-update').textContent = timeString;
}

// Afficher une erreur
function showError(message) {
    const sections = ['historique-body', 'comparaison-body'];
    sections.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = `<tr><td colspan="9" class="text-center text-danger">${message}</td></tr>`;
        }
    });
}

// Export CSV
document.getElementById('export-csv')?.addEventListener('click', () => {
    if (!allData.pronostics || !allData.pronostics.pronostics) {
        alert('Aucune donnée à exporter');
        return;
    }

    let csv = 'Hippodrome,Heure,Course,Cheval Pronostiqué,Cote,Confiance,Position Prédite,Résultat Réel,Statut\n';
    
    allData.pronostics.pronostics.forEach(prono => {
        let resultatReel = 'En attente';
        let statut = 'En attente';

        if (allData.resultats && allData.resultats.courses) {
            const resultat = allData.resultats.courses.find(r => 
                r.reunion === prono.reunion && r.course === prono.course
            );

            if (resultat && resultat.arrivee && resultat.arrivee.length > 0) {
                resultatReel = `#${resultat.arrivee[0]}`;
                const chevalPronostique = prono.classement && prono.classement.length > 0 ? 
                    prono.classement[0].numero : null;
                
                if (chevalPronostique === resultat.arrivee[0]) {
                    statut = 'Gagnant';
                } else if (resultat.arrivee.slice(0, 3).includes(chevalPronostique)) {
                    statut = 'Placé';
                } else {
                    statut = 'Raté';
                }
            }
        }

        const chevalInfo = prono.classement && prono.classement.length > 0 ? 
            `#${prono.classement[0].numero} - ${prono.classement[0].nom}` : 'N/A';
        const cote = prono.classement && prono.classement.length > 0 && prono.classement[0].cote ? 
            prono.classement[0].cote : 'N/A';
        const confiance = prono.scoreConfiance || 0;

        csv += `"${prono.hippodrome || prono.reunion}","${prono.heure || '--:--'}","${prono.reunion}${prono.course}","${chevalInfo}",${cote},${confiance}%,1er,"${resultatReel}","${statut}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // CORRECTION: Utiliser getDateString(new Date())
    a.download = `pronostics-pmu-${getDateString(new Date())}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
});

// NOUVEAU: Fonction pour peupler le sélecteur de date
function populateDateSelector() {
    const selector = document.getElementById('date-selector');
    if (!selector || !allData.analyse || !allData.analyse.historique) return;
    
    const dates = allData.analyse.historique;
    
    // Garder en mémoire la valeur actuelle pour la restaurer
    const currentValue = selector.value || currentDateString;
    
    selector.innerHTML = ''; // Vider les options
    
    // Ajouter "Aujourd'hui" en premier
    const todayDDMMYYYY = getDateString(new Date());
    const todayDisplay = ddmmyyyyToDisplay(todayDDMMYYYY);
    const todayOption = document.createElement('option');
    todayOption.value = todayDDMMYYYY;
    todayOption.textContent = `Aujourd'hui (${todayDisplay})`;
    selector.appendChild(todayOption);

    // Ajouter les autres jours de l'historique
    dates.forEach(jour => {
        const dateDDMMYYYY = displayDateToDDMMYYYY(jour.date);
        // Ne pas ajouter "Aujourd'hui" une seconde fois si présent dans l'historique
        if (dateDDMMYYYY !== todayDDMMYYYY) {
            const option = document.createElement('option');
            option.value = dateDDMMYYYY;
            option.textContent = jour.date;
            selector.appendChild(option);
        }
    });
    
    // Resélectionner la date qui était active
    selector.value = currentValue;
}

// NOUVEAU: Fonction pour afficher/cacher les spinners
function showLoadingState(isLoading) {
    const spinners = {
        'historique-body': 8,
        'reunions-content': 1, // Pas de colspan, on remplace le contenu
        'comparaison-body': 9
    };

    Object.keys(spinners).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            if (isLoading) {
                if (id === 'reunions-content') {
                    element.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div></div>`;
                } else {
                    const colspan = spinners[id];
                    element.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-5"><div class="spinner-border text-primary" role="status"></div></td></tr>`;
                }
            } else {
                // Le contenu sera remplacé par les fonctions update()
                // On s'assure juste de vider le spinner si aucune donnée n'est trouvée
                if (element.innerHTML.includes('spinner')) {
                     element.innerHTML = `<tr><td colspan="${spinners[id]}" class="text-center text-muted">Aucune donnée.</td></tr>`;
                }
            }
        }
    });
    
    // Désactiver les boutons pendant le chargement
    document.getElementById('date-selector').disabled = isLoading;
    document.getElementById('load-today').disabled = isLoading;
}


// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Application démarrée');
    
    // Charger les données du jour au démarrage
    loadAllData(getDateString(new Date()));
    
    // Rafraîchir toutes les 5 minutes
    setInterval(() => {
        // Ne rafraîchit que si l'utilisateur est sur "aujourd'hui"
        if (currentDateString === getDateString(new Date())) {
            console.log('🔄 Rafraîchissement automatique...');
            loadAllData(currentDateString);
        }
    }, CONFIG.REFRESH_INTERVAL);
    
    // NOUVEAU: Écouteur pour le sélecteur de date
    document.getElementById('date-selector').addEventListener('change', (e) => {
        const nouvelleDate = e.target.value;
        loadAllData(nouvelleDate);
    });
    
    // NOUVEAU: Écouteur pour le bouton "Aujourd'hui"
    document.getElementById('load-today').addEventListener('click', () => {
        loadAllData(getDateString(new Date()));
    });
});
