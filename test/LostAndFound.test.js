const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LostAndFound", function () {
  let contract, admin, user1, user2;

  beforeEach(async function () {
    [admin, user1, user2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("LostAndFound");
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  it("deploys with correct admin", async function () {
    expect(await contract.admin()).to.equal(admin.address);
  });

  it("reports item and assigns unique ID", async function () {
    await contract.connect(user1).reportItem("Bottle", "Blue", "Library");
    const item = await contract.getItem(1);
    expect(item.name).to.equal("Bottle");
    expect(item.reporter).to.equal(user1.address);
    expect(Number(item.status)).to.equal(0);
  });

  it("blocks invalid status transitions", async function () {
    await contract.connect(user1).reportItem("Keys", "Car keys", "Cafe");
    await expect(contract.connect(user2).fileClaim(1))
      .to.be.revertedWith("Must be Found status to claim");
  });

  it("executes full Reported to Returned flow", async function () {
    await contract.connect(user1).reportItem("Laptop", "MacBook", "Lab");
    await contract.connect(admin).markAsFound(1);
    expect(Number((await contract.getItem(1)).status)).to.equal(1);
    await contract.connect(user2).fileClaim(1);
    expect(Number((await contract.getItem(1)).status)).to.equal(2);
    await contract.connect(admin).confirmReturn(1);
    expect(Number((await contract.getItem(1)).status)).to.equal(3);
  });

  it("prevents reporter from claiming own item", async function () {
    await contract.connect(user1).reportItem("Phone", "iPhone", "Gym");
    await contract.connect(admin).markAsFound(1);
    await expect(contract.connect(user1).fileClaim(1))
      .to.be.revertedWith("Reporter cannot claim own item");
  });

  it("blocks non-admin from markAsFound", async function () {
    await contract.connect(user1).reportItem("Watch", "Gold", "Canteen");
    await expect(contract.connect(user2).markAsFound(1))
      .to.be.revertedWith("Only admin can call this");
  });
});