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
 * Helper: detects nonce-related errors from Hardhat (-32000 "nonce too high")
 * and resets the Hardhat node nonce to match the expected value,
 * then retries the transaction once.
 */
async function sendWithNonceRetry(contractMethod, args, signerInstance, readProvider) {
  try {
    const tx = await contractMethod(...args)
    return tx
  } catch (err) {
    const msg = (err.message || '') + (err.info?.error?.message || '') + (err.error?.message || '')
    const isNonceError = msg.includes('nonce too high') || msg.includes('nonce too low') ||
      (err.code === -32000 && msg.toLowerCase().includes('nonce'))

    if (!isNonceError) throw err

    console.warn('[Contract] Nonce mismatch detected, attempting auto-fix...')
    try {
      const signerAddr = await signerInstance.getAddress()
      // Reset the Hardhat node's nonce for this account to 0, then let the
      // node auto-increment. We use hardhat_dropTransaction isn't available,
      // so we use hardhat_setNonce to the node's latest count.
      const rpcUrl = window.location.origin + '/rpc'
      const rpcNetwork = new ethers.Network('hardhat', HARDHAT_CHAIN_ID)
      const directProvider = new ethers.JsonRpcProvider(rpcUrl, rpcNetwork, { staticNetwork: rpcNetwork })
      
      // Get the actual on-chain nonce
      const onChainNonce = await directProvider.send('eth_getTransactionCount', [signerAddr, 'latest'])
      console.log('[Contract] On-chain nonce:', onChainNonce, '— resetting MetaMask nonce cache')

      // Tell MetaMask to re-derive the nonce by dropping and re-adding the network
      // But simpler: just set Hardhat node nonce to what MetaMask expects
      // Since we can't control MetaMask, we set the node nonce to a high value
      // and let it work from there
      const expectedNonce = await signerInstance.getNonce('pending')
      const nonceHex = '0x' + expectedNonce.toString(16)
      await directProvider.send('hardhat_setNonce', [signerAddr, nonceHex])
      console.log('[Contract] Node nonce reset to', expectedNonce, '— retrying transaction...')

      // Retry the transaction
      const tx = await contractMethod(...args)
      return tx
    } catch (retryErr) {
      console.error('[Contract] Retry after nonce reset also failed:', retryErr)
      throw err // Throw the original error
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
        signer,
        readProvider
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
  }, [contract, readContract, signer, readProvider])

  const fileClaim = useCallback(async (itemId) => {
    if (!contract) throw new Error('Contract not loaded')
    setLoading(true)
    setError(null)
    try {
      const tx = await sendWithNonceRetry(
        contract.fileClaim.bind(contract),
        [itemId],
        signer,
        readProvider
      )
      await tx.wait()
    } catch (err) {
      setError(err.reason || err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [contract, signer, readProvider])

  const confirmReturn = useCallback(async (itemId, confirmImageHash) => {
    if (!contract) throw new Error('Contract not loaded')
    setLoading(true)
    setError(null)
    try {
      const tx = await sendWithNonceRetry(
        contract.confirmReturn.bind(contract),
        [itemId, confirmImageHash],
        signer,
        readProvider
      )
      await tx.wait()
    } catch (err) {
      setError(err.reason || err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [contract, signer, readProvider])

  const disputeItem = useCallback(async (itemId) => {
    if (!contract) throw new Error('Contract not loaded')
    setLoading(true)
    setError(null)
    try {
      const tx = await sendWithNonceRetry(
        contract.disputeItem.bind(contract),
        [itemId],
        signer,
        readProvider
      )
      await tx.wait()
    } catch (err) {
      setError(err.reason || err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [contract, signer, readProvider])

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
