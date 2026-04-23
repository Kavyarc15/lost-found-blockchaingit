import { useState, useEffect, useCallback, useMemo } from 'react'
import { ethers } from 'ethers'
import { useWeb3 } from '../context/Web3Context'

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

export function useContract() {
  const { signer, readProvider } = useWeb3()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [contractAddress, setContractAddress] = useState(null)

  // Dynamically load the deployed contract address
  useEffect(() => {
    import('../contracts/LostAndFound.json')
      .then((mod) => {
        const data = mod.default || mod
        setContractAddress(data.address)
      })
      .catch(() => {
        console.warn('Contract ABI not found. Deploy the contract first.')
      })
  }, [])

  // Write contract: uses wallet signer (for transactions)
  const contract = useMemo(() => {
    if (!signer || !contractAddress) return null
    return new ethers.Contract(contractAddress, ABI, signer)
  }, [signer, contractAddress])

  // Read contract: uses direct JSON-RPC provider via Vite proxy
  // This bypasses the wallet entirely for reads, which fixes Codespaces
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
    if (!readContract) return []
    const ids = await readContract.getAllItemIds()
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
  }, [readContract])

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
    if (!contract) throw new Error('Contract not loaded')
    setLoading(true)
    setError(null)
    try {
      const tx = await contract.reportItem(name, description, location, imageHash)
      const receipt = await tx.wait()

      // Transaction succeeded! Now try to extract the new item ID.
      // This is best-effort — if parsing fails, we still return success.
      try {
        // Method 1: Check if receipt already has parsed logs (ethers v6 EventLog)
        for (const log of (receipt.logs || [])) {
          if (log.fragment?.name === 'ItemReported' || log.eventName === 'ItemReported') {
            return Number(log.args?.itemId || log.args?.[0])
          }
        }

        // Method 2: Manually parse logs that have topics
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
            } catch {
              // Not our event, skip
            }
          }
        }

        // Method 3: Fallback — get the latest item ID from the contract
        const totalItems = await contract.getTotalItems()
        return Number(totalItems)
      } catch {
        // Event parsing failed but transaction was successful
        // Return null to indicate success without a specific ID
        return null
      }
    } catch (err) {
      setError(err.reason || err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [contract])

  const fileClaim = useCallback(async (itemId) => {
    if (!contract) throw new Error('Contract not loaded')
    setLoading(true)
    setError(null)
    try {
      const tx = await contract.fileClaim(itemId)
      await tx.wait()
    } catch (err) {
      setError(err.reason || err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [contract])

  const confirmReturn = useCallback(async (itemId, confirmImageHash) => {
    if (!contract) throw new Error('Contract not loaded')
    setLoading(true)
    setError(null)
    try {
      const tx = await contract.confirmReturn(itemId, confirmImageHash)
      await tx.wait()
    } catch (err) {
      setError(err.reason || err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [contract])

  const disputeItem = useCallback(async (itemId) => {
    if (!contract) throw new Error('Contract not loaded')
    setLoading(true)
    setError(null)
    try {
      const tx = await contract.disputeItem(itemId)
      await tx.wait()
    } catch (err) {
      setError(err.reason || err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [contract])

  return {
    contract,
    readContract,
    loading,
    error,
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
