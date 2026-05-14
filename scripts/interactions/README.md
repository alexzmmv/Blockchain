# CryptoZombies - Interaction Scripts

Simple and easy-to-use scripts for interacting with the ZombieOwnership contract.

## 📋 Prerequisites

1. **Start the local node** (in a separate terminal):
   ```bash
   npm run node
   ```

2. **Deploy the contract**:
   ```bash
   npm run deploy:local
   ```
   Save the contract address (default: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`)

## 🎮 Available Scripts

### 1. Create Zombie

Create a new zombie for your address.

**Command:**
```bash
ZOMBIE_NAME="ZombieName" npm run interact:create
```

**Examples:**
```bash
ZOMBIE_NAME="DragonZombie" npm run interact:create
ZOMBIE_NAME="NinjaZombie" npm run interact:create
```

**Notes:**
- Each address can only create ONE zombie initially
- Name can be changed later (after level 2)
- DNA is randomly generated

---

### 2. Get Zombies

View all zombies owned by an address.

**Command:**
```bash
npm run interact:get
```

**To view zombies for a different address:**
```bash
OWNER_ADDRESS=0x... npm run interact:get
```

**Output:**
- Zombie ID
- Name
- DNA (16 digits)
- Current level
- Win/Loss count
- Ready time (for attacks/feeding)

---

### 3. Level Up

Increase your zombie's level.

**Command:**
```bash
ZOMBIE_ID=0 npm run interact:levelup
```

**Cost:** 0.001 ETH (fee can be changed by contract owner)

**Benefits:**
- Level 2+: Can change name
- Level 20+: Can change DNA
- Higher level: Better stats in battles

**Examples:**
```bash
ZOMBIE_ID=0 npm run interact:levelup
ZOMBIE_ID=1 npm run interact:levelup
```

---

### 4. Change Name

Change your zombie's name.

**Command:**
```bash
ZOMBIE_ID=0 ZOMBIE_NAME="NewName" npm run interact:changename
```

**Requirements:**
- Zombie must be level 2 or higher
- You must be the zombie owner

**Examples:**
```bash
ZOMBIE_ID=0 ZOMBIE_NAME="MegaZombie" npm run interact:changename
ZOMBIE_ID=0 ZOMBIE_NAME="UltraZombie" npm run interact:changename
```

---

### 5. Change DNA

Mutate your zombie's DNA to change its appearance and base stats.

**Command:**
```bash
ZOMBIE_ID=0 npm run interact:changedna
```

**Requirements:**
- Zombie must be level 20 or higher
- You must be the zombie owner
- Input: 14-digit DNA value

**Important Rules:**
- The last 2 digits of DNA determine the zombie's **elemental type** (00-32=Fire, 33-65=Water, 66-98=Grass, 99=Kitty)
- When changing DNA via this script, the **type is NOT preserved** — you control all 16 digits
- Via the frontend, the type is preserved (last 2 digits stay the same)

**Examples:**
```bash
# Change DNA with specific type control
ZOMBIE_ID=0 NEW_DNA="12345678901299" npm run interact:changedna
# (last 2 digits = 99 = Kitty type)

ZOMBIE_ID=0 NEW_DNA="98765432109900" npm run interact:changedna
# (last 2 digits = 00 = Fire type)
```

---

### 6. Get Zombie Stats

View detailed stats for all your zombies, including type, equipped perks, and perk inventory.

**Command:**
```bash
npm run interact:getStats
```

**Optional:**
```bash
PERKS_ADDRESS=0x... npm run interact:getStats
```

**Output:**
- Zombie ID, name, level, DNA
- Elemental type (Fire, Water, Grass, Kitty)
- Equipped perk (if any)
- Win/Loss count
- Available perk inventory

---

### 7. Attack

Battle another zombie to gain experience and potentially breed new zombies or devour Kitties.

**Command:**
```bash
ZOMBIE_ID=0 TARGET_ID=1 npm run interact:attack
```

**Requirements:**
- You must own the attacking zombie
- The target zombie must exist
- Attacker must not be on cooldown (wait after battles/feeding)

**Battle System:**
- Type advantages: Fire > Grass > Water > Fire
- Equipped perks affect win probability
- Win: Breed new zombie or devour Kitty (if target is Kitty type)
- Loss: Zombie gains experience anyway

**Examples:**
```bash
ZOMBIE_ID=0 TARGET_ID=1 npm run interact:attack
ZOMBIE_ID=0 TARGET_ID=2 npm run interact:attack
```

---

### 8. Equip Perk

Equip an elemental perk to boost your zombie's battle stats.

**Command:**
```bash
ZOMBIE_ID=0 PERK_TYPE=1 PERKS_ADDRESS=0x... npm run interact:equipPerk
```

**Perk Types:**
- 1: Fire Essence 🔥
- 2: Water Essence 💧
- 3: Grass Essence 🌿
- 4: Kitty Essence 🐱

**Requirements:**
- You must own the zombie
- You must own the perk token
- Perks contract must be approved

**Examples:**
```bash
ZOMBIE_ID=0 PERK_TYPE=1 PERKS_ADDRESS=0x123... npm run interact:equipPerk
```

---

### 9. Mint Perk

Mint a new perk token (admin only).

**Command:**
```bash
PERKS_ADDRESS=0x... PERK_TYPE=1 npm run interact:mintperk
```

---

## 🔧 Environment Variables

All scripts accept the following environment variables (optional):

| Variable | Default | Description |
|----------|---------|-------------|
| `CONTRACT_ADDRESS` | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` | Deployed contract address |
| `PERKS_ADDRESS` | - | Perks contract address (for perk operations) |
| `ZOMBIE_ID` | - | Zombie ID (for specific operations) |
| `ZOMBIE_NAME` | - | Zombie name |
| `NEW_DNA` | - | New DNA value (14-16 digits) |
| `TARGET_ID` | - | Target zombie ID (for attacks) |
| `PERK_TYPE` | - | Perk type (1-4) |
| `OWNER_ADDRESS` | Current signer | Owner address (for getZombies) |

### Examples with custom CONTRACT_ADDRESS:

```bash
CONTRACT_ADDRESS=0xYourAddress ZOMBIE_NAME="Test" npm run interact:create
CONTRACT_ADDRESS=0xYourAddress npm run interact:get
CONTRACT_ADDRESS=0xYourAddress ZOMBIE_ID=0 npm run interact:levelup
```

---

## 📝 Typical Workflow

### 1. Initial Setup
```bash
# Terminal 1 - Start node
npm run node

# Terminal 2 - Deploy contract
npm run deploy:local
```

### 2. Create your first zombie
```bash
ZOMBIE_NAME="MyFirstZombie" npm run interact:create
```

### 3. Check your zombies
```bash
npm run interact:get
```

### 4. Level up to level 20+
```bash
# Level up 19 times to reach level 20 (each costs 0.001 ETH)
for i in {1..19}; do ZOMBIE_ID=0 npm run interact:levelup; done

# Or manually:
ZOMBIE_ID=0 npm run interact:levelup
ZOMBIE_ID=0 npm run interact:levelup
# ... repeat until level 20
```

### 5. Change DNA (level 20+ only)
```bash
ZOMBIE_ID=0 NEW_DNA="12345678901299" npm run interact:changedna
```

### 6. View detailed stats
```bash
npm run interact:getStats
```

### 7. Attack another zombie (if you have 2+)
```bash
# Create a second zombie first
ZOMBIE_NAME="Enemy" npm run interact:create

# Then attack
ZOMBIE_ID=0 TARGET_ID=1 npm run interact:attack
```

### 8. Verify results
```bash
npm run interact:get
```

---

## 🎯 Complete Examples

### Scenario 1: Create and upgrade a zombie to level 20 with DNA mutation

```bash
# Create zombie
ZOMBIE_NAME="Warrior" npm run interact:create

# Check
npm run interact:get

# Level up to level 20 (19 times)
for i in {1..19}; do ZOMBIE_ID=0 npm run interact:levelup; done

# Change DNA to create a Kitty type (DNA ending in 99)
ZOMBIE_ID=0 NEW_DNA="98765432109899" npm run interact:changedna

# Verify final result
npm run interact:get
npm run interact:getStats
```

### Scenario 2: Create multiple zombies and battle

```bash
# Create first zombie
ZOMBIE_NAME="Warrior" npm run interact:create

# Create second zombie (you'll need multiple addresses or different approach)
ZOMBIE_NAME="Enemy" npm run interact:create

# Level them up
ZOMBIE_ID=0 npm run interact:levelup
ZOMBIE_ID=1 npm run interact:levelup

# Battle
ZOMBIE_ID=0 TARGET_ID=1 npm run interact:attack

# Check results
npm run interact:getStats
```

### Scenario 3: Check and upgrade existing zombie to level 20

```bash
# See what zombies you have
npm run interact:get

# Level up zombie with ID 0 to level 20
for i in {1..19}; do ZOMBIE_ID=0 npm run interact:levelup; done

# If level 2+, change name
ZOMBIE_ID=0 ZOMBIE_NAME="LegendaryZombie" npm run interact:changename

# Mutate DNA (level 20+, change type to Water: 33-65 range)
ZOMBIE_ID=0 NEW_DNA="12345678901250" npm run interact:changedna

# Verify the change
npm run interact:getStats
```

### Scenario 4: Equip perks and check inventory

```bash
# View current perk inventory
npm run interact:getStats PERKS_ADDRESS=0x...

# Equip a perk (if you own one)
ZOMBIE_ID=0 PERK_TYPE=1 PERKS_ADDRESS=0x... npm run interact:equipPerk

# Check updated stats
npm run interact:getStats PERKS_ADDRESS=0x...
```

---

## 🧬 DNA & Zombie Type System

### How DNA Works

- **Total DNA digits:** 16 digits
- **Type-determining digits:** Last 2 digits (positions 15-16)
- **Type mapping:**
  - `00-32`: 🔥 Fire type
  - `33-65`: 💧 Water type
  - `66-98`: 🌿 Grass type
  - `99`: 🐱 Kitty type (special legendary type)

### Example DNA Values

```
DNA: 1234567890120005  →  Last 2 digits = 05  →  Fire type 🔥
DNA: 9876543210134567  →  Last 2 digits = 67  →  Grass type 🌿
DNA: 1111111111111150  →  Last 2 digits = 50  →  Water type 💧
DNA: 1234567890129999  →  Last 2 digits = 99  →  Kitty type 🐱
```

### Type Advantages (Battle System)

```
Fire   > Grass
Grass  > Water
Water  > Fire
```

Equipped perks add bonuses and affect win probability.

---

## 📊 Level Requirements Summary

| Feature | Min Level | Cost (ETH) | Notes |
|---------|-----------|-----------|-------|
| Create Zombie | 1 | Free | One per address |
| Level Up | Any | 0.001 | No max level |
| Change Name | 2+ | Free | Requires owner |
| Change DNA / Mutate | 20+ | Free | Requires owner, controls all 16 digits |
| Attack | Any | Free | Cannot attack on cooldown |
| Equip Perk | Any | Free | Must own perk token |

---

## ❌ Troubleshooting

### Error: "You already have zombie(s)!"
- Each address can only create ONE zombie with `createRandomZombie()`
- For more zombies, use feeding or attack (breeding)

### Error: "Zombie level too low!"
- For `changeName`: Minimum level 2 required
- For `changeDna`/Mutate: Minimum level 20 required
- Solution: Level up your zombie first (each level-up costs 0.001 ETH)

### Error: "You don't own this zombie"
- Verify that ZOMBIE_ID is correct
- Verify you're using the correct owner address

### Error: "Insufficient balance"
- Level up costs 0.001 ETH
- Check your balance with: `ethers.provider.getBalance(yourAddress)`

### Error: "could not decode result data"
- Verify local node is running (`npm run node`)
- Verify CONTRACT_ADDRESS is correct
- Verify you deployed the contract (`npm run deploy:local`)

---

## 🚀 Advanced Usage

### Use a custom contract address

Create a `.env.local` file:
```bash
CONTRACT_ADDRESS=0xYourCustomAddress
```

Then run:
```bash
npm run interact:get
npm run interact:create
# etc.
```

### Interact with multiple accounts

```typescript
// In your own script
const [owner, addr1, addr2] = await ethers.getSigners();

// Create zombie for addr1
const contract1 = contract.connect(addr1);
await contract1.createRandomZombie("Zombie1");

// Create zombie for addr2
const contract2 = contract.connect(addr2);
await contract2.createRandomZombie("Zombie2");
```

---

## 📚 Resurse Adiționale

- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [CryptoZombies Tutorial](https://cryptozombies.io/)

---

**Happy Zombie Creating! 🧟‍♂️**
