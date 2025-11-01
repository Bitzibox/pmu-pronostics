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
        // ✅ Les fichiers sont dans /data/
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

    // Extraire les réunions uniques
    const reunions = [...new Set(coursesData[0].reunions.map(r => `${r.hippodrome} (R${r.num})`))];
    console.log('Réunions trouvées:', reunions.length);
    console.log('Pronostics trouvés:', pronosticsData[0].pronostics.length);
    console.log('Résultats trouvés:', resultatsData[0].courses.length);

    // Afficher les réunions (onglets)
    displayReunions(coursesData[0].reunions);

    // Créer un map des résultats pour un accès rapide
    const resultatsMap = {};
    resultatsData[0].courses.forEach(course => {
        const key = `${course.reunion}${course.course}`;
        resultatsMap[key] = course;
    });

    console.log('Map des résultats créée:', Object.keys(resultatsMap).length, 'entrées');

    // Afficher le tableau de comparaison
    displayComparaison(pronosticsData[0].pronostics, resultatsMap);

    // Calculer les statistiques
    calculateStats(pronosticsData[0].pronostics, resultatsMap);
}

// Afficher les réunions
function displayReunions(reunions) {
    const tabsList = document.getElementById('reunions-tabs');
    const tabsContent = document.getElementById('reunions-content');

    reunions.forEach((reunion, index) => {
        // Créer l'onglet
        const tabId = `reunion-${reunion.num}`;
        const tab = document.createElement('li');
        tab.className = 'nav-item';
        tab.innerHTML = `
            <button class="nav-link ${index === 0 ? 'active' : ''}" 
                    id="${tabId}-tab" 
                    data-bs-toggle="tab" 
                    data-bs-target="#${tabId}" 
                    type="button">
                ${reunion.hippodrome} (R${reunion.num})
            </button>
        `;
        tabsList.appendChild(tab);

        // Créer le contenu
        const content = document.createElement('div');
        content.className = `tab-pane fade ${index === 0 ? 'show active' : ''}`;
        content.id = tabId;
        content.innerHTML = '<p class="mt-3">Aucune course disponible pour cette réunion.</p>';
        tabsContent.appendChild(content);
    });
}

// Afficher la comparaison
function displayComparaison(pronostics, resultatsMap) {
    const tbody = document.getElementById('comparaison-body');
    tbody.innerHTML = '';

    console.log('Affichage comparaison:', pronostics.length, 'pronostics');

    pronostics.forEach(prono => {
        // Le pronostic a le format: { courseId: "R1C1", classement: [...] }
        const courseKey = prono.courseId; // "R1C1"
        const resultat = resultatsMap[courseKey];

        console.log(`Prono ${courseKey}:`, resultat ? 'résultat trouvé' : 'pas de résultat');

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
    document.getElementById('roi-theorique').textContent = '0.00€'; // À calculer plus tard

    console.log('Stats:', { totalCourses, gagnants, places, tauxGagnant, tauxPlace });
}

// Lancer l'affichage au chargement
document.addEventListener('DOMContentLoaded', displayData);
