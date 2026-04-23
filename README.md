# 🔗 Lost & Found — Blockchain DApp

A **decentralized Lost & Found platform** built on the Ethereum blockchain. Finders register lost items with photos, owners claim them with proof, and every step is recorded immutably on-chain.

![Solidity](https://img.shields.io/badge/Solidity-0.8.19-363636?logo=solidity)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)
![Hardhat](https://img.shields.io/badge/Hardhat-2.22-FFF100?logo=hardhat)
![IPFS](https://img.shields.io/badge/IPFS-Pinata-65C2CB?logo=ipfs)

---

## ✨ Features

| Feature | Description |
|---|---|
| 📦 **Report Found Items** | Finder registers an item with name, description, location, and a photo uploaded to IPFS |
| 🔔 **Real-time Notifications** | All users on the network are notified when new items are found via event polling |
| 🙋 **Claim Ownership** | Owner identifies their item and files an on-chain claim |
| 📷 **Confirmation Photo** | Owner uploads a receipt photo after physical handover, completing the contract |
| 🔒 **On-Chain Verification** | Every action is recorded as an immutable blockchain transaction |
| ⚖️ **Admin Dispute System** | Admin can flag and resolve suspicious claims |
| 🌐 **IPFS Image Storage** | Photos stored on IPFS via Pinata — decentralized and permanent |
| 🦊 **Wallet Integration** | MetaMask & Brave Wallet support with auto network switching |

---

## 📊 Item Lifecycle

```
📦 Reported  →  🙋 Claimed  →  ✅ Returned
   (Finder)       (Owner)       (Contract Complete)
```

1. **Finder** discovers a lost item → registers it with a photo
2. **All users** are notified → owner spots their item
3. **Owner** files a claim → arranges physical handover
4. **Owner** uploads confirmation photo → contract is closed ✅

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Solidity 0.8.19 |
| Blockchain Framework | Hardhat |
| Frontend | React 19 + Vite 8 |
| Ethereum Library | Ethers.js v6 |
| Image Storage | IPFS via Pinata |
| Wallet | MetaMask / Brave Wallet |
| Testing | Chai + Mocha (15 tests) |
| Styling | Vanilla CSS (dark glassmorphism theme) |

---

## 🗂️ Project Structure

```
lost-found-blockchaingit/
├── contracts/
│   └── LostAndFound.sol          # Main smart contract
├── test/
│   └── LostAndFound.test.js      # 15 test cases
├── scripts/
│   └── deploy.js                 # Deployment script (auto-exports ABI)
├── hardhat.config.js             # Hardhat configuration
├── frontend/
│   ├── src/
│   │   ├── components/           # Navbar, ItemCard, ImageUpload, etc.
│   │   ├── pages/                # Landing, Dashboard, ReportItem, ItemDetail, MyItems
│   │   ├── hooks/                # useContract, useNotifications, useIPFS
│   │   ├── context/              # Web3Context (wallet management)
│   │   ├── utils/                # Pinata upload, formatters, constants
│   │   ├── contracts/            # Auto-generated ABI + contract address
│   │   ├── App.jsx               # Router + layout
│   │   ├── main.jsx              # Entry point
│   │   └── index.css             # Complete design system
│   ├── .env.example              # Pinata API key template
│   └── package.json
└── package.json
```

---

## 🚀 Setup & Installation

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ and npm
- [MetaMask](https://metamask.io/) or Brave Browser (with Brave Wallet)
- (Optional) [Pinata](https://pinata.cloud/) account for IPFS image storage

### Step 1: Clone the Repository

```bash
git clone https://github.com/Kavyarc15/lost-found-blockchaingit.git
cd lost-found-blockchaingit
```

### Step 2: Install Smart Contract Dependencies

```bash
npm install
```

### Step 3: Compile the Smart Contract

```bash
npx hardhat compile
```

### Step 4: Run Tests (Optional)

```bash
npx hardhat test
```

You should see all **15 tests passing**:

```
  LostAndFound
    ✔ deploys with correct admin
    ✔ allows finder to report item with image hash
    ✔ emits ItemReported event with correct data
    ✔ rejects report with empty name
    ✔ rejects report with empty image hash
    ✔ allows owner to file claim on a reported item
    ✔ prevents finder from claiming own item
    ✔ prevents claiming an already-claimed item
    ✔ allows claimant to confirm return with photo
    ✔ prevents non-claimant from confirming return
    ✔ executes full Reported → Claimed → Returned flow
    ✔ allows admin to dispute a reported item
    ✔ blocks non-admin from disputing
    ✔ allows admin to resolve dispute back to Reported
    ✔ tracks items by finder and owner

  15 passing (1s)
```

### Step 5: Start the Local Blockchain

Open a terminal and start the Hardhat node (keep this running):

```bash
npx hardhat node
```

This gives you **20 test accounts** each with **10,000 ETH**. Note the private keys — you'll need them later.

### Step 6: Deploy the Contract

In a **new terminal**:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Output:
```
Deploying with: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
LostAndFound deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
ABI + address saved to frontend/src/contracts/LostAndFound.json
```

### Step 7: Install Frontend Dependencies

```bash
cd frontend
npm install
```

### Step 8: Configure Pinata (Optional)

For real IPFS image storage, create a `.env` file in the `frontend/` directory:

```bash
cp .env.example .env
```

Edit `frontend/.env` with your Pinata keys:

```env
VITE_PINATA_API_KEY=your_pinata_api_key
VITE_PINATA_SECRET_KEY=your_pinata_secret_key
```

> **Note:** Without Pinata keys, the app uses a localStorage mock — images work locally but aren't stored permanently.

### Step 9: Start the Frontend

```bash
npm run dev
```

The app will be running at **http://localhost:5173/**

### Step 10: Configure Your Wallet

1. **Add the Hardhat Local network** to MetaMask or Brave Wallet:

   | Field | Value |
   |---|---|
   | Network Name | `Hardhat Local` |
   | RPC URL | `http://127.0.0.1:8545` |
   | Chain ID | `31337` |
   | Currency Symbol | `ETH` |

2. **Import a test account** using a Hardhat private key:

   ```
   Account #0: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   Account #1: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
   ```

3. **Switch to the Hardhat Local network** in your wallet

4. You should see **10,000 ETH** in your test account

> ⚠️ These are test accounts with fake ETH. Never use them on mainnet.

---

## ☁️ Running in GitHub Codespaces

GitHub Codespaces provides a full development environment in the cloud — no local setup needed!

### Step 1: Open in Codespaces

1. Go to **https://github.com/Kavyarc15/lost-found-blockchaingit**
2. Click the green **`<> Code`** button
3. Select the **`Codespaces`** tab
4. Click **`Create codespace on main`**
5. Wait for the environment to build (1-2 minutes)

### Step 2: Install Dependencies

In the Codespaces terminal:

```bash
# Install smart contract dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 3: Compile & Test the Contract

```bash
npx hardhat compile
npx hardhat test
```

### Step 4: Start the Hardhat Node

Open a **new terminal** (click the `+` icon in the terminal panel):

```bash
npx hardhat node
```

Keep this terminal running.

### Step 5: Deploy the Contract

Open **another new terminal**:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

### Step 6: Configure Pinata (Optional)

```bash
cd frontend
cp .env.example .env
```

Edit the `.env` file with your Pinata API keys (use the Codespaces built-in editor).

### Step 7: Start the Frontend

```bash
cd frontend
npm run dev -- --host
```

> **Important:** The `--host` flag is required in Codespaces to make the dev server accessible.

### Step 8: Access the App

1. Codespaces will show a **pop-up** saying "Your application running on port 5173 is available"
2. Click **"Open in Browser"** — this gives you a public URL like `https://xxx-5173.app.github.dev/`
3. You can also find it in the **PORTS** tab at the bottom of Codespaces

### Step 9: Connect Your Wallet

1. In MetaMask / Brave Wallet, add a **custom network**:

   | Field | Value |
   |---|---|
   | Network Name | `Codespace Hardhat` |
   | RPC URL | Your Codespace's **port 8545 URL** (find in PORTS tab, e.g. `https://xxx-8545.app.github.dev/`) |
   | Chain ID | `31337` |
   | Currency Symbol | `ETH` |

   > **Important:** In the **PORTS** tab, right-click port `8545` and set visibility to **Public** so your wallet can reach it.

2. Import a Hardhat test account (same private keys as above)
3. Connect your wallet on the app

### Codespaces Tips

- You get **60 hours/month free** on the GitHub Free plan
- Use **2-core** machine type for this project (sufficient)
- All 3 terminals (Hardhat node, deploy, frontend) can run simultaneously in Codespaces
- The forwarded port URLs are publicly accessible — you can share them for demos!

---

## 🧪 Testing the Full Flow

To test the complete lifecycle, you need **two different wallet accounts**:

### User A (Finder):
1. Connect wallet with **Account #0**
2. Click **"Report Found Item"**
3. Fill in item details + upload a photo
4. Submit to blockchain → see the item on the dashboard

### User B (Owner):
1. Switch to **Account #1** in your wallet (or use a different browser)
2. The **lego car** (or whatever item) appears on the dashboard
3. Click the item → click **"This Is Mine — File Claim"**
4. After physical handover, click **"Upload Confirmation Photo"**
5. Upload a photo and click **"Confirm Return & Complete"**
6. ✅ Contract is closed! Both photos are displayed side by side.

---

## 📜 Smart Contract API

### Write Functions

| Function | Access | Description |
|---|---|---|
| `reportItem(name, desc, location, imageHash)` | Anyone | Register a found item with IPFS image |
| `fileClaim(itemId)` | Anyone (not finder) | Claim ownership of a found item |
| `confirmReturn(itemId, confirmImageHash)` | Claimant only | Confirm receipt with a photo |
| `disputeItem(itemId)` | Admin only | Flag an item for review |
| `resolveDispute(itemId, newStatus)` | Admin only | Resolve a dispute |

### Read Functions

| Function | Returns |
|---|---|
| `getItem(itemId)` | Full item details |
| `getAllItemIds()` | Array of all item IDs |
| `getTotalItems()` | Total count |
| `getItemsByFinder(address)` | IDs registered by a finder |
| `getItemsByOwner(address)` | IDs claimed by an owner |
| `admin()` | Admin address |

### Events

| Event | Emitted When |
|---|---|
| `ItemReported` | New item registered |
| `ClaimFiled` | Owner claims an item |
| `ItemReturned` | Return confirmed with photo |
| `ItemDisputed` | Admin flags an item |
| `DisputeResolved` | Admin resolves a dispute |

---

## 🛡️ Security

- **Admin-only functions**: `disputeItem` and `resolveDispute` restricted to deployer
- **Self-claim prevention**: Finder cannot claim their own item
- **Input validation**: Name, location, and image hash are required
- **Status enforcement**: Items must follow the correct lifecycle sequence
- **No real funds**: Uses local Hardhat network with test ETH

---

## 📝 License

MIT

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
