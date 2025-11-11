// Configuration GitHub
const GITHUB_USERNAME = 'Bitzibox';
const REPO_NAME = 'pmu-pronostics';
const BRANCH = 'main';
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH}/data/`;
const CONFIG = {
    REFRESH_INTERVAL: 300000, // 5 minutes
    DATE_FORMAT: 'DD/MM/YYYY'
};

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
    'DEU': { 2: { nom: 'Gelsenkirchen', ville: 'Gelsenkirchen' } },
    'NLD': { 5: { nom: 'Wolvega', ville: 'Wolvega' } },
    'USA': { 6: { nom: 'Charles Town', ville: 'Charles Town' } }
};

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

// Variables globales
let performanceChart = null;
let chartHistoriqueInstance = null;
let allData = { analyse: null, pronostics: null, resultats: null, courses: null, programme: null };
let currentDateString = '';

// ✅ NOUVELLE FONCTION : Récupérer les infos d'une course depuis le fichier courses
function getCourseInfoFromCoursesFile(reunion, course) {
    const info = {
        heure: '--:--',
        discipline: 'Inconnue',
        hippodrome: null,
        statut: 'INCONNU',
        distance: null,
        libelle: null
    };
    
    try {
        if (!allData.courses || !Array.isArray(allData.courses)) {
            return info;
        }
        
        const coursesData = allData.courses[0];
        if (!coursesData?.programme?.reunions) {
            return info;
        }
        
        const reunionData = coursesData.programme.reunions.find(r => r.numOfficiel === parseInt(reunion));
        if (!reunionData) {
            return info;
        }
        
        // Récupérer le vrai nom de l'hippodrome
        if (reunionData.hippodrome?.libelleCourt) {
            info.hippodrome = reunionData.hippodrome.libelleCourt;
        }
        
        // Trouver la course spécifique
        const courseData = reunionData.courses?.find(c => c.numOrdre === parseInt(course));
        if (courseData) {
            // Convertir le timestamp en heure (format HH:MM)
            if (courseData.heureDepart) {
                const date = new Date(courseData.heureDepart);
                info.heure = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            }
            
            info.discipline = courseData.discipline || info.discipline;
            info.distance = courseData.distance;
            info.libelle = courseData.libelleCourt;
            
            // Déterminer le statut de la course
            if (courseData.arriveeDefinitive) {
                info.statut = 'TERMINÉ';
            } else if (courseData.departImminent) {
                info.statut = 'EN COURS';
            } else {
                info.statut = 'OUVERT';
            }
        }
    } catch (error) {
        console.warn(`⚠️ Erreur dans getCourseInfoFromCoursesFile pour R${reunion}C${course}:`, error);
    }
    
    return info;
}

// ✅ NOUVELLE FONCTION : Récupérer les cotes depuis le fichier courses
function getCotesFromCoursesFile(reunion, course) {
    const cotes = {};
    
    try {
        if (!allData.courses || !Array.isArray(allData.courses)) {
            return cotes;
        }
        
        const coursesData = allData.courses[0];
        if (!coursesData?.programme?.reunions) {
            return cotes;
        }
        
        const reunionData = coursesData.programme.reunions.find(r => r.numOfficiel === parseInt(reunion));
        if (!reunionData) {
            return cotes;
        }
        
        const courseData = reunionData.courses?.find(c => c.numOrdre === parseInt(course));
        if (!courseData?.participants) {
            return cotes;
        }
        
        // Extraire les cotes depuis les rapports probables
        courseData.participants.forEach(participant => {
            if (participant.numPmu && participant.rapportDirect) {
                cotes[participant.numPmu] = parseFloat(participant.rapportDirect);
            }
        });
    } catch (error) {
        console.warn(`⚠️ Erreur dans getCotesFromCoursesFile pour R${reunion}C${course}:`, error);
    }
    
    return cotes;
}

// Fonction principale de chargement
async function loadAllData(dateStringDDMMYYYY) {
    console.log(`🔄 Chargement des données pour le ${dateStringDDMMYYYY}...`);
    showLoadingState(true);
    currentDateString = dateStringDDMMYYYY;
    const timestamp = new Date().getTime();
    
    try {
        const [analyseRes, pronosticsRes, resultatsRes, coursesRes, programmeRes] = await Promise.all([
            fetch(GITHUB_RAW_BASE + 'analyse.json?t=' + timestamp).catch(e => null),
            fetch(GITHUB_RAW_BASE + 'pronostics-' + dateStringDDMMYYYY + '.json?t=' + timestamp).catch(e => null),
            fetch(GITHUB_RAW_BASE + 'resultats-' + dateStringDDMMYYYY + '.json?t=' + timestamp).catch(e => null),
            fetch(GITHUB_RAW_BASE + 'courses-' + dateStringDDMMYYYY + '.json?t=' + timestamp).catch(e => null),
            fetch(GITHUB_RAW_BASE + 'programme-' + dateStringDDMMYYYY + '.json?t=' + timestamp).catch(e => null)
        ]);

        // Parser analyse
        if (analyseRes && analyseRes.ok) {
            const rawAnalyse = await analyseRes.json();
            if (Array.isArray(rawAnalyse)) {
                if (rawAnalyse[0] && rawAnalyse[0].historique) {
                    allData.analyse = rawAnalyse[0];
                    allData.analyse.historique.reverse();
                } else {
                    allData.analyse = { historique: rawAnalyse.reverse(), stats_globales: {} };
                }
            } else if (rawAnalyse.historique) {
                allData.analyse = rawAnalyse;
                allData.analyse.historique.reverse();
            } else {
                allData.analyse = { historique: [], stats_globales: {} };
            }
            populateDateSelector();
        } else {
            allData.analyse = { historique: [], stats_globales: {} };
        }
        
        // Parser pronostics
        if (pronosticsRes && pronosticsRes.ok) {
            const rawPronostics = await pronosticsRes.json();
            if (Array.isArray(rawPronostics)) {
                if (rawPronostics[0]?.pronostics) {
                    if (Array.isArray(rawPronostics[0].pronostics) && 
                        rawPronostics[0].pronostics[0]?.pronostics) {
                        allData.pronostics = { pronostics: rawPronostics[0].pronostics[0].pronostics };
                    } else {
                        allData.pronostics = { pronostics: rawPronostics[0].pronostics };
                    }
                } else {
                    allData.pronostics = { pronostics: rawPronostics };
                }
            } else {
                allData.pronostics = rawPronostics.pronostics ? rawPronostics : { pronostics: [] };
            }
        } else {
            allData.pronostics = { pronostics: [] };
        }
        
        // Parser résultats
        if (resultatsRes && resultatsRes.ok) {
            const rawResultats = await resultatsRes.json();
            if (Array.isArray(rawResultats)) {
                allData.resultats = rawResultats[0]?.courses ? rawResultats[0] : { courses: rawResultats };
            } else {
                allData.resultats = rawResultats.courses ? rawResultats : { courses: [] };
            }
        } else {
            allData.resultats = { courses: [] };
        }

        // Parser courses et programme
        if (coursesRes && coursesRes.ok) allData.courses = await coursesRes.json();
        if (programmeRes && programmeRes.ok) allData.programme = await programmeRes.json();
        
        // ✅ ENRICHIR les pronostics avec les données des courses
        enrichirPronosticsAvecCourses();
        
        // Charger et afficher l'historique
        const statsHistorique = await chargerHistorique();
        afficherHistorique(statsHistorique);
        
        updateAllSections();
        showLoadingState(false);
        
    } catch (error) {
        console.error('❌ Erreur:', error);
        showError('Erreur lors du chargement. Veuillez réessayer.');
        showLoadingState(false);
    }
}

// ✅ NOUVELLE FONCTION : Enrichir les pronostics avec les données des courses
function enrichirPronosticsAvecCourses() {
    try {
        if (!allData.pronostics?.pronostics) {
            console.log('⚠️ Pas de pronostics à enrichir');
            return;
        }
        
        console.log('🔄 Enrichissement des pronostics avec les données des courses...');
        console.log('📊 Nombre de pronostics:', allData.pronostics.pronostics.length);
        
        let enriched = 0;
        
        allData.pronostics.pronostics.forEach((prono, index) => {
            try {
                // Récupérer les infos de la course
                const courseInfo = getCourseInfoFromCoursesFile(prono.reunion, prono.course);
                
                // Enrichir le pronostic seulement si les données sont valides
                if (courseInfo.heure && courseInfo.heure !== '--:--') {
                    prono.heure = courseInfo.heure;
                    prono.discipline = courseInfo.discipline;
                    prono.statut = courseInfo.statut;
                    prono.distance = courseInfo.distance;
                    prono.libelleCourse = courseInfo.libelle;
                    
                    if (courseInfo.hippodrome) {
                        prono.hippodrome = courseInfo.hippodrome;
                    }
                    
                    enriched++;
                }
                
                // Récupérer les cotes
                const cotes = getCotesFromCoursesFile(prono.reunion, prono.course);
                
                // Mettre à jour les cotes des chevaux
                if (prono.classement && Object.keys(cotes).length > 0) {
                    prono.classement.forEach(cheval => {
                        if (cotes[cheval.numero]) {
                            cheval.cote = cotes[cheval.numero].toFixed(1);
                        }
                    });
                }
            } catch (err) {
                console.warn(`⚠️ Erreur lors de l'enrichissement du pronostic ${index}:`, err);
            }
        });
        
        console.log(`✅ Enrichissement terminé: ${enriched}/${allData.pronostics.pronostics.length} pronostics enrichis`);
    } catch (error) {
        console.error('❌ Erreur dans enrichirPronosticsAvecCourses:', error);
    }
}

function updateAllSections() {
    updateStatistiquesGlobales();
    updateTableauHistorique();
    updateCoursesParReunion();
    updateTableauComparaison();
    setupFilters();
}

function getDateString(date = new Date()) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}${month}${year}`;
}

function displayDateToDDMMYYYY(displayDate) {
    const parts = displayDate.split('/');
    return parts.length === 3 ? parts[0] + parts[1] + parts[2] : null;
}

function ddmmyyyyToDisplay(ddmmyyyy) {
    return ddmmyyyy.length === 8 ? `${ddmmyyyy.slice(0,2)}/${ddmmyyyy.slice(2,4)}/${ddmmyyyy.slice(4,8)}` : ddmmyyyy;
}

function getHippodromeName(pays, reunion) {
    return HIPPODROMES_PAR_PAYS[pays]?.[reunion]?.nom || HIPPODROMES[`R${reunion}`]?.nom || `Réunion ${reunion}`;
}

function getDisciplineInfo(disciplineName) {
    const cleanName = disciplineName ? disciplineName.toUpperCase().trim() : '';
    return DISCIPLINES[cleanName] || { label: disciplineName || 'Inconnu', icon: '❓', color: '#999' };
}

function updateStatistiquesGlobales() {
    if (!allData.pronostics?.pronostics) return;

    const pronostics = allData.pronostics.pronostics;
    const resultats = allData.resultats?.courses || [];
    
    let nbGagnants = 0, nbPlaces = 0, nbRates = 0, sommeConfiance = 0;
    let coursesAvecResultats = 0;

    pronostics.forEach(prono => {
        sommeConfiance += prono.scoreConfiance || 0;
        const resultat = resultats.find(r => r.reunion === prono.reunion && r.course === prono.course);

        if (resultat?.arrivee?.length > 0) {
            coursesAvecResultats++;
            const chevalPronostique = prono.classement?.[0]?.numero;
            
            if (chevalPronostique === resultat.arrivee[0]) {
                nbGagnants++;
                nbPlaces++;
            } else if (resultat.arrivee.slice(0, 3).includes(chevalPronostique)) {
                nbPlaces++;
            } else {
                nbRates++;
            }
        }
    });

    const tauxGagnant = coursesAvecResultats > 0 ? ((nbGagnants / coursesAvecResultats) * 100).toFixed(1) : '0.0';
    const tauxPlace = coursesAvecResultats > 0 ? ((nbPlaces / coursesAvecResultats) * 100).toFixed(0) : '0';
    const confianceMoyenne = pronostics.length > 0 ? (sommeConfiance / pronostics.length).toFixed(0) : '0';

    // Vérifier que les éléments existent avant de les modifier
    const elTauxGagnant = document.getElementById('taux-gagnant');
    const elTauxPlace = document.getElementById('taux-place');
    const elConfianceMoyenne = document.getElementById('confiance-moyenne');
    const elJoursAnalyses = document.getElementById('jours-analyses');
    
    if (elTauxGagnant) elTauxGagnant.textContent = tauxGagnant + '%';
    if (elTauxPlace) elTauxPlace.textContent = tauxPlace + '%';
    if (elConfianceMoyenne) elConfianceMoyenne.textContent = confianceMoyenne + '%';
    if (elJoursAnalyses) elJoursAnalyses.textContent = coursesAvecResultats + '/' + pronostics.length;
}

async function chargerHistorique() {
    if (!allData.analyse?.historique?.length) return [];
    return allData.analyse.historique.slice(0, 7).reverse();
}

function afficherHistorique(statsHistorique) {
    const canvas = document.getElementById('performanceChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const labels = statsHistorique.map(j => j.date || 'N/A');
    const gagnants = statsHistorique.map(j => j.taux_gagnant || 0);
    const places = statsHistorique.map(j => j.taux_place || 0);

    if (performanceChart) performanceChart.destroy();

    performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Taux gagnant', data: gagnants, borderColor: '#4CAF50', backgroundColor: 'rgba(76, 175, 80, 0.1)', tension: 0.4 },
                { label: 'Taux placé', data: places, borderColor: '#2196F3', backgroundColor: 'rgba(33, 150, 243, 0.1)', tension: 0.4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, max: 100, ticks: { callback: val => val + '%' } }
            }
        }
    });
}

function updateTableauHistorique() {
    const tbody = document.getElementById('historique-body');
    if (!tbody || !allData.analyse?.historique?.length) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Aucune donnée historique</td></tr>';
        return;
    }

    let html = '';
    allData.analyse.historique.forEach(jour => {
        const tauxGagnant = jour.taux_gagnant?.toFixed(1) || '0.0';
        const tauxPlace = jour.taux_place || 0;
        const confiance = jour.confiance_moyenne || 0;

        const badgeGagnant = tauxGagnant >= 20 ? 'bg-success' : tauxGagnant >= 10 ? 'bg-warning' : 'bg-secondary';
        const badgePlace = tauxPlace >= 50 ? 'bg-success' : tauxPlace >= 30 ? 'bg-warning' : 'bg-secondary';

        html += `
            <tr>
                <td><strong>${jour.date}</strong></td>
                <td>${jour.total_courses || 0}</td>
                <td><span class="badge ${badgeGagnant}">${tauxGagnant}%</span></td>
                <td><span class="badge ${badgePlace}">${tauxPlace}%</span></td>
                <td><span class="badge bg-info">${confiance}%</span></td>
                <td>${jour.nb_gagnants || 0}</td>
                <td>${jour.nb_places || 0}</td>
                <td>${jour.nb_rates || 0}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function updateCoursesParReunion() {
    if (!allData.pronostics?.pronostics) return;

    const pronostics = allData.pronostics.pronostics;
    const reunions = {};
    
    pronostics.forEach(prono => {
        const key = `${prono.pays || 'FRA'}-R${prono.reunion}`;
        if (!reunions[key]) {
            reunions[key] = {
                pays: prono.pays || 'FRA',
                reunion: prono.reunion,
                hippodrome: prono.hippodrome || getHippodromeName(prono.pays || 'FRA', prono.reunion),
                courses: []
            };
        }
        reunions[key].courses.push(prono);
    });

    const tabsContainer = document.getElementById('reunions-tabs');
    const contentContainer = document.getElementById('reunions-content');
    if (!tabsContainer || !contentContainer) return;

    let tabsHtml = '';
    let contentHtml = '';
    
    Object.keys(reunions).forEach((key, index) => {
        const reunion = reunions[key];
        const isActive = index === 0 ? 'active' : '';
        const showActive = index === 0 ? 'show active' : '';
        
        tabsHtml += `
            <li class="nav-item">
                <button class="nav-link ${isActive}" id="tab-${key}" data-bs-toggle="tab" 
                        data-bs-target="#content-${key}" type="button">
                    <i class="bi bi-geo-alt-fill"></i> ${reunion.hippodrome}
                    <span class="badge bg-primary ms-2">${reunion.courses.length}</span>
                </button>
            </li>
        `;
        
        contentHtml += `
            <div class="tab-pane fade ${showActive}" id="content-${key}">
                ${renderCoursesForReunion(reunion)}
            </div>
        `;
    });

    tabsContainer.innerHTML = tabsHtml;
    contentContainer.innerHTML = contentHtml;
}

// ✅ FONCTION CORRIGÉE : Maintenant utilise les données enrichies
function renderCoursesForReunion(reunion) {
    let html = '';
    
    reunion.courses.forEach(prono => {
        // Les données sont déjà enrichies dans le pronostic
        const heure = prono.heure || '--:--';
        const discipline = prono.discipline || 'Inconnue';
        const hippodrome = prono.hippodrome || reunion.hippodrome;
        const statut = prono.statut || 'INCONNU';
        
        const disciplineInfo = getDisciplineInfo(discipline);

        let statutBadge = '<span class="statut-badge statut-attente"><i class="bi bi-clock"></i> En attente</span>';
        
        // Personnaliser le badge selon le statut
        if (statut === 'TERMINÉ') {
            statutBadge = '<span class="statut-badge statut-termine"><i class="bi bi-check-circle-fill"></i> Terminé</span>';
        } else if (statut === 'EN COURS') {
            statutBadge = '<span class="statut-badge statut-encours"><i class="bi bi-play-circle-fill"></i> En cours</span>';
        } else if (statut === 'OUVERT') {
            statutBadge = '<span class="statut-badge statut-ouvert"><i class="bi bi-unlock-fill"></i> Ouvert</span>';
        }
        
        let resultatHtml = '';

        if (allData.resultats?.courses) {
            const resultat = allData.resultats.courses.find(r => r.reunion === prono.reunion && r.course === prono.course);
            const chevalPronostique = prono.classement?.[0]?.numero;

            if (resultat?.arrivee?.length > 0) {
                if (chevalPronostique === resultat.arrivee[0]) {
                    statutBadge = '<span class="statut-badge statut-gagnant"><i class="bi bi-trophy-fill"></i> Gagnant</span>';
                } else if (resultat.arrivee.slice(0, 3).includes(chevalPronostique)) {
                    statutBadge = '<span class="statut-badge statut-place"><i class="bi bi-award-fill"></i> Placé</span>';
                } else {
                    statutBadge = '<span class="statut-badge statut-rate"><i class="bi bi-x-circle-fill"></i> Raté</span>';
                }

                resultatHtml = '<div class="mt-3"><h6 class="fw-bold">Arrivée officielle:</h6><div class="d-flex gap-2 flex-wrap">';
                resultat.arrivee.slice(0, 5).forEach((numero, index) => {
                    const badgeClass = ['resultat-1er', 'resultat-2er', 'resultat-3er', 'resultat-autres'][Math.min(index, 3)];
                    resultatHtml += `<span class="resultat-badge ${badgeClass}">${index + 1}er: <strong>#${numero}</strong></span>`;
                });
                resultatHtml += '</div></div>';
            }
        }

        html += `
            <div class="course-card">
                <div class="course-header">
                    <div class="hippodrome-info position-relative">
                        <div class="hippodrome-badge"><i class="bi bi-flag-fill"></i> ${hippodrome}</div>
                        <div class="time-badge"><i class="bi bi-clock-fill"></i> ${heure}</div>
                        <span class="discipline-badge discipline-${disciplineInfo.type}">${disciplineInfo.icon} ${disciplineInfo.label}</span>
                        <div class="ms-auto">${statutBadge}</div>
                    </div>
                    <div class="mt-2">
                        <h5 class="mb-0">Course ${prono.course}</h5>
                        ${prono.libelleCourse ? `<small class="text-muted">${prono.libelleCourse}</small>` : ''}
                        ${prono.distance ? `<small class="text-muted ms-2">${prono.distance}m</small>` : ''}
                    </div>
                </div>
                <div class="card-body">
                    <h6 class="fw-bold mb-3">Pronostic IA:</h6>
                    ${renderPronosticsTop3(prono)}
                    ${resultatHtml}
                </div>
            </div>
        `;
    });

    return html;
}

function renderPronosticsTop3(prono) {
    if (!prono.classement?.length) return '<p class="text-muted">Aucun pronostic</p>';

    return prono.classement.slice(0, 3).map((cheval, index) => {
        const positionClass = ['position-1', 'position-2', 'position-3'][index];
        return `
            <div class="pronostic-item">
                <div class="d-flex align-items-center gap-3">
                    <div class="position-badge ${positionClass}">${index + 1}</div>
                    <div class="cheval-info">
                        <div class="cheval-nom">${cheval.nom || 'N/A'}</div>
                        <div class="cheval-numero">Numéro ${cheval.numero}</div>
                    </div>
                    <div class="ms-auto">
                        <span class="cote-badge"><i class="bi bi-currency-euro"></i> ${cheval.cote || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateTableauComparaison() {
    const tbody = document.getElementById('comparaison-body');
    if (!tbody || !allData.pronostics?.pronostics?.length) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">Aucun pronostic</td></tr>';
        return;
    }

    let html = '';
    allData.pronostics.pronostics.forEach(prono => {
        const hippodrome = prono.hippodrome || getHippodromeName(prono.pays, prono.reunion);
        const cheval = prono.classement?.[0];
        
        let resultatReel = '<span class="badge bg-secondary">En attente</span>';
        let statut = '<span class="badge bg-secondary">En attente</span>';

        const resultat = allData.resultats?.courses?.find(r => r.reunion === prono.reunion && r.course === prono.course);
        if (resultat?.arrivee?.length) {
            const position = resultat.arrivee.indexOf(cheval?.numero) + 1;
            if (position > 0) {
                const posClass = ['position-1', 'position-2', 'position-3', 'position-other'][Math.min(position - 1, 3)];
                resultatReel = `<span class="position-badge ${posClass}" style="width:auto;height:auto;padding:5px 10px;">${position}${position===1?'er':'e'}</span>`;
                
                if (position === 1) statut = '<span class="badge" style="background:var(--success-gradient);">✅ Gagnant</span>';
                else if (position <= 3) statut = '<span class="badge" style="background:var(--warning-gradient);">🥉 Placé</span>';
                else statut = '<span class="badge bg-secondary">❌ Raté</span>';
            } else {
                resultatReel = '<span class="badge bg-dark">Non classé</span>';
                statut = '<span class="badge bg-secondary">❌ Raté</span>';
            }
        }

        html += `
            <tr>
                <td><strong>${hippodrome}</strong></td>
                <td>${prono.heure || '--:--'}</td>
                <td><span class="badge bg-primary">R${prono.reunion}C${prono.course}</span></td>
                <td>${cheval ? `<strong>#${cheval.numero}</strong> - ${cheval.nom}` : 'N/A'}</td>
                <td>${cheval?.cote || 'N/A'}</td>
                <td><span class="badge bg-info">${prono.scoreConfiance || 0}%</span></td>
                <td><span class="position-badge position-1" style="width:auto;height:auto;padding:5px 10px;">1er</span></td>
                <td>${resultatReel}</td>
                <td>${statut}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function setupFilters() {
    const filterReunion = document.getElementById('filter-reunion');
    if (filterReunion && allData.pronostics?.pronostics) {
        const reunions = [...new Set(allData.pronostics.pronostics.map(p => `${p.pays}-R${p.reunion}`))];
        filterReunion.innerHTML = '<option value="">Toutes les réunions</option>';
        reunions.forEach(r => {
            const parts = r.split('-R');
            const hippodrome = getHippodromeName(parts[0], parseInt(parts[1]));
            filterReunion.innerHTML += `<option value="${r}">${hippodrome}</option>`;
        });
    }

    ['filter-reunion', 'filter-confiance', 'filter-statut'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', applyFilters);
    });
}

function applyFilters() {
    const filterReunion = document.getElementById('filter-reunion')?.value || '';
    const filterConfiance = document.getElementById('filter-confiance')?.value || '';
    const filterStatut = document.getElementById('filter-statut')?.value || '';

    document.querySelectorAll('#comparaison-body tr').forEach(row => {
        let show = true;
        
        if (filterReunion && !row.cells[0]?.textContent.includes(filterReunion.replace(/.*-R/, 'R'))) show = false;
        if (filterConfiance && show) {
            const confiance = parseInt(row.cells[5]?.textContent.replace('%', '') || '0');
            if (confiance <= parseInt(filterConfiance)) show = false;
        }
        if (filterStatut && show && !row.cells[8]?.textContent.toLowerCase().includes(filterStatut)) show = false;
        
        row.style.display = show ? '' : 'none';
    });
}

function showError(message) {
    ['historique-body', 'comparaison-body'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<tr><td colspan="9" class="text-center text-danger">${message}</td></tr>`;
    });
}

const exportBtn = document.getElementById('export-csv');
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        if (!allData.pronostics?.pronostics) return alert('Aucune donnée à exporter');

        let csv = 'Hippodrome,Heure,Course,Cheval,Cote,Confiance,Position,Résultat,Statut\n';
        
        allData.pronostics.pronostics.forEach(prono => {
            let resultatReel = 'En attente', statut = 'En attente';
            const resultat = allData.resultats?.courses?.find(r => r.reunion === prono.reunion && r.course === prono.course);
            const cheval = prono.classement?.[0];

            if (resultat?.arrivee?.length) {
                resultatReel = `#${resultat.arrivee[0]}`;
                if (cheval?.numero === resultat.arrivee[0]) statut = 'Gagnant';
                else if (resultat.arrivee.slice(0, 3).includes(cheval?.numero)) statut = 'Placé';
                else statut = 'Raté';
            }

            const chevalInfo = cheval ? `#${cheval.numero} - ${cheval.nom}` : 'N/A';
            csv += `"${prono.hippodrome || prono.reunion}","${prono.heure || '--:--'}","${prono.reunion}${prono.course}","${chevalInfo}",${cheval?.cote || 'N/A'},${prono.scoreConfiance || 0}%,1er,"${resultatReel}","${statut}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pronostics-pmu-${getDateString()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    });
}

function populateDateSelector() {
    const selector = document.getElementById('date-selector');
    if (!selector || !allData.analyse?.historique) return;
    
    const currentValue = selector.value || currentDateString;
    selector.innerHTML = '';
    
    const todayDDMMYYYY = getDateString();
    const todayOption = document.createElement('option');
    todayOption.value = todayDDMMYYYY;
    todayOption.textContent = `Aujourd'hui (${ddmmyyyyToDisplay(todayDDMMYYYY)})`;
    selector.appendChild(todayOption);

    allData.analyse.historique.forEach(jour => {
        const dateDDMMYYYY = displayDateToDDMMYYYY(jour.date);
        if (dateDDMMYYYY !== todayDDMMYYYY) {
            const option = document.createElement('option');
            option.value = dateDDMMYYYY;
            option.textContent = jour.date;
            selector.appendChild(option);
        }
    });
    
    selector.value = currentValue;
}

function showLoadingState(isLoading) {
    const spinners = { 'historique-body': 8, 'reunions-content': 1, 'comparaison-body': 9 };

    Object.keys(spinners).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = isLoading 
                ? `<tr><td colspan="${spinners[id]}" class="text-center"><div class="spinner-border text-primary" role="status"></div></td></tr>`
                : '';
        }
    });
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    const todayDate = getDateString();
    loadAllData(todayDate);

    const dateSelector = document.getElementById('date-selector');
    if (dateSelector) {
        dateSelector.addEventListener('change', (e) => {
            if (e.target.value) loadAllData(e.target.value);
        });
    }

    setInterval(() => {
        const selectedDate = document.getElementById('date-selector')?.value || getDateString();
        loadAllData(selectedDate);
    }, CONFIG.REFRESH_INTERVAL);
});
