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
            const [coursesRes, pronosticsRes, resultatsRes] = await Promise.all([
                fetch(`${API_BASE_URL}courses-${date}.json?v=${new Date().getTime()}`),
                fetch(`${API_BASE_URL}pronostics-${date}.json?v=${new Date().getTime()}`),
                fetch(`${API_BASE_URL}resultats-${date}.json?v=${new Date().getTime()}`)
            ]);

            const coursesData = await coursesRes.json();
            const pronosticsData = await pronosticsRes.json();
            const resultatsData = resultatsRes.ok ? await resultatsRes.json() : { courses: [] };

            // Vérifier la structure des données
            const coursesObj = Array.isArray(coursesData) ? coursesData[0] : coursesData;
            const reunions = coursesObj?.programme?.reunions || coursesObj?.reunions || [];
            const pronostics = pronosticsData.pronostics || [];
            const resultats = resultatsData.courses || [];

            if (reunions.length === 0) {
                throw new Error('Aucune réunion trouvée dans les données');
            }

            renderTabsAndCourses(reunions, pronostics);
            updateComparaisonTable(pronostics, resultats);
            updateDashboard(pronostics, resultats);
            setupFilters(reunions);

        } catch (error) {
            console.error("Erreur lors de la récupération des données:", error);
            // Afficher un message d'erreur sur la page
            document.getElementById('reunions-content').innerHTML = `<div class="alert alert-danger">Impossible de charger les données. Veuillez vérifier que les workflows n8n fonctionnent correctement.<br>Erreur: ${error.message}</div>`;
        }
    }

    // --- FONCTIONS D'AFFICHAGE ---
    function renderTabsAndCourses(reunions, pronostics) {
        const tabsContainer = document.getElementById('reunions-tabs');
        const contentContainer = document.getElementById('reunions-content');
        tabsContainer.innerHTML = '';
        contentContainer.innerHTML = '';

        reunions.forEach((reunion, index) => {
            const isActive = index === 0;
            // Création de l'onglet
            tabsContainer.innerHTML += `
                <li class="nav-item" role="presentation">
                    <button class="nav-link ${isActive ? 'active' : ''}" id="tab-r${reunion.numOfficiel}" data-bs-toggle="tab" data-bs-target="#content-r${reunion.numOfficiel}" type="button" role="tab">${reunion.hippodrome?.libelleCourt || 'Hippodrome'} (R${reunion.numOfficiel})</button>
                </li>`;

            // Création du contenu de l'onglet
            let coursesHtml = '';
            const courses = reunion.courses || [];
            courses.forEach(course => {
                const courseId = `R${reunion.numOfficiel}C${course.numOrdre}`;
                const prono = pronostics.find(p => p.courseId === courseId);

                coursesHtml += `
                    <div class="card mb-3">
                        <div class="card-header d-flex justify-content-between">
                            <strong>${course.libelle || 'Course'} - C${course.numOrdre}</strong>
                            <span>Départ: ${course.heureDepart ? new Date(course.heureDepart).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                        </div>
                        <div class="card-body">
                            ${prono ? renderProno(prono) : '<p class="text-muted">Pronostic en attente de génération...</p>'}
                        </div>
                    </div>`;
            });

            contentContainer.innerHTML += `
                <div class="tab-pane fade ${isActive ? 'show active' : ''}" id="content-r${reunion.numOfficiel}" role="tabpanel">
                    ${coursesHtml || '<p class="text-muted">Aucune course disponible pour cette réunion.</p>'}
                </div>`;
        });
    }

    function renderProno(prono) {
        if (!prono.classement || prono.classement.length === 0) {
            return '<p class="text-muted">Aucun classement disponible</p>';
        }

        let tableHtml = `
            <h5 class="card-title">Pronostic ${prono.scoreConfiance ? `(Confiance: ${prono.scoreConfiance.toFixed(2)}%)` : ''}</h5>
            <table class="table table-sm">
                <thead><tr><th>Rang</th><th>Cheval</th><th>Jockey</th><th>Cote</th></tr></thead>
                <tbody>`;
        prono.classement.slice(0, 5).forEach((cheval, i) => {
            tableHtml += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${cheval.nom || 'N/A'} (${cheval.numPmu || 'N/A'})</td>
                    <td>${cheval.jockey || 'N/A'}</td>
                    <td>${cheval.cote || 'N/A'}</td>
                </tr>`;
        });
        tableHtml += '</tbody></table>';
        return tableHtml;
    }

    function updateComparaisonTable(pronostics, resultats) {
        const tbody = document.getElementById('comparaison-body');
        tbody.innerHTML = '';

        pronostics.forEach(prono => {
            if (!prono.classement || prono.classement.length === 0) return;

            const chevalPronostique = prono.classement[0];
            const resultatCourse = resultats.find(r => r.reunion === prono.reunion && r.course === prono.course);
            
            let statut = 'En attente';
            let resultatReel = 'En attente';
            let rowClass = '';

            if (resultatCourse && resultatCourse.arrivee && resultatCourse.arrivee.length > 0) {
                const positionReelle = resultatCourse.arrivee.indexOf(chevalPronostique.numPmu) + 1;
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

            const courseId = `R${prono.reunion}C${prono.course}`;
            const reunionNum = prono.reunion || courseId.split('C')[0].replace('R','');
            const confiance = prono.scoreConfiance || 0;

            const row = `
                <tr class="${rowClass}" data-reunion="R${reunionNum}" data-confiance="${confiance}">
                    <td>${courseId}</td>
                    <td>${chevalPronostique.nom || 'N/A'} (${chevalPronostique.numPmu || 'N/A'})</td>
                    <td>${chevalPronostique.cote || 'N/A'}</td>
                    <td>1er</td>
                    <td>${resultatReel}</td>
                    <td>${statut}</td>
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
            
            const chevalPronostique = prono.classement[0];
            const resultatCourse = resultats.find(r => r.reunion === prono.reunion && r.course === prono.course);

            if (resultatCourse && resultatCourse.arrivee && resultatCourse.arrivee.length > 0) {
                coursesTerminees++;
                const positionReelle = resultatCourse.arrivee.indexOf(chevalPronostique.numPmu) + 1;
                
                // Calcul ROI : mise de 1€ sur le gagnant
                roi -= 1; // La mise
                if (positionReelle === 1) {
                    gagnants++;
                    places++;
                    roi += parseFloat(chevalPronostique.cote || 0);
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
    setInterval(fetchData, 30000); // Rafraîchissement toutes les 30 secondes
});
