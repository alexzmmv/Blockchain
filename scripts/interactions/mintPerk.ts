import { ethers } from "hardhat";

// Usage:
//   PERKS_ADDRESS=0x... PERK_TYPE=1 npx hardhat run scripts/interactions/mintPerk.ts --network localhost
//   PERK_TYPE: 1=Fire, 2=Water, 3=Grass, 4=Kitty

async function main() {
  const perksAddress = process.env.PERKS_ADDRESS;
  const perkType = process.env.PERK_TYPE ? parseInt(process.env.PERK_TYPE) : null;
  const recipient = process.env.RECIPIENT; // optional, defaults to deployer

  if (!perksAddress) throw new Error("PERKS_ADDRESS environment variable not set");
  if (!perkType || perkType < 1 || perkType > 4) throw new Error("PERK_TYPE must be 1 (Fire), 2 (Water), 3 (Grass), or 4 (Kitty)");

  const typeNames = ["", " Fire Essence", " Water Essence", " Grass Essence", " Kitty Essence"];
  const [signer] = await ethers.getSigners();
  const to = recipient ?? signer.address;

  console.log(" Minting Perk...");
  console.log(`  Perks contract: ${perksAddress}`);
  console.log(`  Perk type:      ${typeNames[perkType]}`);
  console.log(`  Recipient:      ${to}`);

  const ZombiePerks = await ethers.getContractAt("ZombiePerks", perksAddress, signer);
  const tx = await ZombiePerks.mintPerk(to, perkType, 1);
  await tx.wait();

  const balance = await ZombiePerks.balanceOf(to, perkType);
  console.log(`\n✓ Minted! New balance of ${typeNames[perkType]}: ${balance}`);
}

main().catch((e) => { console.error("❌ Error:", e.message); process.exit(1); });
