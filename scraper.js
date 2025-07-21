const puppeteer = require('puppeteer');

async function getMatchList(browser) {
    const basicMatches = [];
    const page = await browser.newPage();
    try {
        for (let pageNum = 1; pageNum <= 5; pageNum++) {
            const url = `https://www.vlr.gg/matches/?page=${pageNum}`;
            console.log(`[Scraper] Pobieram listę z: ${url}`);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForSelector('.wf-module-item.match-item', { timeout: 15000 });
            await page.setRequestInterception(true)
            page.on('request', (request) => {
              if (request.resourceType() === 'image') request.abort()
              else request.continue()
            })
            
            const matchesOnPage = await page.evaluate(() => {
                const results = [];
                let currentDate = '';
                document.querySelectorAll('.col.mod-1 > div').forEach(element => {
                    if (element.matches('.wf-label.mod-large')) {
                        currentDate = element.textContent.trim().replace(/\s+Today\s*$/, '').trim();
                    }
                    if (element.matches('.wf-card')) {
                        element.querySelectorAll('a.wf-module-item.match-item').forEach(card => {
                            
                            let eventName = 'N/A';
                            const eventElement = card.querySelector('.match-item-event');
                            if (eventElement) {
                                const eventClone = eventElement.cloneNode(true);
                                const seriesElement = eventClone.querySelector('.match-item-event-series');
                                if (seriesElement) {
                                    seriesElement.remove();
                                }
                                eventName = eventClone.textContent.trim().replace(/\s+/g, ' ');
                            }

                            results.push({
                                team1: card.querySelector('.match-item-vs-team-name .text-of')?.textContent.trim() || 'TBD',
                                team2: card.querySelectorAll('.match-item-vs-team-name .text-of')[1]?.textContent.trim() || 'TBD',
                                eventName: eventName,
                                matchUrl: card.href,
                                date: currentDate,
                            });
                        });
                    }
                });
                return results;
            });
            basicMatches.push(...matchesOnPage);
        }
    } finally {
        await page.close();
    }
    return basicMatches;
}

async function getMatchDetails(browser, matchUrl) {
    console.log(`[Scraper] Pobieram szczegóły z: ${matchUrl}`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    try {
        await page.goto(matchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('.match-header', { timeout: 15000 });

        return await page.evaluate(() => {
            const getText = (el, sel) => el?.querySelector(sel)?.textContent.trim() || '';
            const getAttr = (el, sel, attr) => el?.querySelector(sel)?.getAttribute(attr) || '';
            
            const headerEl = document.querySelector('.match-header');
            const eventInfo = { name: getText(headerEl, '.match-header-event div > div'), series: getText(headerEl, '.match-header-event-series'), logoUrl: `https:${getAttr(headerEl, '.match-header-event img', 'src')}` };
            const team1Info = { name: getText(headerEl, '.match-header-link.mod-1 .wf-title-med'), logoUrl: `https:${getAttr(headerEl, '.match-header-link.mod-1 img', 'src')}` };
            const team2Info = { name: getText(headerEl, '.match-header-link.mod-2 .wf-title-med'), logoUrl: `https:${getAttr(headerEl, '.match-header-link.mod-2 img', 'src')}` };
            const scoreEl = headerEl.querySelector('.match-header-vs-score');
            const score = { team1: scoreEl.querySelector('.js-spoiler span:nth-child(1)')?.textContent.trim() || '–', team2: scoreEl.querySelector('.js-spoiler span:nth-child(3)')?.textContent.trim() || '–', status: getText(scoreEl, '.match-header-vs-note span') || getText(scoreEl, '.match-header-vs-note') };
            const matchFormat = headerEl.querySelectorAll('.match-header-vs-note')[1]?.textContent.trim() || 'N/A';
            const matchDate = getAttr(headerEl, '.moment-tz-convert', 'data-utc-ts');
            const streams = Array.from(document.querySelectorAll('.match-streams-container a, .match-streams-btn.mod-embed')).map(el => { let name = (el.querySelector('span')?.textContent || el.textContent).trim(); const link = el.href || el.closest('a')?.href; if (!name && link && link.includes('twitch.tv')) { const channel = link.split('/').pop(); name = `TTV - ${channel}`; } return { name, link }; });
            const statsContainer = document.querySelector('.vm-stats-container');
            const hasStats = !!statsContainer.querySelector('.wf-table-inset');
            let mapsData = [];
            if (hasStats) { const parseStatsTable = (tableEl) => { if (!tableEl) return []; const players = []; tableEl.querySelectorAll('tbody tr').forEach(rowEl => { const playerName = getText(rowEl, '.mod-player a div:first-child'); if (!playerName) return; const getOverallStat = (col) => { const cell = rowEl.querySelector(`td:nth-child(${col})`); if (!cell) return '–'; const overallSpan = cell.querySelector('.side.mod-both'); return (overallSpan ? overallSpan.textContent.trim() : cell.textContent.trim()) || '–'; }; players.push({ name: playerName, flag: rowEl.querySelector('.mod-player i.flag')?.className.split(' ').pop().replace('mod-', '') || '', agents: Array.from(rowEl.querySelectorAll('.mod-agents img')).map(img => img.src), stats: { R: getOverallStat(3), ACS: getOverallStat(4), K: getOverallStat(5), D: getOverallStat(6), A: getOverallStat(7), KD_diff: getOverallStat(8), KAST: getOverallStat(9), ADR: getOverallStat(10), HS_percent: getOverallStat(11), FK: getOverallStat(12), FD: getOverallStat(13), FK_FD_diff: getOverallStat(14), } }); }); return players; }; statsContainer.querySelectorAll('.vm-stats-game').forEach(mapEl => { const mapName = getText(mapEl, '.map span'); if (mapName === 'All Maps' || !mapName) return; const scores = Array.from(mapEl.querySelectorAll('.team .score')).map(s => s.textContent.trim()); const tables = mapEl.querySelectorAll('.wf-table-inset.mod-overview'); mapsData.push({ name: mapName, score: { team1: scores[0] || '0', team2: scores[1] || '0' }, stats: { team1: tables.length > 0 ? parseStatsTable(tables[0]) : [], team2: tables.length > 1 ? parseStatsTable(tables[1]) : [], } }); });
            } else { mapsData = Array.from(document.querySelectorAll('.vm-stats-gamesnav-item:not(.mod-all)')).map(item => ({ name: item.textContent.replace(/\d/g, '').trim(), score: { team1: '–', team2: '–' }, stats: { team1: [], team2: [] } })); }
            return { event: eventInfo, team1: team1Info, team2: team2Info, score, matchDate, matchFormat, streams, maps: mapsData };
        });
    } finally {
        await page.close();
    }
}

module.exports = { getMatchList, getMatchDetails };