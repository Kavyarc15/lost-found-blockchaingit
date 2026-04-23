import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { ethers } from 'ethers'
import { HARDHAT_CHAIN_ID } from '../utils/constants'

const Web3Context = createContext(null)

export function useWeb3() {
  const ctx = useContext(Web3Context)
  if (!ctx) throw new Error('useWeb3 must be used inside Web3Provider')
  return ctx
}

export function Web3Provider({ children }) {
  const [account, setAccount] = useState(null)
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)

  // Direct JSON-RPC provider for READ operations.
  // Uses the Vite proxy (/rpc → localhost:8545).
  // staticNetwork skips async network detection which can fail in Codespaces.
  const readProvider = useMemo(() => {
    try {
      const rpcUrl = window.location.origin + '/rpc'
      const network = new ethers.Network('hardhat', HARDHAT_CHAIN_ID)
      const prov = new ethers.JsonRpcProvider(rpcUrl, network, {
        staticNetwork: network,
        batchMaxCount: 1,  // disable batching for better proxy compatibility
      })
      console.log('[Web3] Read provider created:', rpcUrl)
      return prov
    } catch (err) {
      console.error('[Web3] Failed to create read provider:', err)
      return null
    }
  }, [])

  // Automatically detect if already connected
  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return

    const eth = window.ethereum
    const prov = new ethers.BrowserProvider(eth)
    setProvider(prov)

    // check for existing accounts
    eth.request({ method: 'eth_accounts' }).then((accounts) => {
      if (accounts.length > 0) {
        setAccount(accounts[0])
        prov.getSigner().then(setSigner)
      }
    })

    eth.request({ method: 'eth_chainId' }).then((id) => {
      setChainId(parseInt(id, 16))
    })

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setAccount(null)
        setSigner(null)
      } else {
        setAccount(accounts[0])
        prov.getSigner().then(setSigner)
      }
    }

    const handleChainChanged = (id) => {
      setChainId(parseInt(id, 16))
      window.location.reload()
    }

    eth.on('accountsChanged', handleAccountsChanged)
    eth.on('chainChanged', handleChainChanged)

    return () => {
      eth.removeListener('accountsChanged', handleAccountsChanged)
      eth.removeListener('chainChanged', handleChainChanged)
    }
  }, [])

  // Ask MetaMask to clear its cached nonce for the current account.
  // This fixes the "nonce too high" error that occurs when the Hardhat
  // node restarts and resets nonces while MetaMask still remembers old ones.
  const resetNonce = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') return
    try {
      // This is a Hardhat-specific RPC method that resets MetaMask's
      // nonce tracking by resetting the node state.
      // Instead, we use the standard `wallet_requestPermissions` trick:
      // Re-requesting permissions forces MetaMask to refresh its internal
      // account state, including the cached nonce.
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      })
      console.log('[Web3] MetaMask nonce cache cleared via permission re-request')
    } catch (err) {
      // Fallback: instruct user to manually reset
      console.warn('[Web3] Could not auto-reset nonce:', err.message)
    }
  }, [])

  const connectWallet = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('MetaMask is not installed. Please install MetaMask to continue.')
      return
    }

    setConnecting(true)
    setError(null)
    try {
      const eth = window.ethereum
      const accounts = await eth.request({ method: 'eth_requestAccounts' })
      const prov = new ethers.BrowserProvider(eth)
      const sig = await prov.getSigner()

      setProvider(prov)
      setSigner(sig)
      setAccount(accounts[0])

      const network = await prov.getNetwork()
      const currentChainId = Number(network.chainId)
      setChainId(currentChainId)

      // On Hardhat local network, send hardhat_setNonce to sync the node
      // with whatever nonce MetaMask has, preventing mismatch errors.
      if (currentChainId === HARDHAT_CHAIN_ID) {
        try {
          // Get MetaMask's view of the nonce (pending tx count)
          const metaMaskNonce = await prov.send('eth_getTransactionCount', [accounts[0], 'pending'])
          // Get the Hardhat node's actual nonce
          const nodeNonce = await prov.send('eth_getTransactionCount', [accounts[0], 'latest'])
          
          if (metaMaskNonce !== nodeNonce) {
            console.warn(`[Web3] Nonce mismatch detected — MetaMask: ${metaMaskNonce}, Node: ${nodeNonce}`)
            // Use hardhat_setNonce to sync the node to MetaMask's expected nonce
            const rpcUrl = window.location.origin + '/rpc'
            const rpcNetwork = new ethers.Network('hardhat', HARDHAT_CHAIN_ID)
            const directProvider = new ethers.JsonRpcProvider(rpcUrl, rpcNetwork, { staticNetwork: rpcNetwork })
            await directProvider.send('hardhat_setNonce', [accounts[0], metaMaskNonce])
            console.log('[Web3] Node nonce synced to', metaMaskNonce)
          }
        } catch (nonceErr) {
          console.warn('[Web3] Nonce sync attempt failed (non-critical):', nonceErr.message)
        }
      }
    } catch (err) {
      if (err.code === 4001) {
        setError('Connection rejected. Please approve the MetaMask connection.')
      } else {
        setError('Failed to connect wallet. Please try again.')
      }
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnectWallet = useCallback(() => {
    setAccount(null)
    setSigner(null)
  }, [])

  const value = {
    account,
    provider,
    readProvider,
    signer,
    chainId,
    connecting,
    error,
    connectWallet,
    disconnectWallet,
    isConnected: !!account,
  }

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  )
}
