import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Services from './pages/Services'
import About from './pages/About'
import Contact from './pages/Contact'
import Booking from './pages/Booking'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Admin from './pages/Admin'
import UserDashboard from './pages/UserDashboard'
import ForgotPassword from './pages/ForgotPassword'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'

function App() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <Router>
        <ScrollToTop />
        <div className='min-h-screen bg-gradient-to-br from-white via-purple-50 to-white overflow-hidden'>
          <Header scrolled={scrolled} />
          <main className='relative'>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/services" element={<Services />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/booking" element={<Booking />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path='/privacy-policy' element={<PrivacyPolicy />} />
              <Route path='/terms-of-service' element={<TermsOfService />} />
            </Routes>
          </main>
        </div>
      </Router>
    </>
  )
}

export default App
