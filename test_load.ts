import { ethers } from "ethers";
import { ZOMBIE_ABI } from "./frontend/src/contracts";
import "dotenv/config";

async function run() {
  const provider = new ethers.JsonRpcProvider("https://rpc.sepolia.ethpandaops.io");
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const account = await signer.getAddress();
  
  const contract = new ethers.Contract(contractAddress!, ZOMBIE_ABI, signer);
  const ids = await contract.getZombiesByOwner(account);
  console.log("ids:", ids);
  
  for (const id of ids) {
    const z = await contract.zombies(id);
    console.log("z:", z);
    console.log("dna type:", typeof z.dna);
    const zType = await contract.getZombieType(id);
    console.log("zType:", zType);
  }
}

run().catch(console.error);
