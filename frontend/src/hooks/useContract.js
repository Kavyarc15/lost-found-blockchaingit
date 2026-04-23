import { useState, useEffect, useCallback, useMemo } from 'react'
import { ethers } from 'ethers'
import { useWeb3 } from '../context/Web3Context'
import { HARDHAT_CHAIN_ID } from '../utils/constants'

// The ABI matching the Solidity contract
const ABI = [
  "function reportItem(string,string,string,string) external returns (uint256)",
  "function fileClaim(uint256) external",
  "function confirmReturn(uint256,string) external",
  "function disputeItem(uint256) external",
  "function resolveDispute(uint256,uint8) external",
  "function getItem(uint256) external view returns (tuple(uint256 id,string name,string description,string location,string imageHash,string confirmImageHash,address finder,address owner,uint8 status,uint256 reportedAt,uint256 claimedAt,uint256 returnedAt))",
  "function getTotalItems() external view returns (uint256)",
  "function getAllItemIds() external view returns (uint256[])",
  "function getItemsByFinder(address) external view returns (uint256[])",
  "function getItemsByOwner(address) external view returns (uint256[])",
  "function admin() external view returns (address)",
  "event ItemReported(uint256 indexed itemId, address indexed finder, string name, string imageHash, uint256 timestamp)",
  "event ClaimFiled(uint256 indexed itemId, address indexed owner, uint256 timestamp)",
  "event ItemReturned(uint256 indexed itemId, address indexed owner, string confirmImageHash, uint256 timestamp)",
  "event ItemDisputed(uint256 indexed itemId, address indexed admin, uint256 timestamp)",
  "event DisputeResolved(uint256 indexed itemId, uint8 newStatus, address indexed admin, uint256 timestamp)",
]

/**
 * Fetches the contract address by trying multiple sources:
 * 1. The deployed JSON file (works if deploy script ran in this env)
 * 2. Well-known Hardhat deploy addresses (deterministic based on nonce)
 */
async function discoverContractAddress(readProvider) {
  // Source 1: Try loading from the JSON file
  try {
    const mod = await import('../contracts/LostAndFound.json')
    const data = mod.default || mod
    if (data.address) {
      // Verify the contract actually exists at this address
      const code = await readProvider.getCode(data.address)
      if (code !== '0x') {
        console.log('[Contract] Found via JSON:', data.address)
        return data.address
      }
      console.warn('[Contract] JSON address has no code, scanning...')
    }
  } catch {
    console.warn('[Contract] No JSON file found, scanning...')
  }

  // Source 2: Scan recent Hardhat deployments
  // Hardhat account #0 deploys contracts at deterministic addresses based on nonce.
  // We check the first 10 possible deployment addresses.
  const deployerAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' // Hardhat account #0
  for (let nonce = 0; nonce < 10; nonce++) {
    const addr = ethers.getCreateAddress({ from: deployerAddress, nonce })
    try {
      const code = await readProvider.getCode(addr)
      if (code !== '0x') {
        // Found a contract! Verify it's ours by calling getTotalItems
        const testContract = new ethers.Contract(addr, ["function getTotalItems() view returns (uint256)"], readProvider)
        await testContract.getTotalItems()
        console.log('[Contract] Found via scan at nonce', nonce, ':', addr)
        return addr
      }
    } catch {
      // Not our contract or no contract, try next nonce
    }
  }

  return null
}

/**
 * Creates a direct JSON-RPC provider to the Hardhat node (bypasses wallet).
 * Used for sending Hardhat-specific admin commands like hardhat_setNonce.
 */
function getDirectProvider() {
  const rpcUrl = window.location.origin + '/rpc'
  const rpcNetwork = new ethers.Network('hardhat', HARDHAT_CHAIN_ID)
  return new ethers.JsonRpcProvider(rpcUrl, rpcNetwork, {
    staticNetwork: rpcNetwork,
    batchMaxCount: 1,
  })
}

/**
 * Pre-sync: Asks the wallet for its pending nonce, then tells the Hardhat
 * node to adopt that nonce value so the next transaction won't be rejected.
 * This fixes "nonce too high" errors that happen when the Hardhat node
 * restarts but the wallet (Brave / MetaMask) remembers old nonces.
 */
async function presyncNonce(signerInstance) {
  try {
    const addr = await signerInstance.getAddress()
    const directProvider = getDirectProvider()

    // What the node thinks the nonce should be
    const nodeNonceHex = await directProvider.send('eth_getTransactionCount', [addr, 'latest'])
    const nodeNonce = parseInt(nodeNonceHex, 16)

    // What the wallet will send as nonce (asks through the wallet provider)
    // BrowserProvider.send goes through the wallet's RPC, so this reflects
    // what the wallet believes the nonce to be.
    let walletNonce
    try {
      walletNonce = await signerInstance.getNonce()
    } catch {
      walletNonce = nodeNonce
    }

    if (walletNonce !== nodeNonce) {
      console.warn(`[Nonce] Mismatch — Wallet: ${walletNonce}, Node: ${nodeNonce}. Syncing node...`)
      const nonceHex = '0x' + walletNonce.toString(16)
      await directProvider.send('hardhat_setNonce', [addr, nonceHex])
      console.log(`[Nonce] Node nonce set to ${walletNonce} ✓`)
    }
  } catch (err) {
    console.warn('[Nonce] Pre-sync failed (non-critical):', err.message)
  }
}

/**
 * Parses a nonce error message to extract the "got N" value,
 * which is the nonce the wallet actually sent.
 * Example: "Expected nonce to be 1 but got 8"
 */
function parseNonceFromError(err) {
  const msg = (err.message || '') + ' ' + (err.info?.error?.message || '') + ' ' + (err.error?.message || '') + ' ' + (err.data?.message || '')
  // Match patterns like "but got 8" or "got 8"
  const gotMatch = msg.match(/got (\d+)/)
  if (gotMatch) return parseInt(gotMatch[1], 10)
  // Match "nonce too high" style with number context
  const expectedMatch = msg.match(/expected (?:nonce )?(?:to be )?(\d+)/i)
  if (expectedMatch) return null // We know expected but not what wallet sent
  return null
}

/**
 * Sends a transaction with automatic nonce recovery.
 * 1. Pre-syncs the Hardhat node nonce to the wallet's nonce
 * 2. Attempts the transaction
 * 3. On nonce error: parses the exact "got" nonce, sets it on the node, retries
 */
async function sendWithNonceRetry(contractMethod, args, signerInstance) {
  // Step 1: Pre-sync nonce before even trying
  await presyncNonce(signerInstance)

  try {
    // Step 2: Attempt the transaction
    const tx = await contractMethod(...args)
    return tx
  } catch (err) {
    const msg = (err.message || '') + ' ' + (err.info?.error?.message || '') + ' ' + (err.error?.message || '') + ' ' + (err.data?.message || '')
    const isNonceError = msg.toLowerCase().includes('nonce too high') ||
      msg.toLowerCase().includes('nonce too low') ||
      (String(err.code) === '-32000' && msg.toLowerCase().includes('nonce'))

    if (!isNonceError) throw err

    console.warn('[Contract] Nonce error caught, attempting fix via error parsing...')

    // Step 3: Parse the wallet nonce from the error and force-set it
    try {
      const addr = await signerInstance.getAddress()
      const directProvider = getDirectProvider()
      const walletNonce = parseNonceFromError(err)

      if (walletNonce !== null) {
        // The error told us what nonce the wallet sent (e.g. "got 8")
        // Set the Hardhat node nonce to that value so it accepts it
        const nonceHex = '0x' + walletNonce.toString(16)
        await directProvider.send('hardhat_setNonce', [addr, nonceHex])
        console.log(`[Contract] Node nonce force-set to ${walletNonce} — retrying...`)
      } else {
        // Fallback: set a high nonce and hope it matches
        const highNonce = '0x' + (100).toString(16)
        await directProvider.send('hardhat_setNonce', [addr, highNonce])
        console.log('[Contract] Node nonce set to fallback 100 — retrying...')
      }

      // Step 4: Retry the transaction
      const tx = await contractMethod(...args)
      return tx
    } catch (retryErr) {
      const retryMsg = (retryErr.message || '') + ' ' + (retryErr.info?.error?.message || '') + ' ' + (retryErr.error?.message || '')
      // If retry also has a nonce error, try one more time with the parsed nonce
      if (retryMsg.toLowerCase().includes('nonce')) {
        const walletNonce2 = parseNonceFromError(retryErr)
        if (walletNonce2 !== null) {
          try {
            const addr = await signerInstance.getAddress()
            const directProvider = getDirectProvider()
            const nonceHex2 = '0x' + walletNonce2.toString(16)
            await directProvider.send('hardhat_setNonce', [addr, nonceHex2])
            console.log(`[Contract] Second fix: node nonce set to ${walletNonce2}`)
            const tx = await contractMethod(...args)
            return tx
          } catch { /* fall through */ }
        }
      }
      console.error('[Contract] Retry after nonce fix failed:', retryErr)
      throw err // Throw the original error for the UI to display
    }
  }
}

export function useContract() {
  const { signer, provider, readProvider } = useWeb3()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [contractAddress, setContractAddress] = useState(null)
  const [notDeployed, setNotDeployed] = useState(false)

  // Auto-discover the contract address
  useEffect(() => {
    if (!readProvider) return

    discoverContractAddress(readProvider)
      .then((addr) => {
        if (addr) {
          setContractAddress(addr)
          setNotDeployed(false)
          console.log('[Contract] Using address:', addr)
        } else {
          setNotDeployed(true)
          console.error('[Contract] No deployed contract found!')
        }
      })
      .catch((err) => {
        console.error('[Contract] Discovery failed:', err)
        setNotDeployed(true)
      })
  }, [readProvider])

  // Write contract: uses wallet signer (for transactions)
  const contract = useMemo(() => {
    if (!signer || !contractAddress) return null
    return new ethers.Contract(contractAddress, ABI, signer)
  }, [signer, contractAddress])

  // Read contract: uses direct JSON-RPC provider via Vite proxy
  const readContract = useMemo(() => {
    if (!readProvider || !contractAddress) return null
    return new ethers.Contract(contractAddress, ABI, readProvider)
  }, [readProvider, contractAddress])

  // ── Read Functions ──────────────────────────────────

  const getTotalItems = useCallback(async () => {
    if (!readContract) return 0
    const total = await readContract.getTotalItems()
    return Number(total)
  }, [readContract])

  const getAllItemIds = useCallback(async () => {
    if (!readContract) return []
    const ids = await readContract.getAllItemIds()
    return ids.map((id) => Number(id))
  }, [readContract])

  const getItem = useCallback(async (itemId) => {
    if (!readContract) return null
    const item = await readContract.getItem(itemId)
    return {
      id: Number(item.id),
      name: item.name,
      description: item.description,
      location: item.location,
      imageHash: item.imageHash,
      confirmImageHash: item.confirmImageHash,
      finder: item.finder,
      owner: item.owner,
      status: Number(item.status),
      reportedAt: Number(item.reportedAt),
      claimedAt: Number(item.claimedAt),
      returnedAt: Number(item.returnedAt),
    }
  }, [readContract])

  const getAllItems = useCallback(async () => {
    if (!readContract) {
      if (notDeployed) {
        throw new Error(
          'Contract not deployed. Run in terminal:\n' +
          'npx hardhat run scripts/deploy.js --network localhost\n' +
          'Then refresh this page.'
        )
      }
      return []
    }

    const ids = await readContract.getAllItemIds()
    console.log('[Contract] getAllItemIds =', ids.length, 'items')
    const items = await Promise.all(
      ids.map(async (id) => {
        const item = await readContract.getItem(id)
        return {
          id: Number(item.id),
          name: item.name,
          description: item.description,
          location: item.location,
          imageHash: item.imageHash,
          confirmImageHash: item.confirmImageHash,
          finder: item.finder,
          owner: item.owner,
          status: Number(item.status),
          reportedAt: Number(item.reportedAt),
          claimedAt: Number(item.claimedAt),
          returnedAt: Number(item.returnedAt),
        }
      })
    )
    return items.reverse() // newest first
  }, [readContract, notDeployed])

  const getItemsByFinder = useCallback(async (address) => {
    if (!readContract) return []
    const ids = await readContract.getItemsByFinder(address)
    return ids.map((id) => Number(id))
  }, [readContract])

  const getItemsByOwner = useCallback(async (address) => {
    if (!readContract) return []
    const ids = await readContract.getItemsByOwner(address)
    return ids.map((id) => Number(id))
  }, [readContract])

  const getAdmin = useCallback(async () => {
    if (!readContract) return null
    return await readContract.admin()
  }, [readContract])

  // ── Write Functions ─────────────────────────────────

  const reportItem = useCallback(async (name, description, location, imageHash) => {
    if (!contract) throw new Error('Contract not loaded. Make sure you are on the Hardhat Local network.')
    setLoading(true)
    setError(null)
    try {
      const tx = await sendWithNonceRetry(
        contract.reportItem.bind(contract),
        [name, description, location, imageHash],
        signer
      )
      const receipt = await tx.wait()

      // Try to parse the ItemReported event to get the new item ID.
      try {
        for (const log of (receipt.logs || [])) {
          if (log.fragment?.name === 'ItemReported' || log.eventName === 'ItemReported') {
            return Number(log.args?.itemId || log.args?.[0])
          }
        }
        for (const log of (receipt.logs || [])) {
          if (log.topics && log.topics.length > 0) {
            try {
              const parsed = contract.interface.parseLog({
                topics: [...log.topics],
                data: log.data,
              })
              if (parsed?.name === 'ItemReported') {
                return Number(parsed.args.itemId)
              }
            } catch { /* skip */ }
          }
        }
        const totalItems = await readContract.getTotalItems()
        return Number(totalItems)
      } catch {
        return null // Transaction succeeded, just can't get the ID
      }
    } catch (err) {
      setError(err.reason || err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [contract, readContract, signer])

  const fileClaim = useCallback(async (itemId) => {
    if (!contract) throw new Error('Contract not loaded')
    setLoading(true)
    setError(null)
    try {
      const tx = await sendWithNonceRetry(
        contract.fileClaim.bind(contract),
        [itemId],
        signer
      )
      await tx.wait()
    } catch (err) {
      setError(err.reason || err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [contract, signer])

  const confirmReturn = useCallback(async (itemId, confirmImageHash) => {
    if (!contract) throw new Error('Contract not loaded')
    setLoading(true)
    setError(null)
    try {
      const tx = await sendWithNonceRetry(
        contract.confirmReturn.bind(contract),
        [itemId, confirmImageHash],
        signer
      )
      await tx.wait()
    } catch (err) {
      setError(err.reason || err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [contract, signer])

  const disputeItem = useCallback(async (itemId) => {
    if (!contract) throw new Error('Contract not loaded')
    setLoading(true)
    setError(null)
    try {
      const tx = await sendWithNonceRetry(
        contract.disputeItem.bind(contract),
        [itemId],
        signer
      )
      await tx.wait()
    } catch (err) {
      setError(err.reason || err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [contract, signer])

  return {
    contract,
    readContract,
    loading,
    error,
    notDeployed,
    // reads
    getTotalItems,
    getAllItemIds,
    getItem,
    getAllItems,
    getItemsByFinder,
    getItemsByOwner,
    getAdmin,
    // writes
    reportItem,
    fileClaim,
    confirmReturn,
    disputeItem,
  }
}
