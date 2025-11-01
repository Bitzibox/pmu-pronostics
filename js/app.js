document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'data/'; // Chemin vers les données JSON locales
    let performanceChart;

    // Fonction pour obtenir la date au format DDMMYYYY
    const getFormattedDate = () => {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        return `${day}${month}${year}`;
    };

    // --- FONCTIONS DE CHARGEMENT DES DONNÉES ---
    async function fetchData() {
        try {
            const date = getFormattedDate();
            console.log('Date actuelle:', date);
            
            const [coursesRes, pronosticsRes, resultatsRes] = await Promise.all([
                fetch(`${API_BASE_URL}courses-${date}.json?v=${new Date().getTime()}`),
                fetch(`${API_BASE_URL}pronostics-${date}.json?v=${new Date().getTime()}`),
                fetch(`${API_BASE_URL}resultats-${date}.json?v=${new Date().getTime()}`)
            ]);

            const coursesData = await coursesRes.json();
            const pronosticsData = await pronosticsRes.json();
            const resultatsData = resultatsRes.ok ? await resultatsRes.json() : { courses: [] };

            console.log('Données courses:', coursesData);
            console.log('Données pronostics:', pronosticsData);
            console.log('Données résultats:', resultatsData);

            // Vérifier la structure des données
            const coursesObj = Array.isArray(coursesData) ? coursesData[0] : coursesData;
            const reunions = coursesObj?.programme?.reunions || coursesObj?.reunions || [];
            const pronosticsObj = Array.isArray(pronosticsData) ? pronosticsData[0] : pronosticsData;
            const pronostics = pronosticsObj?.pronostics || [];
            const resultatsObj = Array.isArray(resultatsData) ? resultatsData[0] : resultatsData;
            const resultats = resultatsObj?.courses || [];

            console.log('Réunions trouvées:', reunions.length);
            console.log('Pronostics trouvés:', pronostics.length);
            console.log('Résultats trouvés:', resultats.length);

            if (reunions.length === 0) {
                throw new Error('Aucune réunion trouvée dans les données');
            }

            renderTabsAndCourses(reunions, pronostics);
            setupTabListeners();
            updateComparaisonTable(pronostics, resultats);
            updateDashboard(pronostics, resultats);
            setupFilters(reunions);

        } catch (error) {
            console.error("Erreur lors de la récupération des données:", error);
            document.getElementById('reunions-content').innerHTML = `<div class="alert alert-danger">Impossible de charger les données. Veuillez vérifier que les workflows n8n fonctionnent correctement.<br>Erreur: ${error.message}</div>`;
        }
    }

    // NOUVELLE FONCTION: Gestion des clics sur les onglets
    function setupTabListeners() {
        const tabs = document.querySelectorAll('.nav-link[data-bs-toggle="tab"]');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Retirer la classe 'active' de tous les onglets
                tabs.forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                
                // Ajouter la classe 'active' à l'onglet cliqué
                this.classList.add('active');
                this.setAttribute('aria-selected', 'true');
                
                // Récupérer l'ID du contenu cible
                const targetId = this.getAttribute('data-bs-target');
                
                // Masquer tous les contenus
                document.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.remove('show', 'active');
                });
                
                // Afficher le contenu ciblé
                const targetPane = document.querySelector(targetId);
                if (targetPane) {
                    targetPane.classList.add('show', 'active');
                }
            });
        });
    }

    // --- FONCTIONS D'AFFICHAGE ---
    function renderTabsAndCourses(reunions, pronostics) {
        const tabsContainer = document.getElementById('reunions-tabs');
        const contentContainer = document.getElementById('reunions-content');
        tabsContainer.innerHTML = '';
        contentContainer.innerHTML = '';

        reunions.forEach((reunion, index) => {
            const isActive = index === 0;
            const reunionNum = reunion.numOfficiel;
            const hippodromeLibelle = reunion.hippodrome?.libelleCourt || 'Hippodrome';
            
            // Création de l'onglet
            tabsContainer.innerHTML += `
                <li class="nav-item" role="presentation">
                    <button class="nav-link ${isActive ? 'active' : ''}" 
                            id="tab-r${reunionNum}" 
                            data-bs-toggle="tab" 
                            data-bs-target="#content-r${reunionNum}" 
                            type="button" 
                            role="tab"
                            aria-controls="content-r${reunionNum}"
                            aria-selected="${isActive}">
                        ${hippodromeLibelle} (R${reunionNum})
                    </button>
                </li>`;

            // Création du contenu de l'onglet
            let coursesHtml = '';
            const courses = reunion.courses || [];
            
            courses.forEach(course => {
                const courseNum = course.numOrdre;
                const courseId = `R${reunionNum}C${courseNum}`;
                
                // ✅ CORRECTION : Chercher le pronostic correspondant
                const prono = pronostics.find(p => p.courseId === courseId);
                
                if (!prono || !prono.classement || prono.classement.length === 0) {
                    return; // Pas de pronostic pour cette course
                }

                const heureDepart = course.heureDepart || 'N/A';
                const libelle = course.libelleCourt || 'Course';
                const nombrePartants = course.nombrePartants || prono.nombrePartants || 0;
                const confiance = prono.scoreConfiance || 0;
                const commentaire = prono.commentaire || 'Aucun commentaire disponible.';

                coursesHtml += `
                    <div class="course-card mb-4">
                        <div class="course-header">
                            <h5>${libelle} - ${courseId}</h5>
                            <span class="badge bg-info">Départ: ${heureDepart}</span>
                        </div>
                        <div class="course-body">
                            <p><strong>Nombre de partants:</strong> ${nombrePartants}</p>
                            <p><strong>Pronostic (Confiance: ${confiance}%):</strong></p>
                            <table class="table table-sm table-bordered">
                                <thead>
                                    <tr>
                                        <th>Rang</th>
                                        <th>N°</th>
                                        <th>Cheval</th>
                                        <th>Jockey</th>
                                        <th>Cote</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${prono.classement.map((cheval, idx) => `
                                        <tr>
                                            <td>${idx + 1}</td>
                                            <td><strong>${cheval.numero}</strong></td>
                                            <td>${cheval.nom}</td>
                                            <td>${cheval.jockey}</td>
                                            <td>${cheval.cote}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            <div class="alert alert-info">
                                <strong>Commentaire :</strong> ${commentaire}
                            </div>
                        </div>
                    </div>`;
            });

            // Ajouter le contenu de l'onglet
            contentContainer.innerHTML += `
                <div class="tab-pane fade ${isActive ? 'show active' : ''}" 
                     id="content-r${reunionNum}" 
                     role="tabpanel" 
                     aria-labelledby="tab-r${reunionNum}">
                    ${coursesHtml || '<p>Aucune course disponible pour cette réunion.</p>'}
                </div>`;
        });
    }

    // ✅ CORRECTION MAJEURE : Utiliser les données du JSON pronostics
    function updateComparaisonTable(pronostics, resultats) {
        const tbody = document.getElementById('comparaison-body');
        tbody.innerHTML = '';

        pronostics.forEach(prono => {
            if (!prono.classement || prono.classement.length === 0) return;

            // ✅ FIX : Récupérer le NUMERO du premier cheval (pas l'objet entier)
            const premierCheval = prono.classement[0];
            const numPmuPronostique = premierCheval.numero;
            const nomCheval = premierCheval.nom;
            const coteCheval = premierCheval.cote;
            
            const resultatCourse = resultats.find(r => r.reunion === prono.reunion && r.course === prono.course);
            
            let statut = 'En attente';
            let resultatReel = 'En attente';
            let rowClass = '';

            if (resultatCourse && resultatCourse.arrivee && resultatCourse.arrivee.length > 0) {
                const positionReelle = resultatCourse.arrivee.indexOf(numPmuPronostique) + 1;
                if (positionReelle === 1) {
                    statut = 'Gagnant';
                    resultatReel = '1er';
                    rowClass = 'status-success';
                } else if (positionReelle > 1 && positionReelle <= 3) {
                    statut = 'Placé';
                    resultatReel = `${positionReelle}ème`;
                    rowClass = 'status-placed';
                } else if (positionReelle > 0) {
                    statut = 'Perdu';
                    resultatReel = `${positionReelle}ème`;
                    rowClass = 'status-fail';
                }
            }

            const courseId = `${prono.reunion}${prono.course}`;
            const reunionNum = prono.reunion;
            const confiance = prono.scoreConfiance || 0;

            const row = `
                <tr class="${rowClass}" data-reunion="${reunionNum}" data-confiance="${confiance}">
                    <td><strong>${courseId}</strong></td>
                    <td>n°${numPmuPronostique} - ${nomCheval}</td>
                    <td>${coteCheval}</td>
                    <td>1er</td>
                    <td>${resultatReel}</td>
                    <td><span class="badge ${statut === 'Gagnant' ? 'bg-success' : statut === 'Placé' ? 'bg-warning' : 'bg-secondary'}">${statut}</span></td>
                </tr>`;
            tbody.innerHTML += row;
        });
    }
    
    function updateDashboard(pronostics, resultats) {
        let gagnants = 0;
        let places = 0;
        let coursesTerminees = 0;
        let roi = 0;

        pronostics.forEach(prono => {
            if (!prono.classement || prono.classement.length === 0) return;
            
            // ✅ FIX : Utiliser .numero au lieu de l'objet entier
            const numPmuPronostique = prono.classement[0].numero;
            const resultatCourse = resultats.find(r => r.reunion === prono.reunion && r.course === prono.course);

            if (resultatCourse && resultatCourse.arrivee && resultatCourse.arrivee.length > 0) {
                coursesTerminees++;
                const positionReelle = resultatCourse.arrivee.indexOf(numPmuPronostique) + 1;
                
                // Calcul ROI : mise de 1€ sur le gagnant
                roi -= 1; // La mise
                if (positionReelle === 1) {
                    gagnants++;
                    places++;
                    // roi += parseFloat(cote || 0); // TODO: récupérer la vraie cote
                } else if (positionReelle > 1 && positionReelle <= 3) {
                    places++;
                }
            }
        });

        const tauxGagnant = coursesTerminees > 0 ? (gagnants / coursesTerminees) * 100 : 0;
        const tauxPlace = coursesTerminees > 0 ? (places / coursesTerminees) * 100 : 0;

        document.getElementById('taux-gagnant').textContent = `${tauxGagnant.toFixed(1)}%`;
        document.getElementById('taux-place').textContent = `${tauxPlace.toFixed(1)}%`;
        document.getElementById('roi-theorique').textContent = `${roi.toFixed(2)}€`;
        document.getElementById('courses-analysees').textContent = coursesTerminees;
        
        // Mise à jour du graphique
        renderPerformanceChart([tauxGagnant, tauxPlace]);
    }
    
    function renderPerformanceChart(data) {
        const ctx = document.getElementById('performance-chart').getContext('2d');
        if(performanceChart) {
            performanceChart.destroy();
        }
        performanceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Taux de réussite Gagnant', 'Taux de réussite Placé'],
                datasets: [{
                    label: 'Performance du jour (%)',
                    data: data,
                    backgroundColor: [
                        'rgba(40, 167, 69, 0.7)',
                        'rgba(255, 193, 7, 0.7)'
                    ],
                    borderColor: [
                        'rgba(40, 167, 69, 1)',
                        'rgba(255, 193, 7, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                },
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // --- FILTRES ET EXPORT ---
    function setupFilters(reunions) {
        const filterReunion = document.getElementById('filter-reunion');
        filterReunion.innerHTML = '<option value="">Toutes les réunions</option>';
        reunions.forEach(reunion => {
            const libelle = reunion.hippodrome?.libelleCourt || 'Hippodrome';
            filterReunion.innerHTML += `<option value="R${reunion.numOfficiel}">R${reunion.numOfficiel} - ${libelle}</option>`;
        });

        document.getElementById('filter-reunion').addEventListener('change', applyFilters);
        document.getElementById('filter-confiance').addEventListener('change', applyFilters);
    }

    function applyFilters() {
        const selectedReunion = document.getElementById('filter-reunion').value;
        const minConfiance = parseInt(document.getElementById('filter-confiance').value, 10) || 0;
        const rows = document.querySelectorAll('#comparaison-body tr');

        rows.forEach(row => {
            const reunionMatch = !selectedReunion || row.dataset.reunion === selectedReunion;
            const confianceMatch = parseInt(row.dataset.confiance, 10) >= minConfiance;

            if (reunionMatch && confianceMatch) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }
    
    document.getElementById('export-csv').addEventListener('click', () => {
        let csvContent = "data:text/csv;charset=utf-8,Course,Cheval Pronostiqué,Cote,Position Prédite,Résultat Réel,Statut\n";
        const rows = document.querySelectorAll('#comparaison-body tr');

        rows.forEach(row => {
            if (row.style.display === 'none') return; // Exporter seulement les lignes visibles
            let rowData = [];
            row.querySelectorAll('td').forEach(cell => {
                rowData.push(`"${cell.textContent}"`);
            });
            csvContent += rowData.join(',') + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `comparaison_pmu_${getFormattedDate()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // --- INITIALISATION ET RAFRAÎCHISSEMENT ---
    fetchData(); // Premier chargement
    setInterval(fetchData, 60000); // Rafraîchissement toutes les 60 secondes
});
