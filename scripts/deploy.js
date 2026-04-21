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
  console.log("Deployed to:", contractAddress);

  const abiDir = path.join(__dirname, "../frontend/src/contracts");
  if (!fs.existsSync(abiDir)) fs.mkdirSync(abiDir, { recursive: true });

  const artifact = await ethers.getContractFactory("LostAndFound");
  fs.writeFileSync(
    path.join(abiDir, "LostAndFound.json"),
    JSON.stringify({
      address: contractAddress,
      abi: JSON.parse(artifact.interface.formatJson())
    }, null, 2)
  );
  console.log("ABI saved to frontend/src/contracts/LostAndFound.json");
}

main()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });