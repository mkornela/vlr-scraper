<div align="center">

# VLR.gg Scraper & Web App

<p align="center">
  <img alt="GitHub language count" src="https://img.shields.io/github/languages/count/mkornela/vlr-scraper-app?color=%23ff4655">
  <img alt="GitHub top language" src="https://img.shields.io/github/languages/top/mkornela/vlr-scraper-app?color=%23ff4655">
  <img alt="GitHub last commit" src="https://img.shields.io/github/last-commit/mkornela/vlr-scraper-app?color=%23ff4655">
  <img alt="GitHub" src="https://img.shields.io/github/license/mkornela/vlr-scraper-app?color=%23ff4655">
</p>
</div>

<!-- ZMIEŃ PONIŻEJ NA ZRZUT EKRANU SWOJEJ APLIKACJI -->
<!-- ![Project Screenshot](https://link.do.twojego/zrzutu-ekranu.png) -->

## O Projekcie

Aplikacja w Node.js, która scrapuje dane o meczach Valorant ze strony **vlr.gg** i udostępnia je w dwojaki sposób:
1.  Przez **interfejs webowy** z dynamicznym filtrowaniem listy nadchodzących meczów.
2.  Przez **REST API** zwracające dane w formacie JSON oraz specjalnie sformatowany tekst dla botów czatowych.

Aplikacja została stworzona z myślą o lekkości i wydajności, wykorzystując `cheerio` do parsowania po stronie serwera bez konieczności używania ciężkich przeglądarek headless.

## Funkcje

-   ✅ Pobieranie listy nadchodzących i trwających meczów
-   ✅ Scrapowanie szczegółowych danych meczu (składy, statystyki, wynik, mapy)
-   ✅ Interfejs webowy z dynamicznym filtrowaniem
-   ✅ REST API udostępniające dane w formacie JSON
-   ✅ Specjalny endpoint dla botów czatowych (np. na Twitchu)
-   ✅ Automatyczna konwersja czasu na strefę czasową Polski (Europe/Warsaw)

## Zbudowane przy użyciu

-   [Node.js](https://nodejs.org/)
-   [Express.js](https://expressjs.com/)
-   [Cheerio](https://cheerio.js.org/)
-   [Axios](https://axios-http.com/)
-   [Moment.js](https://momentjs.com/)

## Pierwsze Kroki

Aby uruchomić projekt lokalnie, postępuj zgodnie z poniższymi krokami.

### Wymagania

-   Node.js (wersja 14.x lub nowsza)
-   npm

### Instalacja

1.  Sklonuj repozytorium
    ```bash
    git clone https://github.com/mkornela/vlr-scraper-app.git
    ```
2.  Przejdź do folderu projektu
    ```bash
    cd vlr-scraper-app
    ```
3.  Zainstaluj zależności
    ```bash
    npm install
    ```

## Użycie

Uruchom serwer za pomocą polecenia:
```bash
node server.js
```

Aplikacja będzie dostępna pod adresem http://localhost:7915.

API Endpoints

1. Pobierz nadchodzące mecze
Zwraca listę nadchodzących i trwających meczów.
URL: /api/upcoming
Metoda: GET
Przykład odpowiedzi:
[
  {
    "teams": "Team Liquid vs Natus Vincere",
    "time": "5:00 PM",
    "event": "VCT 2025: EMEA Stage 2",
    "url": "https://www.vlr.gg/511551/team-liquid-vs-natus-vincere-vct-2025-emea-stage-2-w2"
  }
]


2. Pobierz szczegóły meczu
Zwraca szczegółowe dane dla konkretnego meczu.
URL: /api/match/:id/:slug
Metoda: GET
Przykład użycia:
/api/match/511551/team-liquid-vs-natus-vincere-vct-2025-emea-stage-2-w2

Przykład odpowiedzi:
{
  "event": {
    "name": "VCT 2025: EMEA Stage 2",
    "subname": "Group Stage: Week 3"
  },
  "date": "Thursday, July 24th",
  "hour": "5:00 PM CEST",
  "score": "vs",
  "team1": {
    "name": "Team Liquid",
    "abbreviation": "TL",
    "players": [
        {
            "name": "kamo",
            "country": "Poland",
            "flagLink": "https://www.vlr.gg/img/icons/flags/16/pl.png",
            "...": "..."
        }
    ]
  },
  "...": "..."
}

3. Wyświetl dane dla bota
Zwraca sformatowany tekst, idealny do wyświetlenia na czacie.
URL: /api/display
Metoda: GET
Parametry:
Parametr	Typ	Opis	Domyślnie
event	string	(Wymagany) Słowo kluczowe do filtrowania turniejów (np. emea, japan).	-
count	number	Liczba meczów do wyświetlenia (max. 5).	2
displayPlayersFrom	string	Wyświetla nicki graczy z podanego kraju obok skrótu drużyny (np. Poland, Finland).	-

Przykład użycia:
/api/display?event=emea&count=2&displayPlayersFrom=Poland

Przykład odpowiedzi:
24/07/2025 | 17:00 TL (kamo, paTiTek) vs NAVI || 20:00 M8 (kamyk) vs TH
```