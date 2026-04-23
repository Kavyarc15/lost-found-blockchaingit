import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { ethers } from 'ethers'

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
  // Uses the Vite proxy (/rpc → localhost:8545) so it works in both
  // local development AND GitHub Codespaces (where the browser can't
  // reach localhost:8545 directly, but the Vite server can).
  const readProvider = useMemo(() => {
    const rpcUrl = window.location.origin + '/rpc'
    return new ethers.JsonRpcProvider(rpcUrl)
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
      setChainId(Number(network.chainId))
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
    readProvider,  // Direct RPC provider for reads (works in Codespaces)
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
