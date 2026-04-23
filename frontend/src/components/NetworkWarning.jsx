import { useWeb3 } from '../context/Web3Context'
import { HARDHAT_CHAIN_ID } from '../utils/constants'

export default function NetworkWarning() {
  const { chainId, account } = useWeb3()

  if (!account || chainId === HARDHAT_CHAIN_ID) return null

  const switchNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x' + HARDHAT_CHAIN_ID.toString(16) }],
      })
    } catch (switchError) {
      // Chain not added yet — add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x' + HARDHAT_CHAIN_ID.toString(16),
              chainName: 'Hardhat Local',
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['http://127.0.0.1:8545'],
            }],
          })
        } catch (addError) {
          console.error('Failed to add network:', addError)
        }
      } else {
        console.error('Failed to switch network:', switchError)
      }
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: '70px',
      left: 0,
      right: 0,
      zIndex: 150,
      background: 'rgba(244, 92, 67, 0.95)',
      backdropFilter: 'blur(10px)',
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      fontSize: '0.95rem',
      fontWeight: 600,
      color: '#fff',
      boxShadow: '0 4px 20px rgba(244, 92, 67, 0.3)',
    }}>
      <span>⚠️ Wrong network detected! Please switch to <strong>Hardhat Local</strong> (Chain ID: {HARDHAT_CHAIN_ID}) to use this app.</span>
      <button
        onClick={switchNetwork}
        style={{
          padding: '8px 20px',
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: '8px',
          color: '#fff',
          fontWeight: 700,
          cursor: 'pointer',
          fontSize: '0.85rem',
          whiteSpace: 'nowrap',
        }}
      >
        🔄 Switch Network
      </button>
    </div>
  )
}
