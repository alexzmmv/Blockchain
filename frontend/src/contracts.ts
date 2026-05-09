// Contract addresses — update after deployment
export const CONTRACT_ADDRESS = import.meta.env.CONTRACT_ADDRESS || "";
export const PERKS_ADDRESS = import.meta.env.PERKS_ADDRESS || "";
export const KITTIES_ADDRESS = import.meta.env.MOCK_KITTIES_ADDRESS || "";

export const ZOMBIE_ABI = [
  "function createRandomZombie(string memory _name) public",
  "function zombies(uint256) public view returns (string name, uint256 dna, uint32 level, uint32 readyTime, uint16 winCount, uint16 lossCount, uint8 equippedPerkType)",
  "function zombieToOwner(uint256) public view returns (address)",
  "function getZombiesByOwner(address _owner) external view returns(uint256[] memory)",
  "function getZombieType(uint256 _zombieId) public view returns (uint8)",
  "function getZombieStats(uint256 _zombieId) external view returns (uint8 zombieType, uint8 equippedPerk, string memory typeName, string memory perkName)",
  "function attack(uint256 _zombieId, uint256 _targetId) external",
  "function equipPerk(uint256 _zombieId, uint8 _perkType) external",
  "function levelUp(uint256 _zombieId) external payable",
  "function changeName(uint256 _zombieId, string calldata _newName) external",
  "function changeDna(uint256 _zombieId, uint256 _newDna) external",
  "function feedOnKitty(uint256 _zombieId, uint256 _kittyId) public",
  "function setKittyContractAddress(address _address) external",
  "event BattleResult(uint256 indexed attackerId, uint256 indexed targetId, bool attackerWon, uint8 attackerEffectiveType, uint8 targetType, uint256 winProbability, bool kittyDevoured)",
  "event NewZombie(uint256 zombieId, string name, uint256 dna)",
];

export const PERKS_ABI = [
  "function buyPerk(uint8 _perkType) external payable",
  "function balanceOf(address _owner, uint8 _perkType) external view returns (uint256)",
  "function ownsPerk(address _owner, uint8 _perkType) external view returns (bool)",
  "function setApprovalForAll(address _operator, bool _approved) external",
  "function isApprovedForAll(address _owner, address _operator) public view returns (bool)",
  "function safeTransfer(address _to, uint8 _perkType, uint256 _amount) external",
  "function perkPrice() external view returns (uint256)",
];

export const TYPE_NAMES: Record<number, string> = {
  0: "None", 1: "Fire", 2: "Water", 3: "Grass", 4: "Kitty",
};

export const TYPE_EMOJI: Record<number, string> = {
  0: "⚪", 1: "🔥", 2: "💧", 3: "🌿", 4: "🐱",
};

export const TYPE_CLASS: Record<number, string> = {
  0: "type-none", 1: "type-fire", 2: "type-water", 3: "type-grass", 4: "type-kitty",
};

export function zombieEmoji(dna: any): string {
  try {
    const dnaBig = BigInt(dna);
    const tail = Number(dnaBig % 100n);
    if (tail === 99) return "🐱";
    const options = ["🧟", "🧟‍♂️", "🧟‍♀️", "💀", "👻"];
    return options[Number(dnaBig % BigInt(options.length))];
  } catch (err) {
    return "🧟"; // Safe fallback to prevent render crashes
  }
}
