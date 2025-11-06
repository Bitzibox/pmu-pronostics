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

// Fonction principale de chargement
async function loadAllData() {
    console.log('🔄 Chargement des données depuis GitHub...');
    
    const dateString = getDateString(); // Format: DDMMYYYY
    console.log('📅 Date du jour:', dateString);
    
    // Ajouter un timestamp pour éviter le cache
    const timestamp = new Date().getTime();
    
    try {
        // --- MODIFICATION 4 ---
        // Charger tous les fichiers en parallèle avec la date du jour
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
                    console.log('✅ Analyse chargée (depuis tableau):', allData.analyse.historique?.length || 0, 'jours');
                } else {
                    // Tableau d'objets historique direct
                    allData.analyse = { historique: rawAnalyse, stats_globales: {} };
                    console.log('✅ Analyse chargée (tableau direct):', rawAnalyse.length, 'jours');
                }
            } else if (rawAnalyse.historique) {
                // Structure correcte avec historique
                allData.analyse = rawAnalyse;
                console.log('✅ Analyse chargée:', allData.analyse.historique?.length || 0, 'jours');
            } else {
                // Structure inconnue, créer une structure vide
                allData.analyse = { historique: [], stats_globales: {} };
                console.warn('⚠️ Structure analyse.json inconnue');
            }
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
    }
}

// Fonction pour obtenir la date au format DDMMYYYY
function getDateString() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}${month}${year}`;
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

// Mettre à jour le dashboard de performance
function updateDashboard() {
    if (!allData.analyse || !allData.analyse.historique || allData.analyse.historique.length === 0) {
        console.warn('⚠️ Pas de données d\'analyse disponibles');
        return;
    }

    // Prendre le dernier jour (le plus récent)
    const dernierJour = allData.analyse.historique[0];

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
    
    allData.analyse.historique.forEach(jour => {
        const row = document.createElement('tr');
        
        // Colorer la ligne selon les performances
        if (jour.taux_gagnant >= 30) {
            row.classList.add('table-success');
        } else if (jour.taux_place >= 60) {
            row.classList.add('table-warning');
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
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Aucun pronostic disponible</td></tr>';
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
        
        row.innerHTML = `
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
        tab.innerHTML = `
            <button class="nav-link ${isFirst ? 'active' : ''}" 
                    data-bs-toggle="tab" 
                    data-bs-target="#${tabId}" 
                    type="button">
                <div class="d-flex flex-column align-items-start">
                    <strong>${reunion} (${pronosticsParReunion[reunion].length})</strong>
                    <small>${premierProno.hippodrome || reunion}${premierProno.ville ? ` (${premierProno.ville})` : ''}</small>
                </div>
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
    let html = '<div class="row g-3 mt-3">';

    courses.forEach(prono => {
        // Chercher le résultat
        let resultat = null;
        if (allData.resultats && allData.resultats.courses) {
            resultat = allData.resultats.courses.find(r => 
                r.reunion === prono.reunion && r.course === prono.course
            );
        }

        // --- MODIFICATION 9 (retrait des variables 'heureDepart' et 'hippodrome' qui sont maintenant enrichies) ---
        // const heureDepart = prono.heureDepart || 'N/A'; // RETIRÉ
        // const hippodrome = prono.hippodrome || reunion; // RETIRÉ
        const confiance = prono.scoreConfiance || 0;

        let cardClass = 'border-secondary';
        let statusBadge = '<span class="badge bg-secondary">⏳ En attente</span>';

        if (resultat && resultat.arrivee && resultat.arrivee.length > 0) {
            const numeroGagnant = resultat.arrivee[0];
            const chevalPronostique = prono.classement && prono.classement.length > 0 ? 
                prono.classement[0].numero : null;

            if (chevalPronostique === numeroGagnant) {
                cardClass = 'border-success';
                statusBadge = '<span class="badge bg-success">✅ Gagnant</span>';
            } else if (resultat.arrivee.slice(0, 3).includes(chevalPronostique)) {
                cardClass = 'border-warning';
                statusBadge = '<span class="badge bg-warning">🥉 Placé</span>';
            } else {
                cardClass = 'border-danger';
                statusBadge = '<span class="badge bg-danger">❌ Raté</span>';
            }
        }

        // --- MODIFICATION 9 (Mise à jour de la structure de la carte) ---
        html += `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 ${cardClass}">
                    <div class="card-header bg-light">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-1">${reunion}${prono.course}</h5>
                            ${statusBadge}
                        </div>
                        <div class="hippodrome-info mt-1">
                            <span class="hippodrome-badge" style="font-size: 0.9em; color: #6c757d;">
                                <i class="bi bi-geo-alt-fill"></i>
                                ${prono.hippodrome || reunion}${prono.ville ? ` - ${prono.ville}` : ''}
                            </span>
                            ${prono.heure ? `
                                <span class="time-badge" style="font-size: 0.9em; color: #6c757d; margin-left: 10px;">
                                    <i class="bi bi-clock-fill"></i>
                                    ${prono.heure}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    <div class="card-body">
                        ${prono.disciplineLabel ? `
                            <span class="discipline-badge d-inline-block mb-2" style="background: ${prono.disciplineColor}; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.875em;">
                                ${prono.disciplineIcon || ''} ${prono.disciplineLabel}
                            </span>
                        ` : ''}
                        ${prono.distance ? `
                            <small class="text-muted d-block mb-2">
                                <i class="bi bi-rulers"></i> ${prono.distance}m
                            </small>
                        ` : ''}
                        <h6 class="card-title">🎯 Pronostic</h6>
        
        <!-- --- FIN MODIFICATION 9 --- -->
        
                        <div class="table-responsive">
                            <table class="table table-sm table-borderless mb-0">
                                <tbody>
        `;

        if (prono.classement && prono.classement.length > 0) {
            prono.classement.slice(0, 3).forEach((cheval, index) => {
                const badge = index === 0 ? 'bg-warning' : index === 1 ? 'bg-info' : 'bg-secondary';
                html += `
                    <tr>
                        <td><span class="badge ${badge}">${index + 1}er</span></td>
                        <td><strong>#${cheval.numero}</strong> ${cheval.nom}</td>
                        <td class="text-end">${cheval.cote || 'N/A'}</td>
                    </tr>
                `;
            });
        }

        html += `
                                </tbody>
                            </table>
                        </div>
                        <div class="mt-2">
                            <small class="text-muted">
                                Score confiance: 
                                <span class="badge ${confiance >= 80 ? 'bg-success' : confiance >= 60 ? 'bg-warning' : 'bg-secondary'}">
                                    ${confiance}%
                                </span>
                            </small>
                        </div>
        `;

        // Afficher les résultats si disponibles
        if (resultat && resultat.arrivee && resultat.arrivee.length > 0) {
            html += `
                        <hr>
                        <h6 class="text-success">🏆 Résultat</h6>
                        <div class="d-flex gap-2 flex-wrap">
            `;
            
            resultat.arrivee.slice(0, 5).forEach((numero, index) => {
                const badge = index === 0 ? 'bg-warning' : index <= 2 ? 'bg-info' : 'bg-secondary';
                html += `<span class="badge ${badge}">${index + 1}er: #${numero}</span>`;
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
            element.innerHTML = `<tr><td colspan="8" class="text-center text-danger">${message}</td></tr>`;
        }
    });
}

// Export CSV
document.getElementById('export-csv')?.addEventListener('click', () => {
    if (!allData.pronostics || !allData.pronostics.pronostics) {
        alert('Aucune donnée à exporter');
        return;
    }

    let csv = 'Course,Cheval Pronostiqué,Cote,Confiance,Position Prédite,Résultat Réel,Statut\n';
    
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
            `#${prono.classement[0].numero} ${prono.classement[0].nom}` : 'N/A';
        const cote = prono.classement && prono.classement.length > 0 && prono.classement[0].cote ? 
            prono.classement[0].cote : 'N/A';
        const confiance = prono.scoreConfiance || 0;

        csv += `${prono.reunion}${prono.course},"${chevalInfo}",${cote},${confiance}%,1er,${resultatReel},${statut}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pronostics-pmu-${getDateString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
});

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Application démarrée');
    loadAllData();
    
    // Rafraîchir toutes les 5 minutes
    setInterval(loadAllData, 5 * 60 * 1000);
});
