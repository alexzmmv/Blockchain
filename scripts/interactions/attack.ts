import { ethers } from "hardhat";

// Usage:
//   CONTRACT_ADDRESS=0x... ZOMBIE_ID=0 TARGET_ID=1 \
//     npx hardhat run scripts/interactions/attack.ts --network localhost

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const zombieId  = process.env.ZOMBIE_ID;
  const targetId  = process.env.TARGET_ID;

  if (!contractAddress) throw new Error("CONTRACT_ADDRESS not set");
  if (zombieId === undefined) throw new Error("ZOMBIE_ID not set");
  if (targetId === undefined) throw new Error("TARGET_ID not set");

  const typeNames = ["None", "🔥 Fire", "💧 Water", "🌿 Grass", "🐱 Kitty"];
  const [signer] = await ethers.getSigners();
  const ZombieOwnership = await ethers.getContractAt("ZombieOwnership", contractAddress, signer);

  const attacker = await ZombieOwnership.zombies(parseInt(zombieId));
  const target   = await ZombieOwnership.zombies(parseInt(targetId));
  const [, atkPerk] = await ZombieOwnership.getZombieStats(parseInt(zombieId));
  const atkType = await ZombieOwnership.getZombieType(parseInt(zombieId));
  const defType = await ZombieOwnership.getZombieType(parseInt(targetId));

  console.log("⚔️  Battle Starting...\n");
  console.log(`  Attacker: Zombie #${zombieId} "${attacker.name}" — ${typeNames[Number(atkType)]} ${atkPerk > 0 ? `(perk: ${typeNames[Number(atkPerk)]})` : ""}`);
  console.log(`  Target:   Zombie #${targetId} "${target.name}" — ${typeNames[Number(defType)]}`);

  // Listen for BattleResult event
  const filter = ZombieOwnership.filters.BattleResult();
  let resultLog: any = null;
  ZombieOwnership.once(filter, (attackerId, targetId_, won, atkEffType, tgtType, winProb, kittyDevoured, event) => {
    resultLog = { won, winProb, kittyDevoured };
  });

  const tx = await ZombieOwnership.attack(parseInt(zombieId), parseInt(targetId));
  await tx.wait();

  // Small delay for event to fire
  await new Promise(r => setTimeout(r, 500));

  if (resultLog) {
    console.log(`\n  Win probability was: ${resultLog.winProb}%`);
    if (resultLog.won) {
      if (resultLog.kittyDevoured) {
        console.log(`\n🐱💀 KITTY DEVOURED! Zombie #${zombieId} absorbed the Kitty DNA and became Legendary!`);
      } else {
        console.log(`\n🏆 Victory! Zombie #${zombieId} won and bred a new zombie.`);
      }
    } else {
      console.log(`\n💀 Defeat. Zombie #${zombieId} lost this battle.`);
    }
  }

  const updatedAttacker = await ZombieOwnership.zombies(parseInt(zombieId));
  console.log(`\n  Updated stats for Zombie #${zombieId}:`);
  console.log(`    Wins: ${updatedAttacker.winCount}  Losses: ${updatedAttacker.lossCount}  Level: ${updatedAttacker.level}`);
}

main().catch((e) => { console.error("❌ Error:", e.message); process.exit(1); });
