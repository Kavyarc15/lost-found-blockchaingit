// Pinata API configuration
// For development without Pinata keys, images are stored as data URIs in localStorage
// and a simulated CID is returned.

const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY || ''
const PINATA_SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY || ''
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/'

/**
 * Upload a file to Pinata IPFS.
 * Falls back to a local mock if no API keys are configured.
 */
export async function uploadToIPFS(file) {
  // If Pinata keys are configured, use the real API
  if (PINATA_API_KEY && PINATA_SECRET_KEY) {
    const formData = new FormData()
    formData.append('file', file)

    const metadata = JSON.stringify({ name: file.name })
    formData.append('pinataMetadata', metadata)

    const options = JSON.stringify({ cidVersion: 1 })
    formData.append('pinataOptions', options)

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
      body: formData,
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.details || 'Failed to upload to IPFS')
    }

    const data = await res.json()
    return data.IpfsHash
  }

  // Mock mode: generate a fake CID and store image data locally
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const fakeHash = 'Qm' + Math.random().toString(36).slice(2, 15) + Math.random().toString(36).slice(2, 15)
      // Store in localStorage so we can retrieve it
      try {
        localStorage.setItem(`ipfs_${fakeHash}`, reader.result)
      } catch {
        // localStorage might be full, ignore
      }
      resolve(fakeHash)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Get the URL for an IPFS hash.
 * Uses Pinata gateway if keys are configured, else falls back to localStorage.
 */
export function getIPFSUrl(hash) {
  if (!hash) return null

  // Check localStorage first (mock mode)
  const localData = localStorage.getItem(`ipfs_${hash}`)
  if (localData) return localData

  // Use Pinata gateway
  return `${PINATA_GATEWAY}${hash}`
}
