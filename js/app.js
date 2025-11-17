// Configuration GitHub
const GITHUB_USERNAME = 'Bitzibox';
const REPO_NAME = 'pmu-pronostics';
const BRANCH = 'main';
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH}/data/`;
const CONFIG = {
    REFRESH_INTERVAL: 300000, // 5 minutes
    DATE_FORMAT: 'DD/MM/YYYY',
    CACHE_TTL: 3600000, // 1 heure pour le cache
    HISTORIQUE_CACHE_TTL: 86400000 // 24 heures pour l'historique
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
let historiqueCalcule = null; // ✅ Stocker l'historique calculé en temps réel
let allData = { analyse: null, pronostics: null, resultats: null, courses: null, programme: null };
let currentDateString = '';
let lastUpdateTime = Date.now();

// === FONCTIONS D'ERGONOMIE ET ANIMATIONS ===

/**
 * Animation count-up pour les chiffres
 * @param {HTMLElement} element - L'élément contenant le chiffre
 * @param {number} end - La valeur finale
 * @param {number} duration - Durée de l'animation en ms
 * @param {string} suffix - Suffixe (%, etc.)
 */
function animateCountUp(element, end, duration = 1000, suffix = '') {
    if (!element) return;

    const start = 0;
    const startTime = performance.now();
    const isFloat = end % 1 !== 0;

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = start + (end - start) * easeOut;

        element.textContent = isFloat
            ? current.toFixed(1) + suffix
            : Math.floor(current) + suffix;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = isFloat ? end.toFixed(1) + suffix : end + suffix;
        }
    }

    requestAnimationFrame(update);
}

/**
 * Détermine le badge de performance selon le taux
 * @param {number} rate - Taux en pourcentage
 * @param {string} type - Type de métrique (gagnant, place, confiance)
 * @returns {Object} Badge avec classe et texte
 */
function getPerformanceBadge(rate, type = 'gagnant') {
    const thresholds = {
        gagnant: { excellent: 40, good: 25, average: 15 },
        place: { excellent: 70, good: 50, average: 30 },
        confiance: { excellent: 80, good: 65, average: 50 }
    };

    const t = thresholds[type];

    if (rate >= t.excellent) {
        return { class: 'badge-excellent', text: '🏆 Excellent', icon: 'trophy-fill' };
    } else if (rate >= t.good) {
        return { class: 'badge-good', text: '✨ Très bon', icon: 'star-fill' };
    } else if (rate >= t.average) {
        return { class: 'badge-average', text: '👍 Correct', icon: 'hand-thumbs-up' };
    } else {
        return { class: 'badge-improve', text: '📈 À améliorer', icon: 'graph-up-arrow' };
    }
}

/**
 * Met à jour une barre de progression
 * @param {string} elementId - ID de l'élément
 * @param {number} percentage - Pourcentage (0-100)
 */
function updateProgressBar(elementId, percentage) {
    const element = document.getElementById(elementId);
    if (element) {
        setTimeout(() => {
            element.style.width = percentage + '%';
        }, 100);
    }
}

/**
 * Affiche une notification toast
 * @param {string} message - Message à afficher
 * @param {string} type - Type (success, info, warning)
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;

    const icons = {
        success: 'check-circle-fill',
        info: 'info-circle-fill',
        warning: 'exclamation-triangle-fill'
    };

    toast.innerHTML = `
        <i class="bi bi-${icons[type]}" style="font-size: 1.5rem; color: ${type === 'success' ? '#38ef7d' : type === 'warning' ? '#f5576c' : '#667eea'}"></i>
        <div>
            <strong>${type === 'success' ? 'Succès' : type === 'warning' ? 'Attention' : 'Info'}</strong>
            <p style="margin:0; font-size: 0.9rem;">${message}</p>
        </div>
        <button onclick="this.parentElement.remove()" style="background:none; border:none; font-size:1.2rem; cursor:pointer; color:#999;">×</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

/**
 * Met à jour le temps de dernière mise à jour
 */
function updateLastUpdateTime() {
    const element = document.getElementById('last-update-time');
    if (!element) return;

    function update() {
        const elapsed = Math.floor((Date.now() - lastUpdateTime) / 1000);

        if (elapsed < 60) {
            element.textContent = 'Maintenant';
        } else if (elapsed < 3600) {
            const mins = Math.floor(elapsed / 60);
            element.textContent = `Il y a ${mins} min`;
        } else {
            const hours = Math.floor(elapsed / 3600);
            element.textContent = `Il y a ${hours}h`;
        }
    }

    update();
    setInterval(update, 30000); // Update every 30 seconds
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
        
        // Parser pronostics avec fonction utilitaire
        if (pronosticsRes && pronosticsRes.ok) {
            const rawPronostics = await pronosticsRes.json();
            const pronostics = parsePronosticsData(rawPronostics);
            allData.pronostics = { pronostics: pronostics };
        } else {
            allData.pronostics = { pronostics: [] };
        }

        // Parser résultats avec fonction utilitaire
        if (resultatsRes && resultatsRes.ok) {
            const rawResultats = await resultatsRes.json();
            const courses = parseResultatsData(rawResultats);
            allData.resultats = { courses: courses };
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
        
        await updateAllSections(); // ✅ Attendre la fin des calculs
        showLoadingState(false);
        
    } catch (error) {
        console.error('❌ Erreur:', error);
        showError('Erreur lors du chargement. Veuillez réessayer.');
        showLoadingState(false);
    }
}

async function updateAllSections() {
    updateStatistiquesGlobales();
    await updateStatistiquesHistoriques(); // ✅ Attendre le calcul
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

/**
 * Échappe les caractères HTML pour prévenir les attaques XSS
 * @param {string} text - Le texte à sécuriser
 * @returns {string} Le texte échappé
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Échappe les guillemets pour le format CSV
 * @param {string} text - Le texte à échapper
 * @returns {string} Le texte échappé pour CSV
 */
function escapeCsv(text) {
    if (text === null || text === undefined) return '';
    return String(text).replace(/"/g, '""');
}

/**
 * Raccourci pour document.getElementById
 * @param {string} id - L'ID de l'élément
 * @returns {HTMLElement|null} L'élément trouvé ou null
 */
function el(id) {
    return document.getElementById(id);
}

// ✅ FONCTIONS UTILITAIRES DE PARSING DE DONNÉES

/**
 * Parse les données de pronostics qui peuvent avoir différents formats imbriqués
 * @param {any} rawData - Les données brutes de l'API
 * @returns {Array} Tableau de pronostics normalisé
 */
function parsePronosticsData(rawData) {
    if (!rawData) return [];

    if (Array.isArray(rawData)) {
        if (rawData[0]?.pronostics) {
            if (Array.isArray(rawData[0].pronostics) && rawData[0].pronostics[0]?.pronostics) {
                return rawData[0].pronostics[0].pronostics;
            }
            return rawData[0].pronostics;
        }
        return rawData;
    }

    if (rawData.pronostics) {
        return Array.isArray(rawData.pronostics) ? rawData.pronostics : [];
    }

    return [];
}

/**
 * Parse les données de résultats qui peuvent avoir différents formats imbriqués
 * @param {any} rawData - Les données brutes de l'API
 * @returns {Array} Tableau de courses/résultats normalisé
 */
function parseResultatsData(rawData) {
    if (!rawData) return [];

    if (Array.isArray(rawData)) {
        return rawData[0]?.courses || rawData;
    }

    return rawData.courses || [];
}

// ✅ FONCTIONS DE CACHE LOCALSTORAGE

/**
 * Sauvegarde des données dans localStorage avec timestamp
 * @param {string} key - La clé de stockage
 * @param {any} data - Les données à stocker
 * @param {number} ttl - Time to live en millisecondes
 */
function cacheSet(key, data, ttl = CONFIG.CACHE_TTL) {
    try {
        const item = {
            data: data,
            timestamp: Date.now(),
            ttl: ttl
        };
        localStorage.setItem(key, JSON.stringify(item));
        console.log(`💾 Cache sauvegardé: ${key}`);
    } catch (error) {
        console.warn(`⚠️ Erreur de cache (set ${key}):`, error);
    }
}

/**
 * Récupère des données du localStorage si elles sont encore valides
 * @param {string} key - La clé de stockage
 * @returns {any|null} Les données ou null si expirées/inexistantes
 */
function cacheGet(key) {
    try {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;

        const item = JSON.parse(itemStr);
        const now = Date.now();

        // Vérifier si le cache est expiré
        if (now - item.timestamp > item.ttl) {
            console.log(`🗑️ Cache expiré: ${key}`);
            localStorage.removeItem(key);
            return null;
        }

        console.log(`✅ Cache valide: ${key}`);
        return item.data;
    } catch (error) {
        console.warn(`⚠️ Erreur de cache (get ${key}):`, error);
        return null;
    }
}

/**
 * Supprime une entrée du cache
 * @param {string} key - La clé à supprimer
 */
function cacheClear(key) {
    try {
        localStorage.removeItem(key);
        console.log(`🗑️ Cache supprimé: ${key}`);
    } catch (error) {
        console.warn(`⚠️ Erreur de cache (clear ${key}):`, error);
    }
}

// ✅ NOUVELLES FONCTIONS D'ENRICHISSEMENT

/**
 * Récupère les informations d'une réunion depuis le fichier courses
 * @param {string} reunion - Numéro de réunion (ex: "R1" ou "1")
 * @returns {Object} Informations de la réunion
 */
function getReunionInfoFromCoursesFile(reunion) {
    const info = {
        hippodrome: null,
        libelleLong: null,
        ville: null,
        pays: null
    };

    try {
        if (!allData.courses || !Array.isArray(allData.courses)) {
            return info;
        }

        const coursesData = allData.courses[0];
        if (!coursesData?.programme?.reunions) {
            return info;
        }

        const reunionNum = parseInt(reunion.toString().replace('R', ''));
        const reunionData = coursesData.programme.reunions.find(r => r.numOfficiel === reunionNum);

        if (reunionData) {
            if (reunionData.hippodrome?.libelleCourt) {
                info.hippodrome = reunionData.hippodrome.libelleCourt;
            }
            if (reunionData.hippodrome?.libelleLong) {
                info.libelleLong = reunionData.hippodrome.libelleLong;
                // Extraire la ville du libelleLong (ex: "HIPPODROME DU MANS" -> "Le Mans")
                const match = reunionData.hippodrome.libelleLong.match(/HIPPODROME (?:DE |DU |D')?(.+)/i);
                if (match) {
                    info.ville = match[1]
                        .split('-')
                        .map(part => part.charAt(0) + part.slice(1).toLowerCase())
                        .join('-');
                }
            }
            if (reunionData.pays?.code) {
                info.pays = reunionData.pays.code;
            }
        }
    } catch (error) {
        console.warn(`⚠️ Erreur getReunionInfo pour R${reunion}:`, error);
    }

    return info;
}

function getCourseInfoFromCoursesFile(reunion, course) {
    const info = {
        heure: '--:--',
        discipline: 'Inconnue',
        hippodrome: null,
        statut: 'INCONNU',
        distance: null,
        libelle: null,
        pays: null
    };

    try {
        if (!allData.courses || !Array.isArray(allData.courses)) {
            return info;
        }

        const coursesData = allData.courses[0];
        if (!coursesData?.programme?.reunions) {
            return info;
        }

        const reunionNum = parseInt(reunion.toString().replace('R', ''));
        const courseNum = parseInt(course.toString().replace('C', ''));

        const reunionData = coursesData.programme.reunions.find(r => r.numOfficiel === reunionNum);
        if (!reunionData) {
            return info;
        }

        if (reunionData.hippodrome?.libelleCourt) {
            info.hippodrome = reunionData.hippodrome.libelleCourt;
        }

        if (reunionData.pays?.code) {
            info.pays = reunionData.pays.code;
        }
        
        const courseData = reunionData.courses?.find(c => c.numOrdre === courseNum);
        if (courseData) {
            if (courseData.heureDepart) {
                const date = new Date(courseData.heureDepart);
                info.heure = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            }
            
            info.discipline = courseData.discipline || info.discipline;
            info.distance = courseData.distance;
            info.libelle = courseData.libelleCourt;
            
            if (courseData.arriveeDefinitive) {
                info.statut = 'TERMINÉ';
            } else if (courseData.departImminent) {
                info.statut = 'EN COURS';
            } else {
                info.statut = 'OUVERT';
            }
        }
    } catch (error) {
        console.warn(`⚠️ Erreur getCourseInfo pour R${reunion}C${course}:`, error);
    }
    
    return info;
}

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
        
        const reunionNum = parseInt(reunion.toString().replace('R', ''));
        const courseNum = parseInt(course.toString().replace('C', ''));
        
        const reunionData = coursesData.programme.reunions.find(r => r.numOfficiel === reunionNum);
        if (!reunionData) {
            return cotes;
        }
        
        const courseData = reunionData.courses?.find(c => c.numOrdre === courseNum);
        if (!courseData?.participants) {
            return cotes;
        }
        
        courseData.participants.forEach(participant => {
            if (participant.numPmu && participant.rapportDirect) {
                cotes[participant.numPmu] = parseFloat(participant.rapportDirect);
            }
        });
    } catch (error) {
        console.warn(`⚠️ Erreur getCotes pour R${reunion}C${course}:`, error);
    }
    
    return cotes;
}

function enrichirPronosticsAvecCourses() {
    try {
        if (!allData.pronostics?.pronostics) {
            console.log('⚠️ Pas de pronostics à enrichir');
            return;
        }
        
        console.log('🔄 Enrichissement des pronostics avec les données des courses...');
        console.log('📊 Nombre de pronostics:', allData.pronostics.pronostics.length);
        
        if (allData.courses && Array.isArray(allData.courses)) {
            const coursesData = allData.courses[0];
            if (coursesData?.programme?.reunions) {
                console.log('📋 Réunions disponibles dans courses:', 
                    coursesData.programme.reunions.map(r => `R${r.numOfficiel} (${r.courses?.length || 0} courses)`).join(', '));
            }
        }
        
        console.log('🔍 Premier pronostic:', {
            reunion: allData.pronostics.pronostics[0].reunion,
            course: allData.pronostics.pronostics[0].course,
            type_reunion: typeof allData.pronostics.pronostics[0].reunion,
            type_course: typeof allData.pronostics.pronostics[0].course
        });
        
        let enriched = 0;
        
        allData.pronostics.pronostics.forEach((prono, index) => {
            try {
                const courseInfo = getCourseInfoFromCoursesFile(prono.reunion, prono.course);
                
                if (index < 3) {
                    console.log(`🔍 Pronostic ${index} (R${prono.reunion}C${prono.course}):`, courseInfo);
                }
                
                if (courseInfo.heure && courseInfo.heure !== '--:--') {
                    prono.heure = courseInfo.heure;
                    prono.discipline = courseInfo.discipline;
                    prono.statut = courseInfo.statut;
                    prono.distance = courseInfo.distance;
                    prono.libelleCourse = courseInfo.libelle;

                    if (courseInfo.hippodrome) {
                        prono.hippodrome = courseInfo.hippodrome;
                    }

                    if (courseInfo.pays) {
                        prono.pays = courseInfo.pays;
                    }

                    enriched++;
                }
                
                const cotes = getCotesFromCoursesFile(prono.reunion, prono.course);
                
                if (prono.classement && Object.keys(cotes).length > 0) {
                    prono.classement.forEach(cheval => {
                        if (cotes[cheval.numero]) {
                            cheval.cote = cotes[cheval.numero].toFixed(1);
                        }
                    });
                }
            } catch (err) {
                console.warn(`⚠️ Erreur enrichissement pronostic ${index}:`, err);
            }
        });
        
        console.log(`✅ Enrichissement terminé: ${enriched}/${allData.pronostics.pronostics.length} pronostics enrichis`);
    } catch (error) {
        console.error('❌ Erreur dans enrichirPronosticsAvecCourses:', error);
    }
}

// ✅ FIN DES FONCTIONS D'ENRICHISSEMENT


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

    const tauxGagnant = coursesAvecResultats > 0 ? Math.round((nbGagnants / coursesAvecResultats) * 100 * 10) / 10 : 0;
    const tauxPlace = coursesAvecResultats > 0 ? Math.round((nbPlaces / coursesAvecResultats) * 100 * 10) / 10 : 0;
    const confianceMoyenne = pronostics.length > 0 ? Math.round(sommeConfiance / pronostics.length) : 0;

    const elById = (id) => document.getElementById(id);

    // Animations count-up
    animateCountUp(elById('taux-gagnant'), tauxGagnant, 1200, '%');
    animateCountUp(elById('taux-place'), tauxPlace, 1200, '%');
    animateCountUp(elById('confiance-moyenne'), confianceMoyenne, 1200, '%');
    animateCountUp(elById('courses-analysees'), pronostics.length, 1000, '');

    // Barres de progression
    updateProgressBar('progress-gagnant', tauxGagnant);
    updateProgressBar('progress-place', tauxPlace);
    updateProgressBar('progress-confiance', confianceMoyenne);

    // Badges de performance
    const badgeGagnant = getPerformanceBadge(tauxGagnant, 'gagnant');
    const badgePlace = getPerformanceBadge(tauxPlace, 'place');
    const badgeConfiance = getPerformanceBadge(confianceMoyenne, 'confiance');

    if (elById('badge-gagnant')) {
        elById('badge-gagnant').className = `performance-badge ${badgeGagnant.class}`;
        elById('badge-gagnant').innerHTML = `<i class="bi bi-${badgeGagnant.icon}"></i> ${badgeGagnant.text}`;
    }
    if (elById('badge-place')) {
        elById('badge-place').className = `performance-badge ${badgePlace.class}`;
        elById('badge-place').innerHTML = `<i class="bi bi-${badgePlace.icon}"></i> ${badgePlace.text}`;
    }
    if (elById('badge-confiance')) {
        elById('badge-confiance').className = `performance-badge ${badgeConfiance.class}`;
        elById('badge-confiance').innerHTML = `<i class="bi bi-${badgeConfiance.icon}"></i> ${badgeConfiance.text}`;
    }

    // Statistiques dans le récapitulatif
    if (elById('nb-gagnants')) elById('nb-gagnants').innerHTML = `<i class="bi bi-trophy"></i> ${nbGagnants}`;
    if (elById('nb-places')) elById('nb-places').innerHTML = `<i class="bi bi-award"></i> ${nbPlaces}`;
    if (elById('nb-rates')) elById('nb-rates').innerHTML = `<i class="bi bi-x-circle"></i> ${nbRates}`;
}

// ✅ NOUVELLE FONCTION : Calculer l'historique en temps réel depuis les fichiers bruts
async function calculerHistoriqueTempsReel() {
    const today = new Date();
    console.log('📊 Calcul de l\'historique complet en temps réel (parallèle)...');

    // ✅ OPTIMISATION : Charger tous les jours en parallèle par batch
    const maxJours = 30;
    const batchSize = 5; // Charger 5 jours à la fois pour ne pas surcharger
    const historique = [];

    // Créer les dates à charger
    const dates = [];
    for (let i = 0; i < maxJours; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push({
            date: date,
            dateStr: getDateString(date),
            dateDisplay: ddmmyyyyToDisplay(getDateString(date))
        });
    }

    // Traiter par batch
    for (let batchStart = 0; batchStart < dates.length; batchStart += batchSize) {
        const batch = dates.slice(batchStart, batchStart + batchSize);

        // Charger tous les jours du batch en parallèle
        const batchResults = await Promise.all(
            batch.map(async ({ date, dateStr, dateDisplay }) => {
                try {
                    // Charger pronostics et résultats en parallèle
                    const [pronosticsRes, resultatsRes] = await Promise.all([
                        fetch(`${GITHUB_RAW_BASE}pronostics-${dateStr}.json`).catch(() => null),
                        fetch(`${GITHUB_RAW_BASE}resultats-${dateStr}.json`).catch(() => null)
                    ]);

                    let stats = {
                        date: dateDisplay,
                        total_courses: 0,
                        nb_gagnants: 0,
                        nb_places: 0,
                        nb_rates: 0,
                        taux_gagnant: 0,
                        taux_place: 0,
                        confiance_moyenne: 0,
                        courses_avec_resultats: 0
                    };

                    if (pronosticsRes && pronosticsRes.ok) {
                        const pronosticsData = await pronosticsRes.json();
                        const pronostics = parsePronosticsData(pronosticsData);

                        stats.total_courses = pronostics.length;
                        let sommeConfiance = 0;

                        if (resultatsRes && resultatsRes.ok) {
                            const resultatsData = await resultatsRes.json();
                            const resultats = parseResultatsData(resultatsData);

                            // Calculer les stats
                            pronostics.forEach(prono => {
                                sommeConfiance += prono.scoreConfiance || 0;

                                const resultat = resultats.find(r => r.reunion === prono.reunion && r.course === prono.course);
                                if (resultat?.arrivee?.length > 0) {
                                    stats.courses_avec_resultats++;
                                    const chevalProno = prono.classement?.[0]?.numero;

                                    if (chevalProno === resultat.arrivee[0]) {
                                        stats.nb_gagnants++;
                                        stats.nb_places++;
                                    } else if (resultat.arrivee.slice(0, 3).includes(chevalProno)) {
                                        stats.nb_places++;
                                    } else {
                                        stats.nb_rates++;
                                    }
                                }
                            });
                        }

                        stats.confiance_moyenne = pronostics.length > 0 ? Math.round(sommeConfiance / pronostics.length) : 0;
                        stats.taux_gagnant = stats.courses_avec_resultats > 0 ?
                            Math.round((stats.nb_gagnants / stats.courses_avec_resultats) * 100 * 10) / 10 : 0;
                        stats.taux_place = stats.courses_avec_resultats > 0 ?
                            Math.round((stats.nb_places / stats.courses_avec_resultats) * 100 * 10) / 10 : 0;

                        console.log(`  ✅ ${dateDisplay}: ${stats.taux_gagnant}% gagnant, ${stats.taux_place}% placé`);
                        return stats;
                    }

                    return null;
                } catch (error) {
                    console.warn(`  ⚠️ Erreur pour ${dateDisplay}:`, error);
                    return null;
                }
            })
        );

        // Ajouter les stats valides à l'historique
        batchResults.forEach(stats => {
            if (stats) historique.push(stats);
        });
    }

    console.log(`✅ Historique calculé: ${historique.length} jours (parallèle)`);
    return historique.reverse(); // Inverser pour avoir du plus ancien au plus récent
}

// ✅ MODIFIER LA FONCTION updateStatistiquesHistoriques pour utiliser les données calculées
async function updateStatistiquesHistoriques() {
    // ✅ VÉRIFIER LE CACHE D'ABORD
    const cacheKey = 'historique_cache';
    let historique = cacheGet(cacheKey);

    if (!historique) {
        // ✅ CALCULER L'HISTORIQUE EN TEMPS RÉEL au lieu d'utiliser analyse.json
        console.log('📊 Calcul de l\'historique (pas de cache valide)...');
        historique = await calculerHistoriqueTempsReel();

        // ✅ SAUVEGARDER DANS LE CACHE
        if (historique && historique.length > 0) {
            cacheSet(cacheKey, historique, CONFIG.HISTORIQUE_CACHE_TTL);
        }
    } else {
        console.log('✅ Utilisation du cache pour l\'historique');
    }

    // ✅ STOCKER dans la variable globale pour réutilisation
    historiqueCalcule = historique;

    if (!historique || historique.length === 0) {
        console.warn('⚠️ Pas de données historiques calculées');
        return;
    }
    
    const nbJours = historique.length;
    
    // Calculer les moyennes
    let sommeTauxGagnant = 0;
    let sommeTauxPlace = 0;
    let sommeConfiance = 0;
    let meilleurJour = null;
    let pireJour = null;
    let meilleurTaux = -1;
    let pireTaux = 101;
    
    historique.forEach(jour => {
        sommeTauxGagnant += jour.taux_gagnant || 0;
        sommeTauxPlace += jour.taux_place || 0;
        sommeConfiance += jour.confiance_moyenne || 0;
        
        // Trouver le meilleur jour (basé sur taux_gagnant)
        if ((jour.taux_gagnant || 0) > meilleurTaux) {
            meilleurTaux = jour.taux_gagnant || 0;
            meilleurJour = jour;
        }
        
        // Trouver le pire jour (basé sur taux_gagnant)
        if ((jour.taux_gagnant || 0) < pireTaux) {
            pireTaux = jour.taux_gagnant || 0;
            pireJour = jour;
        }
    });
    
    const moyenneGagnant = nbJours > 0 ? (sommeTauxGagnant / nbJours).toFixed(1) : 0;
    const moyennePlace = nbJours > 0 ? (sommeTauxPlace / nbJours).toFixed(0) : 0;
    const moyenneConfiance = nbJours > 0 ? (sommeConfiance / nbJours).toFixed(0) : 0;
    
    // Mettre à jour l'affichage
    const el = (id) => document.getElementById(id);
    
    if (el('hist-moyenne-gagnant')) el('hist-moyenne-gagnant').textContent = moyenneGagnant + '%';
    if (el('hist-moyenne-place')) el('hist-moyenne-place').textContent = moyennePlace + '%';
    if (el('hist-moyenne-confiance')) el('hist-moyenne-confiance').textContent = moyenneConfiance + '%';
    if (el('hist-jours-analyses')) el('hist-jours-analyses').textContent = nbJours;
    
    if (meilleurJour) {
        if (el('hist-meilleur-jour')) el('hist-meilleur-jour').textContent = meilleurJour.date;
        if (el('hist-meilleur-taux')) el('hist-meilleur-taux').textContent = 
            `${meilleurJour.taux_gagnant}% gagnant • ${meilleurJour.taux_place}% placé`;
    }
    
    if (pireJour) {
        if (el('hist-pire-jour')) el('hist-pire-jour').textContent = pireJour.date;
        if (el('hist-pire-taux')) el('hist-pire-taux').textContent = 
            `${pireJour.taux_gagnant}% gagnant • ${pireJour.taux_place}% placé`;
    }
    
    // ✅ APPELER LA FONCTION POUR CRÉER LE GRAPHIQUE
    creerGraphiqueHistorique(historique);
    
    console.log('✅ Statistiques historiques mises à jour:', nbJours, 'jours');
}

function updateTableauHistorique() {
    const tbody = document.getElementById('historique-body');
    if (!tbody) return;

    // ✅ UTILISER LES DONNÉES CALCULÉES EN TEMPS RÉEL
    if (!historiqueCalcule || historiqueCalcule.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Aucune donnée historique</td></tr>';
        return;
    }

    let html = '';
    historiqueCalcule.forEach(jour => {
        const tauxGagnantClass = jour.taux_gagnant >= 30 ? 'text-success fw-bold' : 
                                 jour.taux_gagnant >= 15 ? 'text-warning fw-bold' : 'text-danger fw-bold';
        const tauxPlaceClass = jour.taux_place >= 50 ? 'text-success fw-bold' : 
                               jour.taux_place >= 30 ? 'text-warning fw-bold' : 'text-danger fw-bold';

        html += `
            <tr>
                <td class="fw-bold">${jour.date}</td>
                <td>${jour.total_courses}</td>
                <td><span class="badge bg-success">${jour.nb_gagnants}</span></td>
                <td><span class="badge bg-warning text-dark">${jour.nb_places}</span></td>
                <td><span class="badge bg-secondary">${jour.nb_rates}</span></td>
                <td class="${tauxGagnantClass}">${jour.taux_gagnant.toFixed(1)}%</td>
                <td class="${tauxPlaceClass}">${jour.taux_place.toFixed(1)}%</td>
                <td>${jour.confiance_moyenne}%</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    console.log('✅ Tableau historique mis à jour avec', historiqueCalcule.length, 'jours calculés');
}

function updateCoursesParReunion() {
    if (!allData.pronostics?.pronostics) return;

    const pronostics = allData.pronostics.pronostics;
    const reunions = {};

    pronostics.forEach(prono => {
        const key = `${prono.pays}-R${prono.reunion}`;
        if (!reunions[key]) {
            // Récupérer les vraies infos de la réunion depuis le fichier courses
            const reunionInfo = getReunionInfoFromCoursesFile(prono.reunion);
            reunions[key] = {
                pays: prono.pays || reunionInfo.pays,
                reunion: prono.reunion,
                hippodrome: reunionInfo.hippodrome || getHippodromeName(prono.pays, prono.reunion),
                ville: reunionInfo.ville,
                libelleLong: reunionInfo.libelleLong,
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
        
        // Créer le label de l'hippodrome avec ville si disponible
        const hippodromeLabel = reunion.ville
            ? `${reunion.hippodrome} <small class="text-muted">(${reunion.ville})</small>`
            : reunion.hippodrome;

        tabsHtml += `
            <li class="nav-item">
                <button class="nav-link ${isActive}" id="tab-${key}" data-bs-toggle="tab"
                        data-bs-target="#content-${key}" type="button">
                    <i class="bi bi-geo-alt-fill"></i> ${hippodromeLabel}
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

function renderCoursesForReunion(reunion) {
    let html = '';
    
    reunion.courses.forEach(prono => {
        // ✅ UTILISER LA DISCIPLINE ENRICHIE
        const disciplineInfo = getDisciplineInfo(prono.discipline || 'Inconnue');
        
        let heure = prono.heure || '--:--';
        let hippodrome = prono.hippodrome || reunion.hippodrome;

        // ✅ UTILISER LE STATUT ENRICHI
        let statutBadge = '<span class="statut-badge statut-attente"><i class="bi bi-clock"></i> En attente</span>';
        
        // Si le statut a été enrichi, l'utiliser
        if (prono.statut) {
            if (prono.statut === 'OUVERT') {
                statutBadge = '<span class="statut-badge statut-ouvert"><i class="bi bi-unlock-fill"></i> Ouvert</span>';
            } else if (prono.statut === 'EN COURS') {
                statutBadge = '<span class="statut-badge statut-encours"><i class="bi bi-play-circle-fill"></i> En cours</span>';
            } else if (prono.statut === 'TERMINÉ') {
                statutBadge = '<span class="statut-badge statut-termine"><i class="bi bi-check-circle-fill"></i> Terminé</span>';
            }
        }
        
        let resultatHtml = '';

        // Si on a des résultats, le statut change en fonction du résultat du pronostic
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

        // Créer le label de l'hippodrome avec ville
        const hippodromeDisplay = reunion.ville
            ? `${reunion.hippodrome} <small>(${reunion.ville})</small>`
            : reunion.hippodrome;

        html += `
            <div class="course-card">
                <div class="course-header">
                    <div class="hippodrome-info position-relative">
                        <div class="hippodrome-badge"><i class="bi bi-flag-fill"></i> ${hippodromeDisplay}</div>
                        <div class="time-badge"><i class="bi bi-clock-fill"></i> ${heure}</div>
                        <span class="discipline-badge discipline-${disciplineInfo.type}">${disciplineInfo.icon} ${disciplineInfo.label}</span>
                        <div class="ms-auto">${statutBadge}</div>
                    </div>
                    <div class="mt-2"><h5 class="mb-0">Course ${prono.course}</h5></div>
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
        const nomCheval = escapeHtml(cheval.nom || 'N/A');
        const coteCheval = escapeHtml(cheval.cote || 'N/A');
        return `
            <div class="pronostic-item">
                <div class="d-flex align-items-center gap-3">
                    <div class="position-badge ${positionClass}">${index + 1}</div>
                    <div class="cheval-info">
                        <div class="cheval-nom">${nomCheval}</div>
                        <div class="cheval-numero">Numéro ${cheval.numero}</div>
                    </div>
                    <div class="ms-auto">
                        <span class="cote-badge"><i class="bi bi-currency-euro"></i> ${coteCheval}</span>
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
        const hippodrome = getHippodromeName(prono.pays, prono.reunion);
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

        const nomChevalSecurise = cheval ? `<strong>#${cheval.numero}</strong> - ${escapeHtml(cheval.nom)}` : 'N/A';
        const coteChevalSecurise = escapeHtml(cheval?.cote || 'N/A');

        html += `
            <tr>
                <td><strong>${escapeHtml(hippodrome)}</strong></td>
                <td>${prono.heure || '--:--'}</td>
                <td><span class="badge bg-primary">R${prono.reunion}C${prono.course}</span></td>
                <td>${nomChevalSecurise}</td>
                <td>${coteChevalSecurise}</td>
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
        // Créer une liste unique de réunions
        const reunions = [...new Set(allData.pronostics.pronostics.map(p => {
            // Extraire le numéro de réunion depuis p.reunion (format "R2" -> 2)
            const reunionNum = p.reunion ? p.reunion.toString().replace('R', '') : '1';
            // Utiliser le pays si disponible, sinon 'FRA' par défaut
            const pays = p.pays || 'FRA';
            return `${pays}-R${reunionNum}`;
        }))];

        filterReunion.innerHTML = '<option value="">Toutes les réunions</option>';
        reunions.forEach(r => {
            const parts = r.split('-R');
            const pays = parts[0];
            const reunionNum = parseInt(parts[1]);
            const hippodrome = getHippodromeName(pays, reunionNum);
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

            const chevalInfo = cheval ? `#${cheval.numero} - ${escapeCsv(cheval.nom)}` : 'N/A';
            const hippodromeCsv = escapeCsv(prono.hippodrome || prono.reunion);
            const heureCsv = escapeCsv(prono.heure || '--:--');
            const courseCsv = `${prono.reunion}${prono.course}`;
            const coteCsv = cheval?.cote || 'N/A';
            const resultatReelCsv = escapeCsv(resultatReel);
            const statutCsv = escapeCsv(statut);
            csv += `"${hippodromeCsv}","${heureCsv}","${courseCsv}","${chevalInfo}",${coteCsv},${prono.scoreConfiance || 0}%,1er,"${resultatReelCsv}","${statutCsv}"\n`;
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
        if (!el) return;
        
        if (isLoading) {
            const spinner = '<div class="spinner-border text-primary" role="status"></div>';
            el.innerHTML = id === 'reunions-content' ? 
                `<div class="text-center py-5">${spinner}</div>` : 
                `<tr><td colspan="${spinners[id]}" class="text-center py-5">${spinner}</td></tr>`;
        } else if (el.innerHTML.includes('spinner')) {
            el.innerHTML = `<tr><td colspan="${spinners[id]}" class="text-center text-muted">Aucune donnée</td></tr>`;
        }
    });
    
    // CORRECTION: Vérifier l'existence avant manipulation
    const dateSelector = document.getElementById('date-selector');
    const loadToday = document.getElementById('load-today');
    
    if (dateSelector) dateSelector.disabled = isLoading;
    if (loadToday) loadToday.disabled = isLoading;
}

// HISTORIQUE DES STATISTIQUES
async function chargerHistorique() {
    try {
        const url = `${GITHUB_RAW_BASE}statistiques-${currentDateString}.json?t=${Date.now()}`;
        console.log('📊 Chargement historique:', url);
        const response = await fetch(url);
        if (!response.ok) {
            console.log('⚠️ Pas de statistiques pour cette date');
            return null;
        }
        const data = await response.json();
        console.log('✅ Historique chargé:', data);
        return data[0];
    } catch (error) {
        console.error('❌ Erreur historique:', error);
        return null;
    }
}

function afficherHistorique(statsHistorique) {
    const el = (id) => document.getElementById(id);
    
    if (!statsHistorique?.analyse) {
        if (el('hist-moyenne-gagnant')) el('hist-moyenne-gagnant').textContent = '-';
        if (el('hist-moyenne-place')) el('hist-moyenne-place').textContent = '-';
        if (el('hist-moyenne-confiance')) el('hist-moyenne-confiance').textContent = '-';
        if (el('hist-jours-analyses')) el('hist-jours-analyses').textContent = '0/0';
        if (el('hist-meilleur-jour')) el('hist-meilleur-jour').textContent = '-';
        if (el('hist-meilleur-taux')) el('hist-meilleur-taux').textContent = '-';
        if (el('hist-pire-jour')) el('hist-pire-jour').textContent = '-';
        if (el('hist-pire-taux')) el('hist-pire-taux').textContent = '-';
        return;
    }

    const { stats_globales, historique } = statsHistorique.analyse;

    if (el('hist-moyenne-gagnant')) el('hist-moyenne-gagnant').textContent = stats_globales.moyenne_taux_gagnant.toFixed(1) + '%';
    if (el('hist-moyenne-place')) el('hist-moyenne-place').textContent = stats_globales.moyenne_taux_place.toFixed(1) + '%';
    if (el('hist-moyenne-confiance')) el('hist-moyenne-confiance').textContent = stats_globales.moyenne_confiance + '%';
    if (el('hist-jours-analyses')) el('hist-jours-analyses').textContent = `${stats_globales.jours_avec_pronostics}/${stats_globales.total_jours}`;

    if (stats_globales.meilleur_jour) {
        if (el('hist-meilleur-jour')) el('hist-meilleur-jour').textContent = stats_globales.meilleur_jour;
        if (el('hist-meilleur-taux')) el('hist-meilleur-taux').textContent = `Taux gagnant: ${stats_globales.meilleur_taux.toFixed(1)}%`;
    }

    if (stats_globales.pire_jour) {
        if (el('hist-pire-jour')) el('hist-pire-jour').textContent = stats_globales.pire_jour;
        if (el('hist-pire-taux')) el('hist-pire-taux').textContent = `Taux gagnant: ${stats_globales.pire_taux.toFixed(1)}%`;
    }

    creerGraphiqueHistorique(historique);
}

function creerGraphiqueHistorique(historique) {
    const ctx = document.getElementById('chart-historique');
    if (!ctx) return;

    if (chartHistoriqueInstance) chartHistoriqueInstance.destroy();

    // ✅ DEBUG: Afficher les données avant de créer le graphique
    console.log('📊 Données pour le graphique:', historique);

    // ✅ CORRECTION: Prendre tous les jours, pas seulement ceux avec pronostics_disponibles
    const joursAvecData = historique.slice(-7).reverse(); // Prendre les 7 derniers jours
    
    console.log('📊 Jours affichés dans le graphique:', joursAvecData);

    if (!joursAvecData.length) {
        if (ctx.parentElement) {
            ctx.parentElement.innerHTML = '<p class="text-center text-muted py-4">Pas de données historiques</p>';
        }
        return;
    }

    chartHistoriqueInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: joursAvecData.map(h => h.date),
            datasets: [
                {
                    label: 'Taux Gagnant',
                    data: joursAvecData.map(h => h.taux_gagnant),
                    borderColor: '#4caf50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    pointRadius: 5
                },
                {
                    label: 'Taux Placé',
                    data: joursAvecData.map(h => h.taux_place),
                    borderColor: '#2196f3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    pointRadius: 5
                },
                {
                    label: 'Confiance',
                    data: joursAvecData.map(h => h.confiance_moyenne),
                    borderColor: '#ff9800',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    tension: 0.4,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { callback: (value) => value + '%' }
                },
                x: { ticks: { maxRotation: 45, minRotation: 45 } }
            }
        }
    });
}

// INITIALISATION
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Application démarrée');

    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const currentDateEl = document.getElementById('current-date');
    if (currentDateEl) {
        currentDateEl.textContent = new Date().toLocaleDateString('fr-FR', dateOptions);
    }

    // Initialiser le timer de mise à jour
    updateLastUpdateTime();

    // Quick Actions Event Listeners
    const refreshBtn = document.getElementById('refresh-data');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise spin-animation"></i> <span>Rafraîchissement...</span>';

            try {
                await loadAllData(currentDateString || getDateString());
                lastUpdateTime = Date.now();
                updateLastUpdateTime();
                showToast('Données rafraîchies avec succès', 'success');
            } catch (error) {
                showToast('Erreur lors du rafraîchissement', 'warning');
            } finally {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> <span>Rafraîchir</span>';
            }
        });
    }

    const exportBtn = document.getElementById('export-data');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            // Déclencher l'export CSV existant
            const exportCsvBtn = document.getElementById('export-csv');
            if (exportCsvBtn) {
                exportCsvBtn.click();
                showToast('Export CSV lancé', 'info');
            } else {
                showToast('Fonction d\'export non disponible', 'warning');
            }
        });
    }

    loadAllData(getDateString());

    setInterval(() => {
        if (currentDateString === getDateString()) {
            console.log('🔄 Rafraîchissement automatique');
            loadAllData(currentDateString);
            lastUpdateTime = Date.now();
            showToast('Données automatiquement rafraîchies', 'info');
        }
    }, CONFIG.REFRESH_INTERVAL);
    
    // CORRECTION: Vérifier l'existence avant d'ajouter les écouteurs
    const dateSelector = document.getElementById('date-selector');
    if (dateSelector) {
        dateSelector.addEventListener('change', (e) => loadAllData(e.target.value));
    }
    
    const loadToday = document.getElementById('load-today');
    if (loadToday) {
        loadToday.addEventListener('click', () => loadAllData(getDateString()));
    }
});
