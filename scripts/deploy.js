const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const LostAndFound = await ethers.getContractFactory("LostAndFound");
  const contract = await LostAndFound.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("LostAndFound deployed to:", contractAddress);

  // Export ABI + address for the frontend
  const abiDir = path.join(__dirname, "../frontend/src/contracts");
  if (!fs.existsSync(abiDir)) fs.mkdirSync(abiDir, { recursive: true });

  const artifact = await ethers.getContractFactory("LostAndFound");
  const exportData = {
    address: contractAddress,
    abi: JSON.parse(artifact.interface.formatJson()),
  };

  fs.writeFileSync(
    path.join(abiDir, "LostAndFound.json"),
    JSON.stringify(exportData, null, 2)
  );
  console.log("ABI + address saved to frontend/src/contracts/LostAndFound.json");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });