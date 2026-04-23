import { Routes, Route, Navigate } from 'react-router-dom'
import { useWeb3 } from './context/Web3Context'
import Navbar from './components/Navbar'
import NetworkWarning from './components/NetworkWarning'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import ReportItem from './pages/ReportItem'
import ItemDetail from './pages/ItemDetail'
import MyItems from './pages/MyItems'

function App() {
  const { account } = useWeb3()

  return (
    <>
      <Navbar />
      <NetworkWarning />
      <Routes>
        <Route path="/" element={account ? <Navigate to="/dashboard" /> : <Landing />} />
        <Route path="/dashboard" element={account ? <Dashboard /> : <Navigate to="/" />} />
        <Route path="/report" element={account ? <ReportItem /> : <Navigate to="/" />} />
        <Route path="/item/:id" element={account ? <ItemDetail /> : <Navigate to="/" />} />
        <Route path="/my-items" element={account ? <MyItems /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  )
}

export default App
