document.addEventListener('DOMContentLoaded', () => {
    const eventNameEl = document.getElementById('event-name');
    const eventSubnameEl = document.getElementById('event-subname');
    const detailsContainer = document.getElementById('match-details-container');

    const createPlayerTable = (team) => {
        let tableHTML = `<div class="players-section"><h3>${team.name}</h3><table class="player-table"><thead><tr><th>Gracz</th><th>Agenci</th><th>K/D/A</th><th>ACS</th><th>ADR</th></tr></thead><tbody>`;
        team.players.forEach(player => {
            tableHTML += `
                <tr class="player-row">
                    <td>
                        <img src="${player.flagLink}" title="${player.country}" alt="${player.country}">
                        <a href="${player.playerLink}" target="_blank" rel="noopener noreferrer">${player.name}</a>
                    </td>
                    <td>${player.agentsPlayed.join(', ')}</td>
                    <td>${player.stats.Kills} / ${player.stats.Deaths} / ${player.stats.Assists}</td>
                    <td>${player.stats.ACS}</td>
                    <td>${player.stats.ADR}</td>
                </tr>
            `;
        });
        tableHTML += '</tbody></table></div>';
        return tableHTML;
    };

    const loadMatchDetails = async () => {
        const pathParts = window.location.pathname.split('/');
        const id = pathParts[2];
        const slug = pathParts.slice(3).join('/');

        try {
            const response = await fetch(`/api/match/${id}/${slug}`);
            const data = await response.json();

            document.title = `${data.team1.name} vs ${data.team2.name} | Szczegóły Meczu`;
            eventNameEl.textContent = data.event.name;
            eventSubnameEl.textContent = data.event.subname;

            let contentHTML = `
                <div class="team-header">
                    <div class="team-info">
                        <img src="${data.team1.logo}" alt="${data.team1.name} logo">
                        <div class="team-name">${data.team1.name}</div>
                    </div>
                    <div class="score">${data.score}</div>
                    <div class="team-info">
                        <img src="${data.team2.logo}" alt="${data.team2.name} logo">
                        <div class="team-name">${data.team2.name}</div>
                    </div>
                </div>
            `;

            contentHTML += createPlayerTable(data.team1);
            contentHTML += createPlayerTable(data.team2);
            
            detailsContainer.innerHTML = contentHTML;

        } catch (error) {
            console.error('Błąd podczas ładowania szczegółów meczu:', error);
            detailsContainer.innerHTML = '<p>Wystąpił błąd podczas ładowania danych meczu.</p>';
        }
    };

    loadMatchDetails();
});