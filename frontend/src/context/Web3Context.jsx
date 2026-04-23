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

  const connectWallet = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('Please install a Web3 wallet (MetaMask, Brave Wallet, etc.) to continue.')
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
      setChainId(Number(network.chainId))

      // Note: Nonce mismatch recovery (e.g. after Hardhat node restart)
      // is handled automatically by sendWithNonceRetry in useContract.js.
      // It catches nonce errors, parses the expected value, updates the
      // Hardhat node via hardhat_setNonce, and retries the transaction.
    } catch (err) {
      if (err.code === 4001) {
        setError('Connection rejected. Please approve the wallet connection.')
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
