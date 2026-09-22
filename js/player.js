/* player.js — fiche joueur V2 */

async function loadJsonRobust(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Impossible de charger ${path}`);
  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") return Object.values(parsed);
  } catch {}
  return text.split(/\r?\n/).filter(Boolean).flatMap(line => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

function getPlayerId() {
  return Number(new URLSearchParams(window.location.search).get("id"));
}

function computeOutcome(match, clubPrefix) {
  const isTeam1 = match.team1.includes(clubPrefix);
  const res = (match.result || "").toLowerCase();
  if (res === "draw") return "draw";
  if (res === "win") return isTeam1 ? "win" : "loss";
  if (res === "loss") return isTeam1 ? "loss" : "win";
  return "draw";
}

function positionLabel(position) {
  return ({
    goal: "Gardien",
    defender: "Défenseur",
    midfielder: "Milieu",
    striker: "Attaquant"
  })[position] || "Joueur";
}

let matches = [], players = [], goals = [], attendance = [];
let pieChart = null;
let currentPlayer = null;

const COLORS = {
  red: "#c91524",
  green: "#198754",
  ink: "#17191d",
  muted: "#737b87"
};

function filterMatchesForPlayer() {
  const teamFilter = document.getElementById("teamFilter").value;
  const typeFilter = document.getElementById("matchTypeFilter").value;

  return matches.filter(m => {
    const teamMatch = teamFilter === "all" || m.team1 === teamFilter || m.team2 === teamFilter;
    const typeMatch =
      typeFilter === "all" ||
      (typeFilter === "official" && (m.type === "League" || m.type === "Cup")) ||
      (typeFilter === "league" && m.type === "League") ||
      (typeFilter === "cup" && m.type === "Cup") ||
      (typeFilter === "friendly" && m.type === "Friendly");

    const attended = attendance.some(a =>
      a.matchId === m.id && a.player === currentPlayer.name && a.present
    );

    return teamMatch && typeMatch && attended;
  });
}

function countWDL(ms) {
  let w = 0, d = 0, l = 0;
  for (const m of ms) {
    const clubPrefix = m.team1.includes("Rojiblanca") ? m.team1 : m.team2;
    const outcome = computeOutcome(m, clubPrefix);
    if (outcome === "win") w++;
    else if (outcome === "loss") l++;
    else d++;
  }
  return { w, d, l };
}

function countGoalsAssists() {
  const matchIds = new Set(filterMatchesForPlayer().map(m => m.id));
  let goalsCount = 0, assistsCount = 0;

  for (const g of goals) {
    if (!matchIds.has(g.matchId)) continue;
    if (g.goal === currentPlayer.name) goalsCount++;
    if (g.assist === currentPlayer.name) assistsCount++;
  }
  return { goalsCount, assistsCount };
}

function computeRanks() {
  const teamFilter = document.getElementById("teamFilter").value;
  const typeFilter = document.getElementById("matchTypeFilter").value;

  const filteredMatches = matches.filter(m => {
    const teamMatch = teamFilter === "all" || m.team1 === teamFilter || m.team2 === teamFilter;
    const typeMatch =
      typeFilter === "all" ||
      (typeFilter === "official" && (m.type === "League" || m.type === "Cup")) ||
      (typeFilter === "league" && m.type === "League") ||
      (typeFilter === "cup" && m.type === "Cup") ||
      (typeFilter === "friendly" && m.type === "Friendly");
    return teamMatch && typeMatch;
  });

  const matchIds = new Set(filteredMatches.map(m => m.id));
  const stats = {};

  for (const p of players) stats[p.name] = { name: p.name, goals: 0, assists: 0, total: 0 };

  for (const g of goals) {
    if (!matchIds.has(g.matchId)) continue;
    if (g.goal && stats[g.goal]) stats[g.goal].goals++;
    if (g.assist && stats[g.assist]) stats[g.assist].assists++;
  }

  const values = Object.values(stats);
  values.forEach(s => s.total = s.goals + s.assists);

  function rank(key1, key2) {
    const sorted = [...values].sort((a, b) => b[key1] - a[key1] || b[key2] - a[key2]);
    const ranks = {};
    let currentRank = 1;
    sorted.forEach((item, i) => {
      if (i > 0 && (item[key1] !== sorted[i - 1][key1] || item[key2] !== sorted[i - 1][key2])) {
        currentRank = i + 1;
      }
      ranks[item.name] = currentRank;
    });
    return ranks[currentPlayer.name] || "-";
  }

  return {
    goals: rank("goals", "assists"),
    assists: rank("assists", "goals"),
    total: rank("total", "goals")
  };
}

function pct(value, total) {
  return total ? Math.round(value / total * 100) : 0;
}

function updateHeader() {
  const initials = currentPlayer.name.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase();
  document.getElementById("playerAvatar").textContent = initials;
  document.getElementById("playerName").textContent = currentPlayer.name;
  document.getElementById("playerMeta").textContent =
    `#${currentPlayer.number} · ${positionLabel(currentPlayer.position)} · fiche individuelle`;
}

function updateSummary(ms, wdl, goalsCount, assistsCount) {
  const totalActions = goalsCount + assistsCount;
  const summary = document.getElementById("player-summary");

  const cards = [
    { value: ms.length, label: "Matchs joués" },
    { value: wdl.w, label: "Victoires", rate: `${pct(wdl.w, ms.length)} %` },
    { value: goalsCount, label: "Buts", rate: ms.length ? `${(goalsCount / ms.length).toFixed(2)} / match` : "0 / match" },
    { value: assistsCount, label: "Passes décisives", rate: `${totalActions} actions` }
  ];

  summary.innerHTML = cards.map(card => `
    <article class="player-summary-card">
      <div class="player-summary-value">${card.value}</div>
      <div>
        <div class="player-summary-label">${card.label}</div>
        ${card.rate ? `<div class="player-summary-rate">${card.rate}</div>` : ""}
      </div>
    </article>
  `).join("");
}

function updateRanks(ranks) {
  const rows = [
    ["B", "Rang buteurs", ranks.goals],
    ["P", "Rang passeurs", ranks.assists],
    ["Σ", "Rang buts + passes", ranks.total]
  ];

  document.getElementById("ranks").innerHTML = rows.map(row => `
    <div class="player-rank">
      <div class="player-rank-mark">${row[0]}</div>
      <div class="player-rank-label">${row[1]}</div>
      <div class="player-rank-value">${row[2]}</div>
    </div>
  `).join("");
}

function updatePerformance(goalsCount, assistsCount, matchesPlayed) {
  const total = goalsCount + assistsCount;
  document.getElementById("player-stats-grid").innerHTML = `
    <article class="player-performance">
      <div class="player-performance-label">Buts</div>
      <div class="player-performance-value">${goalsCount}</div>
      <div class="player-performance-detail">Moyenne : ${matchesPlayed ? (goalsCount / matchesPlayed).toFixed(2) : "0.00"} / match</div>
    </article>
    <article class="player-performance">
      <div class="player-performance-label">Passes</div>
      <div class="player-performance-value">${assistsCount}</div>
      <div class="player-performance-detail">Moyenne : ${matchesPlayed ? (assistsCount / matchesPlayed).toFixed(2) : "0.00"} / match</div>
    </article>
    <article class="player-performance">
      <div class="player-performance-label">Buts + passes</div>
      <div class="player-performance-value">${total}</div>
      <div class="player-performance-detail">Total combiné</div>
    </article>
  `;
}

function updateChart(wdl) {
  const ctx = document.getElementById("pieWDL").getContext("2d");
  if (pieChart) pieChart.destroy();

  const total = wdl.w + wdl.d + wdl.l;
  pieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Victoires", "Nuls", "Défaites"],
      datasets: [{
        data: [wdl.w, wdl.d, wdl.l],
        backgroundColor: [COLORS.green, "#d7dbe0", COLORS.red],
        borderColor: "#fff",
        borderWidth: 4,
        hoverOffset: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: COLORS.ink,
            usePointStyle: true,
            pointStyle: "circle",
            padding: 18,
            font: { family: "Inter", size: 11, weight: "700" },
            generateLabels() {
              const labels = ["Victoires", "Nuls", "Défaites"];
              const values = [wdl.w, wdl.d, wdl.l];
              const colors = [COLORS.green, "#d7dbe0", COLORS.red];
              return labels.map((label, i) => ({
                text: `${label}  ${pct(values[i], total)}%`,
                fillStyle: colors[i],
                strokeStyle: colors[i],
                lineWidth: 0,
                pointStyle: "circle",
                hidden: false,
                index: i
              }));
            }
          }
        },
        tooltip: {
          callbacks: {
            label: item => ` ${item.label} : ${item.raw} match${item.raw > 1 ? "s" : ""} (${pct(item.raw, total)}%)`
          }
        }
      }
    }
  });
}

function updatePage() {
  const ms = filterMatchesForPlayer();
  const wdl = countWDL(ms);
  const { goalsCount, assistsCount } = countGoalsAssists();
  const ranks = computeRanks();

  updateSummary(ms, wdl, goalsCount, assistsCount);
  updateRanks(ranks);
  updatePerformance(goalsCount, assistsCount, ms.length);
  updateChart(wdl);
}

async function initPlayerPage() {
  const id = getPlayerId();
  if (!id) return;

  try {
    [matches, players, goals, attendance] = await Promise.all([
      loadJsonRobust("data/matchs.json"),
      loadJsonRobust("data/players.json"),
      loadJsonRobust("data/goals.json"),
      loadJsonRobust("data/attendance.json")
    ]);

    currentPlayer = players.find(p => p.id === id);
    if (!currentPlayer) return;

    updateHeader();
    document.getElementById("teamFilter").addEventListener("change", updatePage);
    document.getElementById("matchTypeFilter").addEventListener("change", updatePage);
    updatePage();
  } catch (error) {
    console.error(error);
  }
}

initPlayerPage();
