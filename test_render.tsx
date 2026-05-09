import React from "react";
import { renderToString } from "react-dom/server";
import { zombieEmoji, TYPE_EMOJI, TYPE_NAMES, TYPE_CLASS } from "./frontend/src/contracts";

function TypeBadge({ type }: { type: number }) {
  return (
    <span className={`type-badge ${TYPE_CLASS[type] ?? "type-none"}`}>
      {TYPE_EMOJI[type]} {TYPE_NAMES[type]}
    </span>
  );
}

function formatCountdown(secondsLeft: number): string {
  if (secondsLeft <= 0) return "Ready";
  if (secondsLeft < 60) return `${secondsLeft}s`;
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  return `${m}m ${s}s`;
}

function ZombieCard({ zombie, now }: any) {
  const secondsLeft = Math.max(0, zombie.readyTime - now);
  const isReady = secondsLeft === 0;
  const total = zombie.winCount + zombie.lossCount;
  const winRate = total > 0 ? Math.round((zombie.winCount / total) * 100) : null;

  return (
    <div className={`zombie-card`}>
      <div className="zombie-avatar">{zombieEmoji(zombie.dna)}</div>
      <div className="zombie-name">#{zombie.id} {zombie.name || "NoName"}</div>
      <div className="zombie-meta">
        <TypeBadge type={zombie.zombieType} />
        {zombie.equippedPerkType > 0 && (
          <span className="tag">{TYPE_EMOJI[zombie.equippedPerkType]} {TYPE_NAMES[zombie.equippedPerkType]}</span>
        )}
      </div>
      <div className="zombie-stats">
        <div className="stat-pill">⚔️ Lv.{zombie.level}</div>
        <div className="stat-pill">🏆 {zombie.winCount}W</div>
        <div className="stat-pill">💀 {zombie.lossCount}L</div>
        {winRate !== null && <div className="stat-pill">📊 {winRate}%</div>}
      </div>
      <div className="cooldown-row">
        {isReady ? (
          <span className="ready-badge">✅ Ready to fight</span>
        ) : (
          <>
            <span className="cooldown-label">⏳ {formatCountdown(secondsLeft)}</span>
            <div className="cooldown-bar-track">
              <div
                className="cooldown-bar-fill"
                style={{ width: `${Math.min(100, (secondsLeft / 30) * 100)}%` }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const mockZombie = {
  id: 0,
  name: "Test",
  dna: 1234567890123456n,
  level: 1,
  readyTime: Math.floor(Date.now()/1000) + 100,
  winCount: 0,
  lossCount: 0,
  equippedPerkType: 1,
  zombieType: 1
};

try {
  const html = renderToString(<ZombieCard zombie={mockZombie} now={Math.floor(Date.now()/1000)} />);
  console.log("Render successful! Length:", html.length);
} catch (err: any) {
  console.error("Render failed:", err.message);
  console.error(err.stack);
}
