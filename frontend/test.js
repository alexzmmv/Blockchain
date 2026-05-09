import { JsonRpcProvider, Contract } from "ethers";

const ZOMBIE_ABI = [
  "function zombies(uint256) public view returns (string name, uint256 dna, uint32 level, uint32 readyTime, uint16 winCount, uint16 lossCount, uint8 equippedPerkType)",
  "function getZombiesByOwner(address _owner) external view returns(uint256[] memory)"
];

async function run() {
  const provider = new JsonRpcProvider("https://rpc.sepolia.ethpandaops.io");
  const contract = new Contract("0x7cb5cCe65f993b223af3b36a30978e0792c93405", ZOMBIE_ABI, provider);
  
  try {
    const owner = "0x89CdbF63E2D85D7eE89E392DE691Bdf9C314dDFa"; // Or just fetch zombie 0
    const z = await contract.zombies(0);
    console.log(z);
  } catch (e) {
    console.error(e);
  }
}
run();
