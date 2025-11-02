// Configuration
const BASE_URL = 'https://bitzibox.github.io/pmu-pronostics';
const today = new Date();
const dateStr = formatDate(today);

// Fonction pour formater la date en DDMMYYYY
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}${month}${year}`;
}

console.log('Date actuelle:', dateStr);

// Charger les données
async function loadData() {
    try {
        const [coursesData, pronosticsData, resultatsData] = await Promise.all([
            fetch(`${BASE_URL}/data/courses-${dateStr}.json`).then(r => r.json()),
            fetch(`${BASE_URL}/data/pronostics-${dateStr}.json`).then(r => r.json()),
            fetch(`${BASE_URL}/data/resultats-${dateStr}.json`).then(r => r.json())
        ]);

        console.log('Données courses:', coursesData);
        console.log('Données pronostics:', pronosticsData);
        console.log('Données résultats:', resultatsData);

        return { coursesData, pronosticsData, resultatsData };
    } catch (error) {
        console.error('Erreur chargement:', error);
        return null;
    }
}

// Afficher les données
async function displayData() {
    const data = await loadData();
    if (!data) return;

    const { coursesData, pronosticsData, resultatsData } = data;

    const reunions = coursesData[0].programme.reunions;
    
    console.log('Réunions trouvées:', reunions.length);
    console.log('Pronostics trouvés:', pronosticsData[0].pronostics.length);
    console.log('Résultats trouvés:', resultatsData[0].courses.length);

    // Créer des maps pour un accès rapide
    const resultatsMap = {};
    resultatsData[0].courses.forEach(course => {
        const key = `${course.reunion}${course.course}`;
        resultatsMap[key] = course;
    });

    const pronosticsMap = {};
    pronosticsData[0].pronostics.forEach(prono => {
        pronosticsMap[prono.courseId] = prono;
    });

    console.log('Map des résultats créée:', Object.keys(resultatsMap).length, 'entrées');
    console.log('Map des pronostics créée:', Object.keys(pronosticsMap).length, 'entrées');

    // Afficher les réunions avec pronostics
    displayReunions(reunions, pronosticsMap, resultatsMap);

    // Afficher le tableau de comparaison global
    displayComparaison(pronosticsData[0].pronostics, resultatsMap);

    // Calculer les statistiques
    calculateStats(pronosticsData[0].pronostics, resultatsMap);
}

// Afficher les réunions avec pronostics et résultats
function displayReunions(reunions, pronosticsMap, resultatsMap) {
    const tabsList = document.getElementById('reunions-tabs');
    const tabsContent = document.getElementById('reunions-content');

    reunions.forEach((reunion, index) => {
        const tabId = `reunion-${reunion.numOfficiel}`;
        
        // Créer l'onglet
        const tab = document.createElement('li');
        tab.className = 'nav-item';
        tab.innerHTML = `
            <button class="nav-link ${index === 0 ? 'active' : ''}" 
                    id="${tabId}-tab" 
                    data-bs-toggle="tab" 
                    data-bs-target="#${tabId}" 
                    type="button"
                    role="tab"
                    aria-controls="${tabId}"
                    aria-selected="${index === 0 ? 'true' : 'false'}">
                ${reunion.hippodrome.libelleCourt} (R${reunion.numOfficiel})
            </button>
        `;
        tabsList.appendChild(tab);

        // Créer le contenu avec les courses + pronostics
        const content = document.createElement('div');
        content.className = `tab-pane fade ${index === 0 ? 'show active' : ''}`;
        content.id = tabId;
        content.setAttribute('role', 'tabpanel');
        content.setAttribute('aria-labelledby', `${tabId}-tab`);
        
        // Générer le contenu
        let html = '<div class="mt-3">';
        
        reunion.courses.forEach(course => {
            const courseId = `R${reunion.numOfficiel}C${course.numOrdre}`;
            const prono = pronosticsMap[courseId];
            const resultat = resultatsMap[courseId];
            const heure = new Date(course.heureDepart).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            
            // Détecter si c'est une course française
            const isFrench = reunion.pays.code === 'FRA';
            const badgePays = isFrench ? 
                '<span class="badge bg-light text-dark ms-2">🇫🇷 France</span>' : 
                '<span class="badge bg-secondary ms-2">🌍 International</span>';
            
            html += `
                <div class="card mb-3 ${!isFrench ? 'course-international' : 'course-french'}">
                    <div class="card-header ${isFrench ? 'bg-primary' : 'bg-secondary'} text-white">
                        <div class="row align-items-center">
                            <div class="col-md-2"><strong>${heure}</strong></div>
                            <div class="col-md-5"><strong>C${course.numOrdre}</strong> - ${course.libelleCourt}</div>
                            <div class="col-md-2">${course.distance}m</div>
                            <div class="col-md-1">${course.nombreDeclaresPartants} partants</div>
                            <div class="col-md-2">${badgePays}</div>
                        </div>
                    </div>
                    <div class="card-body">
            `;
            
            if (prono) {
                // Afficher les pronostics
                html += `
                    <h6>🎯 Pronostics (Confiance: ${prono.scoreConfiance}%)</h6>
                    <table class="table table-sm table-striped mb-3">
                        <thead>
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
                
                prono.classement.slice(0, 5).forEach((cheval, idx) => {
                    let statutBadge = '<span class="badge bg-secondary">En attente</span>';
                    let placeReelle = '-';
                    
                    if (resultat && resultat.arrivee && resultat.arrivee.length > 0) {
                        // Trouver la place réelle du cheval dans l'arrivée
                        const position = resultat.arrivee.indexOf(cheval.numero);
                        
                        if (position !== -1) {
                            // Le cheval est dans l'arrivée
                            placeReelle = `${position + 1}${position === 0 ? 'er' : 'e'}`;
                            
                            if (position === 0 && idx === 0) {
                                statutBadge = '<span class="badge bg-success">✅ Gagnant !</span>';
                            } else if (position === 0) {
                                statutBadge = '<span class="badge bg-warning">🎯 Trouvé</span>';
                            } else if (position <= 2) {
                                statutBadge = '<span class="badge bg-info">📍 Placé</span>';
                            } else {
                                statutBadge = '<span class="badge bg-danger">❌ Hors places</span>';
                            }
                        } else {
                            // Le cheval n'est pas dans l'arrivée (top positions seulement)
                            placeReelle = 'Non classé';
                            statutBadge = '<span class="badge bg-danger">❌ Perdu</span>';
                        }
                    }
                    
                    html += `
                        <tr>
                            <td><strong>${idx + 1}er</strong></td>
                            <td>n°${cheval.numero} - ${cheval.nom || 'N/A'}</td>
                            <td>${cheval.cote || 'N/A'}</td>
                            <td>${cheval.jockey || 'N/A'}</td>
                            <td><strong>${placeReelle}</strong></td>
                            <td>${statutBadge}</td>
                        </tr>
                    `;
                });
                
                html += `
                        </tbody>
                    </table>
                    <p class="text-muted small"><em>💡 ${prono.commentaire}</em></p>
                `;
            } else {
                html += '<p class="text-muted">Aucun pronostic disponible pour cette course.</p>';
            }
            
            html += `
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        content.innerHTML = html;
        tabsContent.appendChild(content);
    });
}

// Afficher la comparaison globale
function displayComparaison(pronostics, resultatsMap) {
    const tbody = document.getElementById('comparaison-body');
    tbody.innerHTML = '';

    console.log('Affichage comparaison:', pronostics.length, 'pronostics');

    pronostics.forEach(prono => {
        const courseKey = prono.courseId;
        const resultat = resultatsMap[courseKey];

        console.log(`Prono ${courseKey}:`, resultat ? `résultat trouvé (arrivee: ${resultat.arrivee})` : 'pas de résultat');

        // Afficher les 5 premiers chevaux pronostiqués
        prono.classement.slice(0, 5).forEach((cheval, index) => {
            let statut = 'En attente';
            let statutClass = 'bg-secondary';
            let resultatReel = 'En attente';

            if (resultat && resultat.arrivee && resultat.arrivee.length > 0) {
                const gagnant = resultat.arrivee[0];
                
                if (cheval.numero === gagnant && index === 0) {
                    statut = '✅ Gagnant !';
                    statutClass = 'bg-success';
                    resultatReel = `1er (n°${gagnant})`;
                } else if (cheval.numero === gagnant) {
                    statut = '🎯 Trouvé (mauvaise position)';
                    statutClass = 'bg-warning';
                    resultatReel = `1er (n°${gagnant})`;
                } else {
                    statut = '❌ Perdu';
                    statutClass = 'bg-danger';
                    resultatReel = `1er: n°${gagnant}`;
                }
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${prono.courseId}</td>
                <td>n°${cheval.numero} - ${cheval.nom || 'N/A'}</td>
                <td>${cheval.cote || 'N/A'}</td>
                <td>${index + 1}er</td>
                <td>${resultatReel}</td>
                <td><span class="badge ${statutClass}">${statut}</span></td>
            `;
            tbody.appendChild(row);
        });
    });
}

// Calculer les statistiques
function calculateStats(pronostics, resultatsMap) {
    let totalCourses = 0;
    let gagnants = 0;
    let places = 0;

    pronostics.forEach(prono => {
        const resultat = resultatsMap[prono.courseId];
        
        if (resultat && resultat.arrivee && resultat.arrivee.length > 0) {
            totalCourses++;
            const gagnant = resultat.arrivee[0];
            const premier = prono.classement[0];

            if (premier && premier.numero === gagnant) {
                gagnants++;
                places++;
            } else {
                // Vérifier si le gagnant est dans le top 3
                const top3 = prono.classement.slice(0, 3);
                if (top3.some(c => c.numero === gagnant)) {
                    places++;
                }
            }
        }
    });

    // Afficher les stats
    const tauxGagnant = totalCourses > 0 ? ((gagnants / totalCourses) * 100).toFixed(1) : 0;
    const tauxPlace = totalCourses > 0 ? ((places / totalCourses) * 100).toFixed(1) : 0;

    document.getElementById('taux-gagnant').textContent = `${tauxGagnant}%`;
    document.getElementById('taux-place').textContent = `${tauxPlace}%`;
    document.getElementById('courses-analysees').textContent = totalCourses;
    document.getElementById('roi-theorique').textContent = '0.00€';

    console.log('Stats:', { totalCourses, gagnants, places, tauxGagnant, tauxPlace });
}

// Lancer l'affichage au chargement
document.addEventListener('DOMContentLoaded', displayData);
