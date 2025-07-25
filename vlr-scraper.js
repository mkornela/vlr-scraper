const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://www.vlr.gg';

async function fetchPage(url) {
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        return cheerio.load(data);
    } catch (error) {
        console.error(`Błąd podczas pobierania strony ${url}:`, error.message);
        return null;
    }
}

async function getUpcomingMatches() {
    const $ = await fetchPage(`${BASE_URL}/matches`);
    if (!$) return [];

    const matches = [];
    $('a.match-item').each((i, el) => {
        const time = $(el).find('.match-item-time').text().trim();
        if (!time) return;

        const url = $(el).attr('href');
        const teamNodes = $(el).find('.match-item-vs-team-name');
        const teams = `${teamNodes.first().text().trim()} vs ${teamNodes.last().text().trim()}`;
        const event = $(el).find('.match-item-event').text().trim().replace(/\s+/g, ' ').split('\n')[0].trim();

        matches.push({ teams, time, event, url: `${BASE_URL}${url}` });
    });
    return matches;
}

async function getMatchDetails(url) {
    const $ = await fetchPage(url);
    if (!$) return null;

    const matchData = {};
    const header = $('.match-header');
    
    matchData.isLive = header.find('.match-header-vs-note.mod-live').text().trim().toUpperCase() === 'LIVE';

    const eventLink = header.find('a.match-header-event');
    const dateContainer = header.find('.match-header-date');

    matchData.event = {
        name: eventLink.find('div > div').first().text().trim() || 'N/A',
        subname: eventLink.find('.match-header-event-series').text().replace(/\s+/g, ' ').trim() || 'N/A',
        url: BASE_URL + (eventLink.attr('href') || '')
    };
    
    matchData.date = dateContainer.find('.moment-tz-convert').first().text().trim();
    matchData.hour = dateContainer.find('.moment-tz-convert').last().text().trim();
    
    const scoreElement = header.find('.match-header-vs-score .js-spoiler').first();
    const scoreText = scoreElement.find('span:not(.match-header-vs-score-colon)').map((i, el) => $(el).text().trim()).get();
    
    if (scoreText.length === 2 && scoreText.every(s => /^\d+$/.test(s))) {
        matchData.score = `${scoreText[0]} - ${scoreText[1]}`;
    } else {
        matchData.score = 'vs';
    }

    const team1Name = header.find('.wf-title-med').first().text().trim();
    const team2Name = header.find('.wf-title-med').last().text().trim();
    matchData.team1 = { name: team1Name, logo: 'https:' + (header.find('a.match-header-link').first().find('img').attr('src') || '') };
    matchData.team2 = { name: team2Name, logo: 'https:' + (header.find('a.match-header-link').last().find('img').attr('src') || '') };
    
    const statsContainer = $('.vm-stats-game[data-game-id="all"]');
    [matchData.team1, matchData.team2].forEach((team, index) => {
        team.players = [];
        const tableBody = statsContainer.find('tbody').eq(index);
        tableBody.find('tr').each((i, row) => {
            const playerCells = $(row).find('td');
            if (playerCells.length === 0) return;

            const playerInfoCell = $(playerCells[0]);
            const nameAndAbbr = playerInfoCell.find('a');
            const playerName = nameAndAbbr.find('div.text-of').text().trim();
            const teamAbbreviation = nameAndAbbr.find('div.ge-text-light').text().trim();

            const flagElement = playerInfoCell.find('i.flag');
            const countryName = flagElement.attr('title') || 'N/A';
            
            const player = {
                name: playerName,
                abbreviation: teamAbbreviation,
                country: countryName,
            };
            team.players.push(player);
        });

        if (team.players.length > 0 && team.players[0].abbreviation) {
            team.abbreviation = team.players[0].abbreviation;
        } else {
            const teamNameContainer = header.find('.match-header-link-name').eq(index);
            team.abbreviation = teamNameContainer.find('div[style*="font-size: 12px"]').text().replace(/[()]/g, '').trim() || team.name.substring(0, 3).toUpperCase();
        }
    });

    return matchData;
}


module.exports = {
    getUpcomingMatches,
    getMatchDetails
};