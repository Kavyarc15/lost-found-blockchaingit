const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LostAndFound", function () {
  let contract, admin, finder, owner, stranger;

  beforeEach(async function () {
    [admin, finder, owner, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("LostAndFound");
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  // ── Deployment ───────────────────────────────────────
  it("deploys with correct admin", async function () {
    expect(await contract.admin()).to.equal(admin.address);
  });

  // ── Report Item ──────────────────────────────────────
  it("allows finder to report item with image hash", async function () {
    const tx = await contract
      .connect(finder)
      .reportItem("Laptop", "Silver MacBook", "Library", "QmImageHash123");
    await tx.wait();

    const item = await contract.getItem(1);
    expect(item.name).to.equal("Laptop");
    expect(item.description).to.equal("Silver MacBook");
    expect(item.location).to.equal("Library");
    expect(item.imageHash).to.equal("QmImageHash123");
    expect(item.finder).to.equal(finder.address);
    expect(Number(item.status)).to.equal(0); // Reported
  });

  it("emits ItemReported event with correct data", async function () {
    await expect(
      contract.connect(finder).reportItem("Keys", "Car keys", "Cafe", "QmKeys456")
    )
      .to.emit(contract, "ItemReported")
      .withArgs(1, finder.address, "Keys", "QmKeys456", (ts) => ts > 0);
  });

  it("rejects report with empty name", async function () {
    await expect(
      contract.connect(finder).reportItem("", "desc", "loc", "QmHash")
    ).to.be.revertedWith("Name cannot be empty");
  });

  it("rejects report with empty image hash", async function () {
    await expect(
      contract.connect(finder).reportItem("Phone", "iPhone", "Gym", "")
    ).to.be.revertedWith("Image hash cannot be empty");
  });

  // ── File Claim ───────────────────────────────────────
  it("allows owner to file claim on a reported item", async function () {
    await contract.connect(finder).reportItem("Bottle", "Blue", "Lab", "QmBottle");
    await contract.connect(owner).fileClaim(1);

    const item = await contract.getItem(1);
    expect(Number(item.status)).to.equal(1); // Claimed
    expect(item.owner).to.equal(owner.address);
  });

  it("prevents finder from claiming own item", async function () {
    await contract.connect(finder).reportItem("Watch", "Gold", "Canteen", "QmWatch");
    await expect(contract.connect(finder).fileClaim(1)).to.be.revertedWith(
      "Finder cannot claim own item"
    );
  });

  it("prevents claiming an already-claimed item", async function () {
    await contract.connect(finder).reportItem("Bag", "Black", "Bus stop", "QmBag");
    await contract.connect(owner).fileClaim(1);
    await expect(contract.connect(stranger).fileClaim(1)).to.be.revertedWith(
      "Item must be in Reported status"
    );
  });

  // ── Confirm Return ───────────────────────────────────
  it("allows claimant to confirm return with photo", async function () {
    await contract.connect(finder).reportItem("Laptop", "Mac", "Lab", "QmLaptop");
    await contract.connect(owner).fileClaim(1);
    await contract.connect(owner).confirmReturn(1, "QmConfirmPhoto789");

    const item = await contract.getItem(1);
    expect(Number(item.status)).to.equal(2); // Returned
    expect(item.confirmImageHash).to.equal("QmConfirmPhoto789");
  });

  it("prevents non-claimant from confirming return", async function () {
    await contract.connect(finder).reportItem("Phone", "Samsung", "Park", "QmPhone");
    await contract.connect(owner).fileClaim(1);
    await expect(
      contract.connect(stranger).confirmReturn(1, "QmFake")
    ).to.be.revertedWith("Only the claimant can confirm return");
  });

  // ── Full Lifecycle ───────────────────────────────────
  it("executes full Reported → Claimed → Returned flow", async function () {
    // Step 1: Finder reports
    await contract.connect(finder).reportItem("Wallet", "Leather", "Mall", "QmWallet");
    let item = await contract.getItem(1);
    expect(Number(item.status)).to.equal(0);

    // Step 2: Owner claims
    await contract.connect(owner).fileClaim(1);
    item = await contract.getItem(1);
    expect(Number(item.status)).to.equal(1);
    expect(item.owner).to.equal(owner.address);

    // Step 3: Owner confirms return with photo
    await contract.connect(owner).confirmReturn(1, "QmReturnConfirm");
    item = await contract.getItem(1);
    expect(Number(item.status)).to.equal(2);
    expect(item.confirmImageHash).to.equal("QmReturnConfirm");
  });

  // ── Admin: Dispute ───────────────────────────────────
  it("allows admin to dispute a reported item", async function () {
    await contract.connect(finder).reportItem("Ring", "Diamond", "Park", "QmRing");
    await contract.connect(admin).disputeItem(1);

    const item = await contract.getItem(1);
    expect(Number(item.status)).to.equal(3); // Disputed
  });

  it("blocks non-admin from disputing", async function () {
    await contract.connect(finder).reportItem("Pen", "Mont Blanc", "Office", "QmPen");
    await expect(contract.connect(stranger).disputeItem(1)).to.be.revertedWith(
      "Only admin can call this"
    );
  });

  it("allows admin to resolve dispute back to Reported", async function () {
    await contract.connect(finder).reportItem("Glasses", "Ray-Ban", "Beach", "QmGlasses");
    await contract.connect(owner).fileClaim(1);
    await contract.connect(admin).disputeItem(1);
    await contract.connect(admin).resolveDispute(1, 0); // back to Reported

    const item = await contract.getItem(1);
    expect(Number(item.status)).to.equal(0);
    expect(item.owner).to.equal(ethers.ZeroAddress);
  });

  // ── View Helpers ─────────────────────────────────────
  it("tracks items by finder and owner", async function () {
    await contract.connect(finder).reportItem("A", "a", "loc", "Qm1");
    await contract.connect(finder).reportItem("B", "b", "loc", "Qm2");
    await contract.connect(owner).fileClaim(1);

    const finderIds = await contract.getItemsByFinder(finder.address);
    expect(finderIds.length).to.equal(2);

    const ownerIds = await contract.getItemsByOwner(owner.address);
    expect(ownerIds.length).to.equal(1);
  });
});