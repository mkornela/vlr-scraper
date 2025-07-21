document.addEventListener('DOMContentLoaded', () => {
    const matchesContainer = document.getElementById('matches-container');
    const loader = document.getElementById('loader');
    const eventFilter = document.getElementById('event-filter');
    const dateFromFilter = document.getElementById('date-from-filter');
    const dateToFilter = document.getElementById('date-to-filter');
    const resetFiltersBtn = document.getElementById('reset-filters');

    let allMatches = [];

    function renderMatches(matches) {
        matchesContainer.innerHTML = '';
        if (matches.length === 0) {
            matchesContainer.innerHTML = '<p style="text-align: center;">Brak meczów spełniających kryteria.</p>';
            return;
        }
        matches.forEach(match => {
            const matchDiv = document.createElement('div');
            matchDiv.className = 'match-item';
            // Zmiana: zamiast otwierać modal, przechodzimy do nowej strony
            matchDiv.addEventListener('click', () => {
                window.location.href = `/match?url=${encodeURIComponent(match.matchUrl)}`;
            });
            matchDiv.innerHTML = `
                <div class="match-teams">
                    <span class="team-name">${match.team1}</span> <span class="vs">VS</span> <span class="team-name">${match.team2}</span>
                </div>
                <div class="match-meta">
                    <span class="event-name">${match.eventName}</span>
                    <span class="match-date">${match.date}</span>
                </div>
            `;
            matchesContainer.appendChild(matchDiv);
        });
    }
    
    function populateEventFilter(matches) {
        const eventNames = [...new Set(matches.map(m => m.eventName).filter(name => name))];
        eventNames.sort();
        eventFilter.innerHTML = '<option value="">Wszystkie wydarzenia</option>';
        eventNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            eventFilter.appendChild(option);
        });
    }

    function applyFilters() {
        let filteredMatches = [...allMatches];
        const selectedEvent = eventFilter.value;
        if (selectedEvent) filteredMatches = filteredMatches.filter(m => m.eventName === selectedEvent);
        const dateFrom = dateFromFilter.value;
        if (dateFrom) filteredMatches = filteredMatches.filter(m => new Date(m.date) >= new Date(dateFrom));
        const dateTo = dateToFilter.value;
        if (dateTo) filteredMatches = filteredMatches.filter(m => new Date(m.date) <= new Date(dateTo));
        renderMatches(filteredMatches);
    }

    async function init() {
        loader.style.display = 'block';
        try {
            const response = await fetch('/api/matches');
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Nie udało się załadować danych.');
            }
            allMatches = await response.json();
            renderMatches(allMatches);
            populateEventFilter(allMatches);
        } catch (error) {
            matchesContainer.innerHTML = `<p style="text-align: center;">Wystąpił błąd: ${error.message}</p>`;
        } finally {
            loader.style.display = 'none';
        }
    }

    eventFilter.addEventListener('change', applyFilters);
    dateFromFilter.addEventListener('change', applyFilters);
    dateToFilter.addEventListener('change', applyFilters);
    resetFiltersBtn.addEventListener('click', () => {
        eventFilter.value = '';
        dateFromFilter.value = '';
        dateToFilter.value = '';
        renderMatches(allMatches);
    });

    init();
});