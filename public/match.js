document.addEventListener('DOMContentLoaded', async () => {
    const loader = document.getElementById('loader');
    const headerContainer = document.getElementById('match-header-details');
    const streamContainer = document.getElementById('stream-details');
    const mapNavContainer = document.getElementById('map-nav-container');
    const mapContentContainer = document.getElementById('map-content-container');
    const pageTitle = document.querySelector('header h1');

    const urlParams = new URLSearchParams(window.location.search);
    const matchUrl = urlParams.get('url');

    if (!matchUrl) {
        headerContainer.innerHTML = "<p>Nie podano adresu URL meczu.</p>";
        return;
    }

    loader.style.display = 'block';

    try {
        const response = await fetch(`/api/match?url=${encodeURIComponent(matchUrl)}`);
        if (!response.ok) throw new Error('Nie udało się pobrać danych meczu.');
        const data = await response.json();
        
        pageTitle.textContent = `${data.team1.name} vs ${data.team2.name}`;
        
        renderHeader(data);
        renderStreams(data.streams);
        setupMapTabs(data.maps, data.team1.name, data.team2.name);

    } catch (error) {
        headerContainer.innerHTML = `<p>Wystąpił błąd: ${error.message}</p>`;
    } finally {
        loader.style.display = 'none';
    }


    function renderHeader(data) {
        const date = new Date(data.matchDate).toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' });
        headerContainer.innerHTML = `
            <div class="match-details-header">
                <div class="event-info"><img src="${data.event.logoUrl}" alt="${data.event.name}"><div><strong>${data.event.name}</strong><span>${data.event.series}</span></div></div>
                <div class="score-info">
                    <div class="team-display"><span class="team-name">${data.team1.name}</span><img src="${data.team1.logoUrl}" alt="${data.team1.name}"></div>
                    <div class="score-box"><span class="score">${data.score.team1} - ${data.score.team2}</span><span class="status">${data.score.status}</span></div>
                    <div class="team-display"><img src="${data.team2.logoUrl}" alt="${data.team2.name}"><span class="team-name">${data.team2.name}</span></div>
                </div>
                <div class="meta-info"><span>${date}</span><span>Format: ${data.matchFormat}</span></div>
            </div>`;
    }

    function renderStreams(streams) {
        if (!streams || streams.length === 0) return;
        let streamLinks = streams.map(s => s.link ? `<a href="${s.link}" target="_blank" class="stream-link">${s.name}</a>` : '').join('');
        streamContainer.innerHTML = `<h4>Streamy</h4><div class="stream-list">${streamLinks}</div>`;
    }

    function setupMapTabs(maps, team1Name, team2Name) {
        if (!maps || maps.length === 0) {
            mapNavContainer.innerHTML = '<h4>Brak informacji o mapach.</h4>';
            return;
        }
        mapNavContainer.innerHTML = maps.map((map, index) => `
            <button class="map-nav-btn ${index === 0 ? 'active' : ''}" data-map-index="${index}">
                ${map.name} <span class="map-score-badge">${map.score.team1}-${map.score.team2}</span>
            </button>
        `).join('');
        renderMapContent(maps[0], team1Name, team2Name);
        mapNavContainer.querySelectorAll('.map-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                mapNavContainer.querySelector('.active').classList.remove('active');
                btn.classList.add('active');
                const mapIndex = parseInt(btn.dataset.mapIndex, 10);
                renderMapContent(maps[mapIndex], team1Name, team2Name);
            });
        });
    }

    function renderMapContent(map, team1Name, team2Name) {
         mapContentContainer.innerHTML = `
            <div class="map-stats-card">
                ${renderStatsTable(team1Name, map.stats.team1)}
                ${renderStatsTable(team2Name, map.stats.team2)}
            </div>
        `;
    }
    
    function renderStatsTable(teamName, players) {
        const hasStats = players.length > 0 && players[0].stats.R;
        const headers = `<thead><tr><th class="player-header">${teamName}</th><th></th><th>R</th><th>ACS</th><th>K</th><th>D</th><th>A</th><th>+/-</th><th>KAST</th><th>ADR</th><th>HS%</th><th>FK</th><th>FD</th><th>+/-</th></tr></thead>`;

        let body;
        if (!hasStats) {
            body = Array(5).fill('').map(() => `<tr><td class="player-cell">Gracz</td><td class="agent-cell"></td><td>–</td><td>–</td><td>–</td><td>–</td><td>–</td><td>–</td><td>–</td><td>–</td><td>–</td><td>–</td><td>–</td><td>–</td></tr>`).join('');
        } else {
            body = players.map(p => `
                <tr>
                    <td class="player-cell">
                        <!-- ZMIANA TUTAJ: Renderujemy tag <img> zamiast <i> -->
                        <img class="flag" src="https://www.vlr.gg//img/icons/flags/16/${p.flag}.png" alt="${p.flag}">
                        ${p.name}
                    </td>
                    <td class="agent-cell">${p.agents.map(src => `<img src="${src}" alt="agent">`).join('')}</td>
                    <td>${p.stats.R}</td>
                    <td>${p.stats.ACS}</td>
                    <td>${p.stats.K}</td>
                    <td>${p.stats.D}</td>
                    <td>${p.stats.A}</td>
                    <td class="${p.stats.KD_diff > 0 ? 'pos' : p.stats.KD_diff < 0 ? 'neg' : ''}">${p.stats.KD_diff}</td>
                    <td>${p.stats.KAST}</td>
                    <td>${p.stats.ADR}</td>
                    <td>${p.stats.HS_percent}</td>
                    <td>${p.stats.FK}</td>
                    <td>${p.stats.FD}</td>
                    <td class="${p.stats.FK_FD_diff > 0 ? 'pos' : p.stats.FK_FD_diff < 0 ? 'neg' : ''}">${p.stats.FK_FD_diff}</td>
                </tr>
            `).join('');
        }
        return `<div class="table-wrapper"><table class="stats-table">${headers}<tbody>${body}</tbody></table></div>`;
    }
});