const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer');
const scraper = require('./scraper');

const app = express();
const PORT = 7915;

const cache = {
    matchList: [],
    matchDetails: {},
};
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

let browserInstance;

async function refreshMatchListCache() {
    console.log('[Cache] Rozpoczynam odświeżanie listy meczów...');
    try {
        const matches = await scraper.getMatchList(browserInstance);
        cache.matchList = matches;
        console.log(`[Cache] Pomyślnie zaktualizowano. Znaleziono ${matches.length} meczów.`);
    } catch (error) {
        console.error("[Cache] Błąd podczas odświeżania listy meczów:", error);
    }
}

app.use(express.static('public'));

const getTimeUntil = (utcDateString) => {
    if (!utcDateString) return "wkrótce";
    const matchDate = new Date(utcDateString);
    const now = new Date();
    const diffMs = matchDate - now;
    if (diffMs < 0) return "TERAZ";
    const days = Math.floor(diffMs / 86400000);
    const hours = Math.floor((diffMs % 86400000) / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h ${minutes}m`;
};
const formatDateTimeShort = (utcDateString) => {
    if (!utcDateString) return "brak daty";
    return new Date(utcDateString).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};
const formatTimeShort = (utcDateString) => {
    if (!utcDateString) return "brak godziny";
    return new Date(utcDateString).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
};

app.get('/api/matches', (req, res) => {
    if (cache.matchList.length === 0) {
        return res.status(503).json({ error: "Dane są w trakcie przygotowywania. Spróbuj ponownie za chwilę." });
    }
    res.json(cache.matchList);
});

app.get('/api/match', async (req, res) => {
    const matchUrl = req.query.url;
    if (!matchUrl) return res.status(400).json({ error: "Brak parametru 'url'." });
    if (cache.matchDetails[matchUrl]) return res.json(cache.matchDetails[matchUrl]);

    try {
        const details = await scraper.getMatchDetails(browserInstance, matchUrl);
        cache.matchDetails[matchUrl] = details;
        res.json(details);
    } catch (error) {
        res.status(500).json({ error: "Nie udało się pobrać szczegółów meczu." });
    }
});

app.get('/api/all-data', (req, res) => {
    console.log('[API] Serwowanie wszystkich zcache\'owanych danych jako JSON.');
    
    const combinedData = cache.matchList.map(match => {
        const details = cache.matchDetails[match.matchUrl];
        if (details) {
            return { ...match, details };
        }
        return match;
    });

    res.json(combinedData);
});

app.get('/match', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'match.html'));
});

app.get('/api/matchToChat', async (req, res) => {
    const { event: eventQuery, country: countryQuery } = req.query;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    if (!eventQuery) {
        return res.status(400).send('BŁĄD: Podaj nazwę wydarzenia, np. ?event=VCT 2025: EMEA Stage 2');
    }

    const countryCodeToUnicodeFlag = (code) => {
        if (!code || code.length !== 2) return '🏳️';
        return code.toUpperCase().split('').map(char => String.fromCodePoint(char.charCodeAt(0) + 127397)).join('');
    };
    
    const allEventMatches = cache.matchList.filter(m => m.eventName.toLowerCase().includes(eventQuery.toLowerCase()));
    if (allEventMatches.length === 0) {
        return res.status(404).send(`BŁĄD: Nie znaleziono meczów pasujących do zapytania: "${eventQuery}"`);
    }

    const nextMatch = allEventMatches[0];
    if (!nextMatch) {
         return res.status(404).send(`BŁĄD: Wszystkie mecze dla "${eventQuery}" już się odbyły.`);
    }

    try {
        let details = cache.matchDetails[nextMatch.matchUrl];
        if (!details) {
            details = await scraper.getMatchDetails(browserInstance, nextMatch.matchUrl);
            cache.matchDetails[nextMatch.matchUrl] = details;
        }

        const { team1, team2, score, maps } = details;
        
        const formatRoster = (players, countryFilter) => {
            if (!players || players.length === 0) return 'Skład niepotwierdzony';

            let playersToFormat = players;

            if (countryFilter) {
                playersToFormat = players.filter(p => p.flag.toLowerCase() === countryFilter.toLowerCase());
                if (playersToFormat.length === 0) {
                    return `Brak polaków`;
                }
            }
            
            return playersToFormat.map(p => {
                const flagEmoji = countryCodeToUnicodeFlag(p.flag);
                return `${flagEmoji} ${p.name}`;
            }).join(' ');
        };

        const team1Roster = formatRoster(maps[0]?.stats?.team1, countryQuery);
        const team2Roster = formatRoster(maps[0]?.stats?.team2, countryQuery);

        const chatString = `${TEAMS[team1.name]} vs ${TEAMS[team2.name]} za ${score.status} | ${TEAMS[team1.name]} -> ${team1Roster} | ${TEAMS[team2.name]} -> ${team2Roster}`.trim();

        res.send(chatString);

    } catch (error) {
        console.error(`Błąd w /api/matchToChat dla eventu ${eventQuery}:`, error);
        res.status(500).send("BŁĄD: Nie udało się pobrać szczegółów meczu.");
    }
});

app.get('/api/nextmatch', async (req, res) => {
    const { event: eventQuery } = req.query;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    if (!eventQuery) {
        return res.status(400).send('BŁĄD: Podaj nazwę wydarzenia, np. ?event=VCT EMEA');
    }

    const nextMatch = cache.matchList.find(m => m.eventName.toLowerCase().includes(eventQuery.toLowerCase()));

    if (!nextMatch) {
        return res.status(404).send(`Nie znaleziono nadchodzących meczy dla wydarzenia: "${eventQuery}". Sprawdź, czy nazwa jest poprawna.`);
    }

    try {
        let details = cache.matchDetails[nextMatch.matchUrl];
        if (!details) {
            details = await scraper.getMatchDetails(browserInstance, nextMatch.matchUrl);
            cache.matchDetails[nextMatch.matchUrl] = details;
        }

        const date = formatDateTimeShort(details.matchDate);
        const timeUntil = getTimeUntil(details.matchDate);
        const result = `Następny mecz na "${nextMatch.eventName}" to: ${details.team1.name} vs ${details.team2.name} za ${timeUntil} (${date})`;
        
        res.send(result);
    } catch (error) {
        res.status(500).send("Błąd podczas pobierania szczegółów meczu.");
    }
});

app.get('/api/dailymatches', async (req, res) => {
    const { event: eventQuery } = req.query;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    if (!eventQuery) {
        return res.status(400).send('BŁĄD: Podaj nazwę wydarzenia, np. ?event=VCT EMEA');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyMatches = cache.matchList.filter(match => {
        if (!match.eventName || !match.date) return false;
        if (!match.eventName.toLowerCase().includes(eventQuery.toLowerCase())) return false;
        
        const matchDate = new Date(match.date);
        matchDate.setHours(0, 0, 0, 0);
        return matchDate.getTime() === today.getTime();
    });

    if (dailyMatches.length === 0) {
        return res.send(`Nie znaleziono na dzisiaj żadnych meczy dla wydarzenia: "${eventQuery}".`);
    }

    try {
        const detailedMatches = await Promise.all(dailyMatches.map(async match => {
            let details = cache.matchDetails[match.matchUrl];
            if (!details) {
                details = await scraper.getMatchDetails(browserInstance, match.matchUrl);
                cache.matchDetails[match.matchUrl] = details;
            }
            return { ...match, details };
        }));

        detailedMatches.sort((a, b) => new Date(a.details.matchDate) - new Date(b.details.matchDate));

        const matchesStrings = detailedMatches.map(match => {
            const time = formatTimeShort(match.details.matchDate);
            return `${time} ${match.team1} vs ${match.team2}`;
        });

        const result = `Dzisiejsze mecze dla "${eventQuery}": ${matchesStrings.join(' | ')}`;
        res.send(result);

    } catch (error) {
        res.status(500).send("Błąd podczas pobierania szczegółów meczów na dziś.");
    }
});

async function startServer() {
    browserInstance = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    app.listen(PORT, () => {
        console.log(`Serwer uruchomiony na http://localhost:${PORT}`);
    });
    await refreshMatchListCache();
    setInterval(refreshMatchListCache, REFRESH_INTERVAL_MS);
}

startServer();