import { ethers } from "ethers";
import { ZOMBIE_ABI } from "./frontend/src/contracts";

async function run() {
  const contractAddress = "0x7cb5cCe65f993b223af3b36a30978e0792c93405"; // Sepolia address
  // Use a public provider
  const provider = new ethers.JsonRpcProvider("https://rpc.sepolia.org");
  const contract = new ethers.Contract(contractAddress, ZOMBIE_ABI, provider);
  
  try {
    const id = 0;
    const z = await contract.zombies(id);
    console.log("raw result:", z);
    console.log("z[1] type:", typeof z[1], "value:", z[1]);
  } catch (e: any) {
    console.error("Error fetching zombie:", e.message);
  }
}
run();
