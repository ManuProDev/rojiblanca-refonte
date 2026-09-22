/* stats.js — dashboard statistiques V2 */

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

function computeOutcome(match, clubPrefix) {
  const isTeam1 = match.team1.includes(clubPrefix);
  const res = (match.result || "").toLowerCase();
  if (res === "draw") return "draw";
  if (res === "win") return isTeam1 ? "win" : "loss";
  if (res === "loss") return isTeam1 ? "loss" : "win";
  return "draw";
}

function computeGoals(match, clubPrefix) {
  const isTeam1 = match.team1.includes(clubPrefix);
  return {
    gf: isTeam1 ? Number(match.goals1 || 0) : Number(match.goals2 || 0),
    ga: isTeam1 ? Number(match.goals2 || 0) : Number(match.goals1 || 0)
  };
}

let matches = [], goals = [], players = [];
let pieChart = null, barChart = null;

const COLORS = {
  red: "#c91524",
  green: "#198754",
  amber: "#c58b12",
  ink: "#17191d",
  muted: "#737b87",
  line: "#e4e7eb",
  softRed: "#fbe6e8"
};

function filterMatches() {
  const team = document.getElementById("teamFilter").value;
  const type = document.getElementById("matchTypeFilter").value;

  return matches.filter(m => {
    const isR7 = m.team1 === "Rojiblanca 7" || m.team2 === "Rojiblanca 7";
    const isR11 = m.team1 === "Rojiblanca 11" || m.team2 === "Rojiblanca 11";

    if (team === "Rojiblanca 7" && !isR7) return false;
    if (team === "Rojiblanca 11" && !isR11) return false;
    if (type === "official" && !(m.type === "League" || m.type === "Cup")) return false;
    if (type === "league" && m.type !== "League") return false;
    if (type === "cup" && m.type !== "Cup") return false;
    if (type === "friendly" && m.type !== "Friendly") return false;

    return true;
  });
}

function percent(value, total) {
  return total ? Math.round(value / total * 100) : 0;
}

function updateSummary({ played, wins, draws, losses, gf, ga }) {
  const diff = gf - ga;
  const summary = document.getElementById("statsSummary");

  const cards = [
    { value: played, label: "Matchs joués", cls: "" },
    { value: wins, label: "Victoires", rate: `${percent(wins, played)} %`, cls: "is-win" },
    { value: draws, label: "Nuls", rate: `${percent(draws, played)} %`, cls: "is-draw" },
    { value: losses, label: "Défaites", rate: `${percent(losses, played)} %`, cls: "is-loss" },
    { value: gf, label: "Buts marqués", cls: "" },
    { value: ga, label: "Buts encaissés", cls: "" },
    { value: diff > 0 ? `+${diff}` : diff, label: "Différence de buts", cls: "" }
  ];

  summary.innerHTML = cards.map(card => `
    <article class="data-kpi ${card.cls}">
      <div class="data-kpi-top"><span class="data-kpi-icon"></span>${card.rate ? `<span class="data-kpi-rate">${card.rate}</span>` : ""}</div>
      <div class="data-kpi-value">${card.value}</div>
      <div class="data-kpi-label">${card.label}</div>
    </article>
  `).join("");
}

function makeDoughnut(w, d, l) {
  const ctx = document.getElementById("pieWDL").getContext("2d");
  if (pieChart) pieChart.destroy();

  const total = w + d + l;
  pieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Victoires", "Nuls", "Défaites"],
      datasets: [{
        data: [w, d, l],
        backgroundColor: [COLORS.green, "#d7dbe0", COLORS.red],
        borderColor: "#ffffff",
        borderWidth: 4,
        hoverOffset: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "67%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: COLORS.ink,
            usePointStyle: true,
            pointStyle: "circle",
            padding: 18,
            font: { family: "Inter", size: 11, weight: "700" },
            generateLabels(chart) {
              const labels = ["Victoires", "Nuls", "Défaites"];
              const values = [w, d, l];
              const colors = [COLORS.green, "#d7dbe0", COLORS.red];
              return labels.map((label, i) => ({
                text: `${label}  ${percent(values[i], total)}%`,
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
            label: item => ` ${item.label} : ${item.raw} match${item.raw > 1 ? "s" : ""} (${percent(item.raw, total)}%)`
          }
        }
      }
    }
  });
}

function makeGoalsBar(gf, ga) {
  const ctx = document.getElementById("barGoals").getContext("2d");
  if (barChart) barChart.destroy();

  const max = Math.max(gf, ga, 1);
  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Buts marqués", "Buts encaissés"],
      datasets: [{
        data: [gf, ga],
        backgroundColor: [COLORS.green, COLORS.red],
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 42,
        maxBarThickness: 54
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      scales: {
        x: {
          beginAtZero: true,
          suggestedMax: max + Math.max(2, Math.ceil(max * .12)),
          grid: { color: "#edf0f2", drawBorder: false },
          border: { display: false },
          ticks: { color: COLORS.muted, font: { size: 10, weight: "600" }, precision: 0 }
        },
        y: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: COLORS.ink, font: { size: 11, weight: "700" } }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: { label: item => ` ${item.raw} buts` }
        }
      }
    }
  });
}

function updatePodium(filteredMatches) {
  const stats = {};
  for (const p of players) {
    stats[p.name] = { name: p.name, number: p.number, goals: 0, assists: 0 };
  }

  const ids = new Set(filteredMatches.map(m => m.id));
  for (const g of goals) {
    if (!ids.has(g.matchId)) continue;
    if (g.goal && stats[g.goal]) stats[g.goal].goals++;
    if (g.assist && stats[g.assist]) stats[g.assist].assists++;
  }

  const arr = Object.values(stats)
    .sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists))
    .slice(0, 3);

  document.getElementById("podium").innerHTML = arr.map((p, i) => `
    <article class="data-podium-item">
      <div class="data-podium-place">${i + 1}</div>
      <div>
        <div class="data-podium-name">${p.name}</div>
        <div class="data-podium-number">#${p.number} · ${p.goals} buts · ${p.assists} passes</div>
      </div>
      <div class="data-podium-score">${p.goals + p.assists}</div>
    </article>
  `).join("");
}

function updatePlayers(filteredMatches) {
  const stats = {};
  for (const p of players) {
    stats[p.name] = { name: p.name, id: p.id, number: p.number, goals: 0, assists: 0 };
  }

  const ids = new Set(filteredMatches.map(m => m.id));
  for (const g of goals) {
    if (!ids.has(g.matchId)) continue;
    if (g.goal && stats[g.goal]) stats[g.goal].goals++;
    if (g.assist && stats[g.assist]) stats[g.assist].assists++;
  }

  const arr = Object.values(stats).sort((a, b) =>
    (b.goals + b.assists) - (a.goals + a.assists) || b.goals - a.goals
  );

  document.getElementById("players-stats-grid").innerHTML = arr.map(p => {
    const initials = p.name.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase();
    const total = p.goals + p.assists;
    return `
      <article class="data-player-card" onclick="window.location='player.html?id=${p.id}'" tabindex="0"
        onkeydown="if(event.key==='Enter') window.location='player.html?id=${p.id}'">
        <div class="data-avatar">${initials}</div>
        <div>
          <div class="data-player-name">${p.name} <span style="color:#9aa1aa">#${p.number}</span></div>
          <div class="data-player-meta">${p.goals} buts · ${p.assists} passes</div>
        </div>
        <div class="data-player-total">${total}</div>
      </article>`;
  }).join("");
}

function updateStats() {
  const teamChoice = document.getElementById("teamFilter").value;
  const clubPrefix = teamChoice === "all" ? "Rojiblanca" : teamChoice;
  const filteredMatches = filterMatches().filter(m =>
    m.team1.includes("Rojiblanca") || m.team2.includes("Rojiblanca")
  );

  let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0;

  filteredMatches.forEach(m => {
    const outcome = computeOutcome(m, clubPrefix);
    if (outcome === "win") wins++;
    else if (outcome === "loss") losses++;
    else draws++;

    const g = computeGoals(m, clubPrefix);
    gf += g.gf;
    ga += g.ga;
  });

  const payload = { played: filteredMatches.length, wins, draws, losses, gf, ga };
  updateSummary(payload);
  makeDoughnut(wins, draws, losses);
  makeGoalsBar(gf, ga);
  updatePodium(filteredMatches);
  updatePlayers(filteredMatches);
}

async function initStats() {
  try {
    [matches, goals, players] = await Promise.all([
      loadJsonRobust("data/matchs.json"),
      loadJsonRobust("data/goals.json"),
      loadJsonRobust("data/players.json")
    ]);

    document.getElementById("teamFilter").addEventListener("change", updateStats);
    document.getElementById("matchTypeFilter").addEventListener("change", updateStats);
    updateStats();
  } catch (error) {
    console.error(error);
  }
}

initStats();
