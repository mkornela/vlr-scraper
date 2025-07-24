document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('match-list-container');
    const filterInput = document.getElementById('filter-input');
    let allMatches = [];

    const renderMatches = (matchesToRender) => {
        container.innerHTML = '';
        if (matchesToRender.length === 0) {
            container.innerHTML = '<p style="text-align: center;">Brak meczów pasujących do filtra.</p>';
            return;
        }

        matchesToRender.forEach(match => {
            const matchIdAndSlug = match.url.split('/').slice(3).join('/');
            const card = document.createElement('a');
            card.href = `/match/${matchIdAndSlug}`;
            card.className = 'match-card';
            card.innerHTML = `
                <div class="match-info">
                    <div class="teams">${match.teams}</div>
                    <div class="event">${match.event}</div>
                </div>
                <div class="time">${match.time}</div>
            `;
            container.appendChild(card);
        });
    };

    const filterMatches = () => {
        const filterText = filterInput.value.toLowerCase().trim();
        const filtered = allMatches.filter(match => 
            match.teams.toLowerCase().includes(filterText) || 
            match.event.toLowerCase().includes(filterText)
        );
        renderMatches(filtered);
    };

    const loadUpcomingMatches = async () => {
        try {
            const response = await fetch('/api/upcoming');
            allMatches = await response.json();
            renderMatches(allMatches);
            filterInput.addEventListener('input', filterMatches);
        } catch (error) {
            console.error('Błąd podczas ładowania meczów:', error);
            container.innerHTML = '<p>Wystąpił błąd podczas ładowania danych.</p>';
        }
    };

    loadUpcomingMatches();
});