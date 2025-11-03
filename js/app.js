// Configuration GitHub
const GITHUB_USERNAME = 'Bitzibox';
const REPO_NAME = 'pmu-pronostics';
const BRANCH = 'main';
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH}/data/`;

// Variables globales
let performanceChart = null;
let allData = {
    analyse: null,
    pronostics: null,
    resultats: null,
    courses: null
};

// Fonction principale de chargement
async function loadAllData() {
    console.log('🔄 Chargement des données depuis GitHub...');
    
    const dateString = getDateString(); // Format: DDMMYYYY
    console.log('📅 Date du jour:', dateString);
    
    // Ajouter un timestamp pour éviter le cache
    const timestamp = new Date().getTime();
    
    try {
        // Charger tous les fichiers en parallèle avec la date du jour
        const [analyseRes, pronosticsRes, resultatsRes, coursesRes] = await Promise.all([
            fetch(GITHUB_RAW_BASE + 'analyse.json?t=' + timestamp).catch(e => null),
            fetch(GITHUB_RAW_BASE + 'pronostics-' + dateString + '.json?t=' + timestamp).catch(e => null),
            fetch(GITHUB_RAW_BASE + 'resultats-' + dateString + '.json?t=' + timestamp).catch(e => null),
            fetch(GITHUB_RAW_BASE + 'courses-' + dateString + '.json?t=' + timestamp).catch(e => null)
        ]);

        console.log('📡 URLs chargées:');
        console.log('  - analyse.json');
        console.log('  - pronostics-' + dateString + '.json');
        console.log('  - resultats-' + dateString + '.json');
        console.log('  - courses-' + dateString + '.json');

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

        console.log('📊 Données complètes:', allData);

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

// Mettre à jour le dashboard de performance
function updateDashboard() {
    if (!allData.analyse || !allData.analyse.historique || allData.analyse.historique.length === 0) {
        console.warn('⚠️ Pas de données d\'analyse disponibles');
        return;
    }

    // Prendre le dernier jour (le plus récent)
    const dernierJour = allData.analyse.historique[0];

    document.getElementById('taux-gagnant').textContent = `${dernierJour.taux_gagnant || 0}%`;
    document.getElementById('taux-place').textContent = `${dernierJour.taux_place || 0}%`;
    document.getElementById('roi-theorique').textContent = `${(dernierJour.roi_theorique || 0).toFixed(2)}€`;
    document.getElementById('courses-analysees').textContent = dernierJour.total_courses || 0;

    // Mettre à jour le graphique avec les 7 derniers jours
    const historique7j = allData.analyse.historique.slice(0, 7).reverse();
    renderPerformanceChart(historique7j);

    console.log('✅ Dashboard mis à jour avec les données du', dernierJour.date);
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
                    borderColor: 'rgba(40, 167, 69, 1)',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Taux Placé (%)',
                    data: tauxPlaces,
                    borderColor: 'rgba(255, 193, 7, 1)',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    borderWidth: 2,
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
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: value => value + '%'
                    }
                }
            }
        }
    });
}

// Mettre à jour l'historique des performances
function updateHistorique() {
    const tbody = document.getElementById('historique-body');
    if (!tbody) return;

    if (!allData.analyse || !allData.analyse.historique || allData.analyse.historique.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Aucune donnée d\'historique disponible</td></tr>';
        return;
    }

    tbody.innerHTML = '';

    for (const jour of allData.analyse.historique) {
        const row = document.createElement('tr');
        
        const tauxGagnantClass = jour.taux_gagnant >= 30 ? 'text-success fw-bold' : 
                                 jour.taux_gagnant >= 20 ? 'text-warning' : 'text-danger';
        const tauxPlaceClass = jour.taux_place >= 60 ? 'text-success fw-bold' : 
                               jour.taux_place >= 40 ? 'text-warning' : 'text-danger';
        const roiClass = jour.roi_theorique > 0 ? 'text-success fw-bold' : 'text-danger';
        
        row.innerHTML = `
            <td>${jour.date}</td>
            <td class="text-center">${jour.total_courses}</td>
            <td class="text-center">${jour.courses_gagnantes || 0}</td>
            <td class="text-center">${jour.courses_placees || 0}</td>
            <td class="text-center ${tauxGagnantClass}">${jour.taux_gagnant || 0}%</td>
            <td class="text-center ${tauxPlaceClass}">${jour.taux_place || 0}%</td>
            <td class="text-center ${roiClass}">${jour.roi_theorique > 0 ? '+' : ''}${(jour.roi_theorique || 0).toFixed(2)}€</td>
        `;
        tbody.appendChild(row);
    }

    console.log('✅ Historique mis à jour avec', allData.analyse.historique.length, 'jours');
}

// Mettre à jour la section des courses du jour
function updateCoursesSection() {
    // Gérer les différents formats possibles
    let reunions = [];
    
    if (allData.courses) {
        if (Array.isArray(allData.courses)) {
            // Format: tableau direct avec un objet contenant programme
            if (allData.courses[0] && allData.courses[0].programme && allData.courses[0].programme.reunions) {
                reunions = allData.courses[0].programme.reunions;
            }
            // Format: tableau direct de réunions
            else if (allData.courses[0] && allData.courses[0].numOfficiel) {
                reunions = allData.courses;
            }
        }
        // Format: objet avec programme
        else if (allData.courses.programme && allData.courses.programme.reunions) {
            reunions = allData.courses.programme.reunions;
        }
        // Format: objet avec reunions direct
        else if (allData.courses.reunions) {
            reunions = allData.courses.reunions;
        }
    }
    
    if (!reunions || reunions.length === 0) {
        console.warn('⚠️ Pas de données de courses disponibles');
        console.log('Structure courses reçue:', allData.courses);
        return;
    }

    const tabsList = document.getElementById('reunions-tabs');
    const tabsContent = document.getElementById('reunions-content');

    if (!tabsList || !tabsContent) {
        console.warn('⚠️ Éléments DOM reunions-tabs ou reunions-content introuvables');
        return;
    }

    tabsList.innerHTML = '';
    tabsContent.innerHTML = '';

    reunions.forEach((reunion, index) => {
        const reunionId = `reunion-${reunion.numOfficiel}`;
        const isActive = index === 0 ? 'active' : '';

        // Créer l'onglet
        const tab = document.createElement('li');
        tab.className = 'nav-item';
        tab.innerHTML = `
            <button class="nav-link ${isActive}" id="${reunionId}-tab" data-bs-toggle="tab" 
                    data-bs-target="#${reunionId}" type="button" role="tab">
                R${reunion.numOfficiel} - ${reunion.hippodrome?.libelleCourt || reunion.hippodrome?.libelle || 'N/A'}
            </button>
        `;
        tabsList.appendChild(tab);

        // Créer le contenu
        const content = document.createElement('div');
        content.className = `tab-pane fade ${isActive ? 'show active' : ''}`;
        content.id = reunionId;
        content.role = 'tabpanel';

        let coursesHTML = '<div class="table-responsive mt-3"><table class="table table-sm table-striped">';
        coursesHTML += '<thead class="table-light"><tr><th>Course</th><th>Départ</th><th>Distance</th><th>Partants</th></tr></thead><tbody>';

        if (reunion.courses) {
            reunion.courses.forEach(course => {
                // Convertir le timestamp de l'heure de départ
                let heureDepart = 'N/A';
                if (course.heureDepart) {
                    if (typeof course.heureDepart === 'number') {
                        // Timestamp en millisecondes
                        const date = new Date(course.heureDepart);
                        heureDepart = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                    } else {
                        heureDepart = course.heureDepart;
                    }
                }
                
                coursesHTML += `
                    <tr>
                        <td><strong>C${course.numOrdre}</strong></td>
                        <td>${heureDepart}</td>
                        <td>${course.distance || 'N/A'}m</td>
                        <td>${course.nombreDeclaresPartants || course.nombrePartants || 'N/A'}</td>
                    </tr>
                `;
            });
        }

        coursesHTML += '</tbody></table></div>';
        content.innerHTML = coursesHTML;
        tabsContent.appendChild(content);
    });

    console.log('✅ Section courses mise à jour avec', reunions.length, 'réunions');
}

// Mettre à jour la section de comparaison avec affichage par course
function updateComparaisonSection() {
    const container = document.getElementById('comparaison-resultats');
    if (!container) return;

    // Remplacer le contenu par un affichage par course
    container.innerHTML = '<h2 class="mb-4">🔍 Pronostics et Résultats par Course</h2>';

    if (!allData.pronostics || !allData.pronostics.pronostics || allData.pronostics.pronostics.length === 0) {
        container.innerHTML += '<p class="text-center text-muted">Aucun pronostic disponible</p>';
        return;
    }

    let gainsTotal = 0;
    let misesTotal = 0;
    let coursesGagnantes = 0;
    let coursesPlacees = 0;

    for (const prono of allData.pronostics.pronostics) {
        const courseId = prono.courseId || `${prono.reunion}${prono.course}`;
        const top5 = prono.classement ? prono.classement.slice(0, 5) : [];
        
        // Trouver le résultat correspondant
        let resultat = null;
        if (allData.resultats && allData.resultats.courses) {
            resultat = allData.resultats.courses.find(r => 
                r.reunion === prono.reunion && r.course === prono.course
            );
        }

        // Calcul des gains pour cette course
        let gainsCourse = 0;
        let misesCourse = 0;
        const detailsGains = [];

        if (resultat && resultat.arrivee && resultat.arrivee.length > 0 && top5.length > 0) {
            const numeroGagnantReel = resultat.arrivee[0];
            const numeroPronostique = top5[0].numero;

            // Simple Gagnant (1€)
            misesCourse += 1;
            if (numeroPronostique === numeroGagnantReel) {
                // Chercher le rapport Simple Gagnant
                const rapportGagnant = resultat.rapports.find(r => 
                    r.typePari === 'SIMPLE_GAGNANT' || r.libelle?.includes('Simple gagnant')
                );
                if (rapportGagnant && rapportGagnant.dividende) {
                    const gain = rapportGagnant.dividende / 100; // Dividende pour 1€
                    gainsCourse += gain;
                    detailsGains.push(`Simple Gagnant: +${gain.toFixed(2)}€`);
                    coursesGagnantes++;
                }
            }

            // Simple Placé (1€)
            misesCourse += 1;
            const indexPlace = resultat.arrivee.indexOf(numeroPronostique);
            if (indexPlace >= 0 && indexPlace <= 2) {
                // Chercher le rapport Simple Placé
                const rapportPlace = resultat.rapports.find(r => 
                    r.typePari === 'SIMPLE_PLACE' || r.libelle?.includes('Simple placé')
                );
                if (rapportPlace && rapportPlace.dividende) {
                    const gain = rapportPlace.dividende / 100;
                    gainsCourse += gain;
                    detailsGains.push(`Simple Placé: +${gain.toFixed(2)}€`);
                    if (indexPlace > 0) coursesPlacees++; // Ne pas compter 2 fois si gagnant
                }
            }
        } else if (resultat) {
            // Course terminée mais pas de résultat exploitable
            misesCourse = 2; // Mise perdue
        }

        const gainNet = gainsCourse - misesCourse;
        gainsTotal += gainsCourse;
        misesTotal += misesCourse;

        // Créer la card pour la course
        const courseCard = document.createElement('div');
        courseCard.className = 'card mb-4';
        
        let cardHTML = `
            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <h5 class="mb-0">${courseId} - ${prono.nombrePartants || 0} partants</h5>
                ${resultat && resultat.arrivee && resultat.arrivee.length > 0 ? `
                    <div class="text-end">
                        <span class="badge ${gainNet > 0 ? 'bg-success' : gainNet < 0 ? 'bg-danger' : 'bg-secondary'} fs-6">
                            ${gainNet > 0 ? '+' : ''}${gainNet.toFixed(2)}€
                        </span>
                        <small class="ms-2">Mise: ${misesCourse}€</small>
                    </div>
                ` : '<span class="badge bg-secondary">En attente</span>'}
            </div>
            <div class="card-body">
        `;

        // Afficher les détails des gains si disponibles
        if (detailsGains.length > 0) {
            cardHTML += `
                <div class="alert alert-success mb-3">
                    <strong>💰 Gains:</strong><br>
                    ${detailsGains.join('<br>')}
                    <hr class="my-2">
                    <strong>Total: ${gainsCourse.toFixed(2)}€ - ${misesCourse}€ = ${gainNet > 0 ? '+' : ''}${gainNet.toFixed(2)}€</strong>
                </div>
            `;
        } else if (misesCourse > 0) {
            cardHTML += `
                <div class="alert alert-danger mb-3">
                    <strong>❌ Mise perdue: -${misesCourse.toFixed(2)}€</strong>
                </div>
            `;
        }

        // Afficher les pronostics
        if (top5.length > 0) {
            cardHTML += `
                <h6 class="text-success">🎯 Pronostics (Confiance: 78%)</h6>
                <div class="table-responsive">
                    <table class="table table-sm table-hover">
                        <thead class="table-light">
                            <tr>
                                <th>Position Prédite</th>
                                <th>Cheval</th>
                                <th>Cote</th>
                                <th>Jockey</th>
                                <th>Place Réelle</th>
                                <th>Résultat</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            top5.forEach((cheval, index) => {
                const position = index + 1;
                let placeReelle = '-';
                let resultatClass = 'text-muted';
                let resultatBadge = 'En attente';
                let badgeClass = 'bg-secondary';

                // Trouver la place réelle si résultat disponible
                if (resultat && resultat.arrivee && resultat.arrivee.length > 0) {
                    const indexReel = resultat.arrivee.indexOf(cheval.numero);
                    if (indexReel >= 0) {
                        placeReelle = `${indexReel + 1}er`;
                        
                        // Déterminer le statut
                        if (indexReel === 0 && position === 1) {
                            resultatBadge = '✅ Gagnant';
                            badgeClass = 'bg-success';
                            resultatClass = 'text-success fw-bold';
                        } else if (indexReel <= 2) {
                            resultatBadge = '✓ Placé';
                            badgeClass = 'bg-warning';
                            resultatClass = 'text-warning';
                        } else {
                            resultatBadge = '❌ Hors top 3';
                            badgeClass = 'bg-danger';
                            resultatClass = 'text-danger';
                        }
                    } else {
                        resultatBadge = '❌ Non placé';
                        badgeClass = 'bg-danger';
                        resultatClass = 'text-danger';
                    }
                }

                cardHTML += `
                    <tr class="${resultatClass}">
                        <td><strong>${position}er</strong></td>
                        <td>n°${cheval.numero} - ${cheval.nom}</td>
                        <td>${cheval.cote}</td>
                        <td>${cheval.jockey || 'N/A'}</td>
                        <td>${placeReelle}</td>
                        <td><span class="badge ${badgeClass}">${resultatBadge}</span></td>
                    </tr>
                `;
            });

            cardHTML += `
                        </tbody>
                    </table>
                </div>
            `;
        }

        // Afficher le résultat réel
        if (resultat && resultat.arrivee && resultat.arrivee.length > 0) {
            cardHTML += `
                <h6 class="text-info mt-3">🏆 Arrivée Définitive</h6>
                <div class="d-flex gap-2 align-items-center flex-wrap">
            `;
            
            resultat.arrivee.slice(0, 5).forEach((numero, index) => {
                const badge = index === 0 ? 'bg-warning' : index <= 2 ? 'bg-info' : 'bg-secondary';
                cardHTML += `<span class="badge ${badge} fs-6">${index + 1}er: #${numero}</span>`;
            });
            
            cardHTML += '</div>';

            // Afficher les rapports
            if (resultat.rapports && resultat.rapports.length > 0) {
                cardHTML += `
                    <div class="mt-2 small text-muted">
                        <strong>Rapports:</strong> 
                `;
                resultat.rapports.slice(0, 3).forEach(r => {
                    if (r.dividende) {
                        cardHTML += `${r.libelle}: ${(r.dividende / 100).toFixed(2)}€ | `;
                    }
                });
                cardHTML += '</div>';
            }
        } else {
            cardHTML += '<p class="text-muted mt-3">⏳ Résultat en attente</p>';
        }

        cardHTML += `
            </div>
        `;

        courseCard.innerHTML = cardHTML;
        container.appendChild(courseCard);
    }

    // Ajouter un récapitulatif global en haut
    const recapGlobal = document.createElement('div');
    recapGlobal.className = 'alert alert-primary mb-4';
    const gainNetTotal = gainsTotal - misesTotal;
    const roi = misesTotal > 0 ? ((gainNetTotal / misesTotal) * 100) : 0;
    
    recapGlobal.innerHTML = `
        <h5>💰 Récapitulatif Global</h5>
        <div class="row">
            <div class="col-md-3">
                <strong>Mises totales:</strong> ${misesTotal.toFixed(2)}€
            </div>
            <div class="col-md-3">
                <strong>Gains bruts:</strong> ${gainsTotal.toFixed(2)}€
            </div>
            <div class="col-md-3">
                <strong>Gains nets:</strong> <span class="${gainNetTotal >= 0 ? 'text-success' : 'text-danger'}">${gainNetTotal > 0 ? '+' : ''}${gainNetTotal.toFixed(2)}€</span>
            </div>
            <div class="col-md-3">
                <strong>ROI:</strong> <span class="${roi >= 0 ? 'text-success' : 'text-danger'}">${roi > 0 ? '+' : ''}${roi.toFixed(1)}%</span>
            </div>
        </div>
        <hr>
        <div class="row mt-2">
            <div class="col-md-4">
                <strong>Courses gagnantes:</strong> ${coursesGagnantes}
            </div>
            <div class="col-md-4">
                <strong>Courses placées:</strong> ${coursesPlacees}
            </div>
            <div class="col-md-4">
                <strong>Total courses:</strong> ${allData.pronostics.pronostics.length}
            </div>
        </div>
    `;
    
    container.insertBefore(recapGlobal, container.firstChild.nextSibling);

    console.log('✅ Section pronostics par course mise à jour avec', allData.pronostics.pronostics.length, 'courses');
    console.log(`💰 Gains: ${gainsTotal.toFixed(2)}€ | Mises: ${misesTotal.toFixed(2)}€ | Net: ${gainNetTotal.toFixed(2)}€ | ROI: ${roi.toFixed(1)}%`);
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
            element.innerHTML = `<tr><td colspan="7" class="text-center text-danger">${message}</td></tr>`;
        }
    });
}

// Export CSV
document.getElementById('export-csv')?.addEventListener('click', () => {
    if (!allData.pronostics || !allData.pronostics.pronostics) {
        alert('Aucune donnée à exporter');
        return;
    }

    let csv = 'Course,Cheval Pronostiqué,Cote,Position Prédite,Résultat Réel,Statut\n';
    
    for (const prono of allData.pronostics.pronostics) {
        let resultatReel = 'En attente';
        let statut = 'En attente';

        if (allData.resultats && allData.resultats.resultats) {
            const resultat = allData.resultats.resultats.find(r => 
                r.numero_course === prono.numero_course
            );

            if (resultat) {
                resultatReel = `#${resultat.numero_gagnant}`;
                const pronoGagnant = prono.top3_prevu ? prono.top3_prevu[0] : prono.numero_gagnant_prevu;
                
                if (pronoGagnant === resultat.numero_gagnant) {
                    statut = 'Gagnant';
                } else if (prono.top3_prevu && prono.top3_prevu.includes(resultat.numero_gagnant)) {
                    statut = 'Placé';
                } else {
                    statut = 'Raté';
                }
            }
        }

        csv += `${prono.numero_course},#${prono.top3_prevu ? prono.top3_prevu[0] : prono.numero_gagnant_prevu},${prono.cote || 'N/A'},${prono.top3_prevu ? prono.top3_prevu.join('-') : prono.numero_gagnant_prevu},${resultatReel},${statut}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
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
