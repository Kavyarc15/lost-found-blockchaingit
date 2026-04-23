import { useWeb3 } from '../context/Web3Context'
import { shortenAddress } from '../utils/formatters'

export default function WalletButton() {
  const { account, connecting, connectWallet, disconnectWallet, error } = useWeb3()

  if (account) {
    return (
      <button
        className="wallet-btn connected"
        onClick={disconnectWallet}
        title={`Connected: ${account}\nClick to disconnect`}
      >
        <span className="wallet-btn-dot" />
        {shortenAddress(account)}
      </button>
    )
  }

  return (
    <button
      className="wallet-btn disconnected"
      onClick={connectWallet}
      disabled={connecting}
      title={error || 'Connect MetaMask'}
    >
      {connecting ? '⏳' : '🦊'} {connecting ? 'Connecting…' : 'Connect Wallet'}
    </button>
  )
}
