import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Hero from '../components/Hero'
import Features from '../components/Features'
import Services from '../components/Services'
import CTA from '../components/CTA'
import Footer from '../components/Footer'

export default function Home() {
    const navigate = useNavigate()
    const { user } = useAuth()

    // Redirect admin users to admin dashboard
    useEffect(() => {
        if (user?.role === 'admin') {
            navigate('/admin', { replace: true })
        }
    }, [user, navigate])

    return (
        <>
            <Hero />
            <Features />
            <Services />
            <CTA />
            <Footer />
        </>
    )
}