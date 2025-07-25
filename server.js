const express = require('express');
const path = require('path');
const moment = require('moment-timezone');
const { getCode } = require('country-list');
const vlr = require('./vlr-scraper');

const app = express();
const PORT = process.env.PORT || 7915;

app.use(express.static(path.join(__dirname, 'public')));

function getFlagEmoji(countryName) {
    const countryCode = getCode(countryName);
    if (!countryCode) return '';
    
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

function convertToPolishDateTime(dateString, timeString) {
    if (!dateString || !timeString) {
        return null;
    }
    try {
        const combinedString = `${dateString} ${timeString}`;
        const format = "dddd, MMMM Do h:mm a z";
        
        const dt = moment.tz(combinedString, format, 'en', 'Europe/Helsinki');
        
        if (!dt.isValid()) {
            return null;
        }

        const polishDt = dt.clone().tz('Europe/Warsaw');
        return {
            date: polishDt.format('DD/MM/YYYY'),
            time: polishDt.format('HH:mm')
        };
    } catch (e) {
        return null;
    }
}

app.get('/api/display', async (req, res) => {
    try {
        const { event, count, displayPlayersFrom } = req.query;

        if (!event) {
            return res.status(400).send('Błąd: Parametr "event" jest wymagany.');
        }

        let matchCount = parseInt(count, 10) || 2;
        if (matchCount > 5) matchCount = 5;

        const allMatches = await vlr.getUpcomingMatches();
        const filteredMatches = allMatches
            .filter(match => match.event.toLowerCase().includes(event.toLowerCase()))
            .slice(0, matchCount);

        if (filteredMatches.length === 0) {
            return res.status(404).send(`Nie znaleziono nadchodzących meczów dla wydarzenia: ${event}`);
        }

        const detailPromises = filteredMatches.map(match => vlr.getMatchDetails(match.url));
        const detailedMatches = await Promise.all(detailPromises);
        
        let lastDate = null;
        const chatResponseParts = detailedMatches.map((details) => {
            if (!details) {
                return "Błąd pobierania danych meczu"; // Zabezpieczenie przed null
            }
            let output = '';

            const getTeamDisplay = (team) => {
                let display = team.abbreviation;
                if (displayPlayersFrom && team.players) {
                    const players = team.players
                        .filter(p => p.country.toLowerCase() === displayPlayersFrom.toLowerCase())
                        .map(p => p.name);
                    
                    if (players.length > 0) {
                        const emoji = getFlagEmoji(displayPlayersFrom);
                        const emojiPart = emoji ? `${emoji} ` : '';
                        display += ` ( ${emojiPart}${players.join(', ')})`;
                    }
                }
                return display;
            };
            
            const team1Display = getTeamDisplay(details.team1);
            const team2Display = getTeamDisplay(details.team2);
            
            const dateTime = convertToPolishDateTime(details.date, details.hour);
            
            if (details.isLive) {
                const teams = `${team1Display} ${details.score} ${team2Display}`;
                if (dateTime && dateTime.date !== lastDate) {
                    output = `${dateTime.date} | [LIVE] ${teams}`;
                    lastDate = dateTime.date;
                } else {
                    output = `[LIVE] ${teams}`;
                }
            } else {
                const teams = `${team1Display} vs ${team2Display}`;
                if (dateTime) {
                    if (dateTime.date !== lastDate) {
                        output = `${dateTime.date} | ${dateTime.time} ${teams}`;
                        lastDate = dateTime.date;
                    } else {
                        output = `${dateTime.time} ${teams}`;
                    }
                } else {
                    output = `${details.hour.replace('CEST', '').trim()} ${teams}`;
                }
            }
            return output;
        });

        const chatResponse = chatResponseParts.join(' || ');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(chatResponse);

    } catch (error) {
        console.error('Błąd w /api/display:', error);
        res.status(200).send('Nie znaleziono meczów na podany event, lub wystąpił wewnętrzny błąd serwera.');
    }
});

// Reszta endpointów bez zmian
app.get('/api/upcoming', async (req, res) => {
    try {
        const matches = await vlr.getUpcomingMatches();
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: 'Nie udało się pobrać danych o nadchodzących meczach.' });
    }
});

app.get('/api/match/:id/:slug', async (req, res) => {
    const { id, slug } = req.params;
    const matchUrl = `https://www.vlr.gg/${id}/${slug}`;
    
    try {
        const details = await vlr.getMatchDetails(matchUrl);
        if (!details) {
            return res.status(404).json({ error: 'Nie znaleziono meczu.' });
        }
        res.json(details);
    } catch (error) {
        res.status(500).json({ error: `Nie udało się pobrać danych dla meczu: ${slug}` });
    }
});

app.get('/match/:id/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'match.html'));
});

app.get('/upcoming', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Serwer VLR.gg Scraper App nasłuchuje na http://localhost:${PORT}`);
});