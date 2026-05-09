import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import {
  CONTRACT_ADDRESS, PERKS_ADDRESS, KITTIES_ADDRESS,
  ZOMBIE_ABI, PERKS_ABI,
  TYPE_NAMES, TYPE_EMOJI, TYPE_CLASS, zombieEmoji,
} from "./contracts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Zombie {
  id: number;
  name: string;
  dna: bigint;
  level: number;
  readyTime: number;
  winCount: number;
  lossCount: number;
  equippedPerkType: number;
  zombieType: number;
}

interface PerkBalances { [type: number]: bigint }

interface BattleLog {
  won: boolean;
  kittyDevoured: boolean;
  winProbability: number;
  attackerName: string;
  targetName: string;
  timestamp: number;
}

// ─── Live clock hook ───────────────────────────────────────────────────────────

function useNow() {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function formatCountdown(secondsLeft: number): string {
  if (secondsLeft <= 0) return "Ready";
  if (secondsLeft < 60) return `${secondsLeft}s`;
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  return `${m}m ${s}s`;
}

// ─── Zombie Card ─────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: number }) {
  return (
    <span className={`tag ${TYPE_CLASS[type] || "type-none"}`}>
      {TYPE_EMOJI[type] || "⚪"} {TYPE_NAMES[type] || "None"}
    </span>
  );
}


function ZombieCard({
  zombie,
  selected,
  onClick,
}: {
  zombie: Zombie;
  selected?: boolean;
  onClick?: () => void;
}) {
  const now = useNow();
  const secondsLeft = Math.max(0, zombie.readyTime - now);
  const isReady = secondsLeft === 0;
  const total = zombie.winCount + zombie.lossCount;
  const winRate = total > 0 ? Math.round((zombie.winCount / total) * 100) : null;

  return (
    <div className={`zombie-card ${selected ? "selected" : ""} ${!isReady ? "on-cooldown" : ""}`} onClick={onClick}>
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

      {/* Cooldown bar */}
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

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [zombies, setZombies] = useState<Zombie[]>([]);
  const [allZombies, setAllZombies] = useState<Zombie[]>([]);
  const [perkBalances, setPerkBalances] = useState<PerkBalances>({});
  const [perkPrice, setPerkPrice] = useState<bigint>(0n);
  const [tab, setTab] = useState<"zombies" | "battle" | "perks">("zombies");
  const [loading, setLoading] = useState(false);
  const [txPending, setTxPending] = useState(false);
  const [battleLog, setBattleLog] = useState<BattleLog | null>(null);
  const [attacker, setAttacker] = useState<Zombie | null>(null);
  const [target, setTarget] = useState<Zombie | null>(null);
  const [newZombieName, setNewZombieName] = useState("");
  const [equipZombieId, setEquipZombieId] = useState<number | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [editDnaValue, setEditDnaValue] = useState("");
  const [contractAddress] = useState(CONTRACT_ADDRESS);
  const [perksAddress] = useState(PERKS_ADDRESS);
  const [kittiesAddress] = useState(KITTIES_ADDRESS);

  // Kitty feeding state
  const [feedZombieId, setFeedZombieId] = useState<number | null>(null);
  const [kittyResult, setKittyResult] = useState<string | null>(null);

  // ─── Wallet connect ─────────────────────────────────────────────────────

  const SEPOLIA_CHAIN_ID = "0xaa36a7";
  const connectingRef = useRef(false); // suppress reload while connecting

  const switchToSepolia = async () => {
    try {
      await window.ethereum!.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await window.ethereum!.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: SEPOLIA_CHAIN_ID,
            chainName: "Sepolia Testnet",
            nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://rpc.sepolia.org"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          }],
        });
      } else if (switchError.code !== 4001) {
        throw switchError;
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install MetaMask!");
    connectingRef.current = true;
    try {
      await switchToSepolia();
      const prov = new ethers.BrowserProvider(window.ethereum);
      const network = await prov.getNetwork();
      if (Number(network.chainId) !== 11155111) {
        alert("Please switch MetaMask to the Sepolia testnet and try again.");
        return;
      }
      const sign = await prov.getSigner();
      const addr = await sign.getAddress();
      setProvider(prov);
      setSigner(sign);
      setAccount(addr);
    } catch (e: any) {
      // silently ignore user cancellations
      if (e.code !== 4001) console.error("Wallet connect error:", e.message);
    } finally {
      connectingRef.current = false;
    }
  };

  // ─── Load data ──────────────────────────────────────────────────────────

  const loadZombies = useCallback(async () => {
    if (!signer || !account || !contractAddress) return;
    setLoading(true);
    try {
      const contract = new ethers.Contract(contractAddress, ZOMBIE_ABI, signer);
      const ids: bigint[] = await contract.getZombiesByOwner(account);

      const loaded: Zombie[] = await Promise.all(ids.map(async (id) => {
        const z = await contract.zombies(id);
        const zType = await contract.getZombieType(id);
        return {
          id: Number(id),
          name: z[0],
          dna: z[1],
          level: Number(z[2]),
          readyTime: Number(z[3]),
          winCount: Number(z[4]),
          lossCount: Number(z[5]),
          equippedPerkType: Number(z[6]),
          zombieType: Number(zType),
        };
      }));
      setZombies(loaded);

      // Also load all zombies for battle targets
      const total = await contract.zombies(0).catch(() => null);
      if (total) {
        const allLoaded: Zombie[] = [];
        for (let i = 0; ; i++) {
          try {
            const z = await contract.zombies(i);
            if (!z || z[1] === undefined || z[1] === 0n) break;
            const owner = await contract.zombieToOwner(i);
            if (owner === ethers.ZeroAddress) continue; // burned
            const zType = await contract.getZombieType(i);
            allLoaded.push({
              id: i, name: z[0], dna: z[1],
              level: Number(z[2]), readyTime: Number(z[3]),
              winCount: Number(z[4]), lossCount: Number(z[5]),
              equippedPerkType: Number(z[6]),
              zombieType: Number(zType),
            });
          } catch { break; }
        }
        setAllZombies(allLoaded);
      }
    } finally {
      setLoading(false);
    }
  }, [signer, account, contractAddress]);

  const loadPerks = useCallback(async () => {
    if (!signer || !account || !perksAddress) return;
    const perksContract = new ethers.Contract(perksAddress, PERKS_ABI, signer);
    const price = await perksContract.perkPrice();
    setPerkPrice(price);
    const balances: PerkBalances = {};
    for (let t = 1; t <= 4; t++) {
      balances[t] = await perksContract.balanceOf(account, t);
    }
    setPerkBalances(balances);
  }, [signer, account, perksAddress]);

  useEffect(() => {
    if (account) { loadZombies(); loadPerks(); }
  }, [account, loadZombies, loadPerks]);

  useEffect(() => {
    if (!window.ethereum) return;
    const handleChainChanged = (chainId: unknown) => {
      console.log("Chain changed to:", chainId);
      if (chainId !== "0xaa36a7" && chainId !== "11155111") {
        console.warn("⚠️ You switched away from Sepolia.");
      }
      // REMOVED window.location.reload() to prevent it from wiping the UI on async connect!
    };
    window.ethereum.on("chainChanged", handleChainChanged);
    return () => window.ethereum!.removeListener("chainChanged", handleChainChanged);
  }, []);

  // ─── Actions ────────────────────────────────────────────────────────────

  const createZombie = async () => {
    if (!signer || !newZombieName.trim()) return;
    setTxPending(true);
    try {
      const contract = new ethers.Contract(contractAddress, ZOMBIE_ABI, signer);
      const tx = await contract.createRandomZombie(newZombieName.trim());
      await tx.wait();
      setNewZombieName("");
      await loadZombies();
    } catch (e: any) {
      alert(e.reason ?? e.message);
    } finally { setTxPending(false); }
  };

  const doAttack = async () => {
    if (!signer || !attacker || !target) return;
    setTxPending(true);
    setBattleLog(null);
    try {
      const contract = new ethers.Contract(contractAddress, ZOMBIE_ABI, signer);
      const tx = await contract.attack(attacker.id, target.id);
      const receipt = await tx.wait();

      // Parse BattleResult event
      const iface = new ethers.Interface(ZOMBIE_ABI);
      for (const log of receipt?.logs ?? []) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "BattleResult") {
            setBattleLog({
              won: parsed.args.attackerWon,
              kittyDevoured: parsed.args.kittyDevoured,
              winProbability: Number(parsed.args.winProbability),
              attackerName: attacker.name,
              targetName: target.name,
              timestamp: Date.now(),
            });
            break;
          }
        } catch { }
      }
      await loadZombies();
    } catch (e: any) {
      alert(e.reason ?? e.message);
    } finally { setTxPending(false); }
  };

  const buyPerk = async (perkType: number) => {
    if (!signer) return;
    setTxPending(true);
    try {
      const perksContract = new ethers.Contract(perksAddress, PERKS_ABI, signer);
      const price = perkType === 4 ? perkPrice * 5n : perkPrice;
      const tx = await perksContract.buyPerk(perkType, { value: price });
      await tx.wait();
      await loadPerks();
    } catch (e: any) {
      alert(e.reason ?? e.message);
    } finally { setTxPending(false); }
  };

  const equipPerk = async (zombieId: number, perkType: number) => {
    if (!signer) return;
    setTxPending(true);
    try {
      const perksContract = new ethers.Contract(perksAddress, PERKS_ABI, signer);
      const approved = await perksContract.isApprovedForAll(account, contractAddress);
      if (!approved) {
        const approveTx = await perksContract.setApprovalForAll(contractAddress, true);
        await approveTx.wait();
      }
      const contract = new ethers.Contract(contractAddress, ZOMBIE_ABI, signer);
      const tx = await contract.equipPerk(zombieId, perkType);
      await tx.wait();
      setEquipZombieId(null);
      await loadZombies();
      await loadPerks();
    } catch (e: any) {
      alert(e.reason ?? e.message);
    } finally { setTxPending(false); }
  };

  const levelUp = async (zombieId: number) => {
    if (!signer) return;
    setTxPending(true);
    try {
      const contract = new ethers.Contract(contractAddress, ZOMBIE_ABI, signer);
      const fee = ethers.parseEther("0.001");
      const tx = await contract.levelUp(zombieId, { value: fee });
      await tx.wait();
      await loadZombies();
    } catch (e: any) {
      alert(e.reason ?? e.message);
    } finally { setTxPending(false); }
  };

  const changeName = async (zombieId: number, newName: string) => {
    if (!signer || !newName.trim()) return;
    setTxPending(true);
    try {
      const contract = new ethers.Contract(contractAddress, ZOMBIE_ABI, signer);
      const tx = await contract.changeName(zombieId, newName.trim());
      await tx.wait();
      setEditNameValue("");
      await loadZombies();
    } catch (e: any) {
      alert(e.reason ?? e.message);
    } finally { setTxPending(false); }
  };

  const changeDna = async (zombieId: number, newDnaStr: string, currentDna: bigint) => {
    if (!signer || !newDnaStr.trim()) return;
    setTxPending(true);
    try {
      // The contract determines zombieType using the last 2 digits
      const tail = currentDna % 100n;
      const baseDna = BigInt(newDnaStr);
      const finalDna = (baseDna * 100n) + tail;

      const contract = new ethers.Contract(contractAddress, ZOMBIE_ABI, signer);
      const tx = await contract.changeDna(zombieId, finalDna);
      await tx.wait();
      setEditDnaValue("");
      await loadZombies();
    } catch (e: any) {
      alert(e.reason ?? e.message);
    } finally { setTxPending(false); }
  };

  const feedOnKitty = async () => {
    if (!signer || feedZombieId === null) return;
    setTxPending(true);
    setKittyResult(null);
    try {
      const contract = new ethers.Contract(contractAddress, ZOMBIE_ABI, signer);
      const tx = await contract.feedOnKitty(feedZombieId, 0);
      await tx.wait();
      await loadZombies();
      setKittyResult(`🐻✨ Your zombie successfully absorbed the Kitty DNA!`);
    } catch (e: any) {
      setKittyResult(`❌ ${e.reason ?? e.message}`);
    } finally { setTxPending(false); }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="app">
      <header>
        <span className="logo">⚔️ CryptoZombies RPG</span>
        {!account ? (
          <button className="btn btn-primary" onClick={connectWallet}>
            Connect Wallet
          </button>
        ) : (
          <span className="address-chip">{account.slice(0, 6)}…{account.slice(-4)}</span>
        )}
      </header>

      {!account ? (
        <main>
          <div className="empty-state" style={{ marginTop: "5rem" }}>
            <div className="icon">🧟</div>
            <h2 style={{ fontFamily: "Orbitron", marginBottom: "0.5rem" }}>Welcome to CryptoZombies RPG</h2>
            <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
              Connect your wallet to start raising zombies, collecting perks, and devouring Kitties.
            </p>
            <button className="btn btn-primary" onClick={connectWallet}>
              Connect Wallet
            </button>
          </div>
        </main>
      ) : (
        <main>
          <div className="tabs">
            {(["zombies", "battle", "perks"] as const).map((t) => (
              <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                {t === "zombies" ? "🧟 My Zombies" : t === "battle" ? "⚔️ Battle Arena" : "✨ Perk Shop"}
              </button>
            ))}
          </div>

          {/* ── My Zombies ── */}
          {tab === "zombies" && (
            <div className="section">
              <div className="section-header">
                <span className="section-title">🧟 My Zombies</span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    placeholder="Zombie name…"
                    value={newZombieName}
                    onChange={(e) => setNewZombieName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createZombie()}
                    style={{ width: 200 }}
                    disabled={zombies.length > 0}
                  />
                  <button className="btn btn-primary" onClick={createZombie} disabled={txPending || !newZombieName.trim() || zombies.length > 0}>
                    {txPending ? <span className="spinner" /> : "Create"}
                  </button>
                </div>
              </div>
              {loading ? (
                <div className="empty-state"><span className="spinner" /></div>
              ) : zombies.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">🪦</div>
                  <p>No zombies yet. Create your first one!</p>
                </div>
              ) : (
                <>
                  <div className="zombie-grid">
                    {zombies.map((z) => (
                      <div key={z.id}>
                        <ZombieCard zombie={z} selected={equipZombieId === z.id} onClick={() => setEquipZombieId(equipZombieId === z.id ? null : z.id)} />
                        {equipZombieId === z.id && (
                          <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            {/* Level Up */}
                            <button
                              className="btn btn-success"
                              style={{ width: "100%", justifyContent: "center" }}
                              disabled={txPending}
                              onClick={() => levelUp(z.id)}
                            >
                              {txPending ? <span className="spinner" /> : `⬆️ Level Up (0.001 ETH) — now Lv.${z.level}`}
                            </button>

                            {/* Change Name (Lv 2+) */}
                            {z.level >= 2 && (
                              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.2rem" }}>
                                <input
                                  type="text"
                                  placeholder="New name..."
                                  value={editNameValue}
                                  onChange={(e) => setEditNameValue(e.target.value)}
                                  style={{ flex: 1, padding: "0.4rem", fontSize: "0.85rem", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", color: "white", borderRadius: "4px" }}
                                />
                                <button
                                  className="btn btn-primary"
                                  disabled={txPending || !editNameValue.trim()}
                                  onClick={() => changeName(z.id, editNameValue)}
                                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                                >
                                  Rename
                                </button>
                              </div>
                            )}

                            {/* Change DNA (Lv 20+) */}
                            {z.level >= 20 && (
                              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.2rem" }}>
                                <input
                                  type="text"
                                  placeholder="New DNA (14 digits)"
                                  value={editDnaValue}
                                  onChange={(e) => setEditDnaValue(e.target.value.replace(/\D/g, '').slice(0, 14))}
                                  style={{ flex: 1, padding: "0.4rem", fontSize: "0.85rem", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", color: "white", borderRadius: "4px" }}
                                />
                                <button
                                  className="btn btn-primary"
                                  disabled={txPending || editDnaValue.length === 0}
                                  onClick={() => changeDna(z.id, editDnaValue, z.dna)}
                                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                                >
                                  Mutate
                                </button>
                              </div>
                            )}

                            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0.2rem 0" }} />
                            {/* Equip Perks */}
                            {[1, 2, 3, 4].map((pt) => (
                              <button
                                key={pt}
                                className="btn btn-ghost"
                                style={{ width: "100%", justifyContent: "center" }}
                                disabled={txPending || (perkBalances[pt] ?? 0n) === 0n}
                                onClick={() => equipPerk(z.id, pt)}
                              >
                                {txPending ? <span className="spinner" /> : `${TYPE_EMOJI[pt]} Equip ${TYPE_NAMES[pt]} (${perkBalances[pt] ?? 0} owned)`}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Kitty Feed Panel */}
              {zombies.length > 0 && (
                <div className="kitty-panel">
                  <div className="kitty-panel-title">🐱 Feed on a CryptoKitty</div>
                  <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
                    Feed one of your zombies on a Kitty to absorb its DNA and transform into a Kitty type (TYPE_KITTY). Your zombie must not be on cooldown.
                  </p>
                  <div className="kitty-form">
                    <select
                      value={feedZombieId ?? ""}
                      onChange={(e) => setFeedZombieId(Number(e.target.value))}
                      style={{ maxWidth: 180 }}
                    >
                      <option value="">Select zombie…</option>
                      {zombies.map(z => (
                        <option key={z.id} value={z.id}>#{z.id} {z.name}</option>
                      ))}
                    </select>
                    <button
                      className="btn btn-primary"
                      onClick={feedOnKitty}
                      disabled={txPending || feedZombieId === null}
                    >
                      {txPending ? <span className="spinner" /> : "🐾 Absorb Kitty DNA"}
                    </button>
                  </div>
                  {kittyResult && <div className="kitty-result">{kittyResult}</div>}
                </div>
              )}
            </div>
          )}

          {/* ── Battle Arena ── */}
          {tab === "battle" && (
            <div className="section">
              <div className="section-title" style={{ marginBottom: "1.25rem" }}>⚔️ Battle Arena</div>
              <div className="arena">
                <div>
                  <div className="card-title">Your Zombie</div>
                  {zombies.length === 0 ? (
                    <div className="empty-state">No zombies</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {zombies.map((z) => (
                        <ZombieCard key={z.id} zombie={z} selected={attacker?.id === z.id} onClick={() => setAttacker(z)} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="arena-vs">VS</div>

                <div>
                  <div className="card-title">Target Zombie</div>
                  {allZombies.filter((z) => !zombies.find((mz) => mz.id === z.id)).length === 0 ? (
                    <div className="empty-state">No targets available</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {allZombies
                        .filter((z) => !zombies.find((mz) => mz.id === z.id))
                        .map((z) => (
                          <ZombieCard key={z.id} zombie={z} selected={target?.id === z.id} onClick={() => setTarget(z)} />
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {attacker && target && (
                <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
                  <div style={{ marginBottom: "0.75rem", color: "var(--muted)", fontSize: "0.85rem" }}>
                    <TypeBadge type={attacker.zombieType} /> vs <TypeBadge type={target.zombieType} />
                  </div>
                  <button className="btn btn-primary" onClick={doAttack} disabled={txPending}>
                    {txPending ? <><span className="spinner" /> Battling…</> : "⚔️ Attack!"}
                  </button>
                </div>
              )}

              {battleLog && (
                <div className={`battle-result ${battleLog.kittyDevoured ? "battle-kitty" : battleLog.won ? "battle-win" : "battle-lose"}`}>
                  {battleLog.kittyDevoured
                    ? `🐱💀 KITTY DEVOURED! ${battleLog.attackerName} absorbed legendary DNA!`
                    : battleLog.won
                      ? `🏆 ${battleLog.attackerName} WON! (${battleLog.winProbability}% chance)`
                      : `💀 ${battleLog.attackerName} lost. (${battleLog.winProbability}% chance)`}
                </div>
              )}
            </div>
          )}

          {/* ── Perk Shop ── */}
          {tab === "perks" && (
            <div className="section">
              <div className="section-title" style={{ marginBottom: "1.25rem" }}>✨ Perk Shop</div>
              <div className="perk-grid">
                {[
                  { type: 1, icon: "🔥", name: "Fire Essence", mult: 1 },
                  { type: 2, icon: "💧", name: "Water Essence", mult: 1 },
                  { type: 3, icon: "🌿", name: "Grass Essence", mult: 1 },
                  { type: 4, icon: "🐱", name: "Kitty Essence", mult: 5 },
                ].map((p) => (
                  <div key={p.type} className="perk-item">
                    <div className="perk-icon">{p.icon}</div>
                    <div className="perk-name">{p.name}</div>
                    <div className="perk-price">{ethers.formatEther(perkPrice * BigInt(p.mult))} ETH</div>
                    <div className="perk-balance">Owned: {String(perkBalances[p.type] ?? 0)}</div>
                    <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => buyPerk(p.type)} disabled={txPending}>
                      {txPending ? <span className="spinner" /> : "Buy"}
                    </button>
                  </div>
                ))}
              </div>

              <hr className="divider" />
              <div className="section-title" style={{ marginBottom: "1rem" }}>Equip a Perk</div>
              <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Select a zombie from the <strong>My Zombies</strong> tab and tap a perk to equip it.
              </p>
            </div>
          )}
        </main>
      )}
    </div>
  );
}