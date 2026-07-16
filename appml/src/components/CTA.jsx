import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function CTA() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleBookingClick = () => {
    if (!user) {
      navigate('/login', { state: { from: '/booking' } })
      return
    }

    navigate('/booking')
  }

  return (
    <section className='py-20 px-4'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className='max-w-4xl mx-auto bg-gradient-to-r from-purple-600 to-purple-500 rounded-2xl p-12 text-center text-white'
      >
        <h2 className='text-4xl md:text-5xl font-bold mb-4'>
          Ready to Pamper Your Pet?
        </h2>

        <p className='text-xl mb-8 text-purple-100'>
          Book an appointment today and give your furry friend the premium
          grooming experience they deserve.
        </p>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleBookingClick}
          className='cursor-pointer bg-white text-purple-600 px-8 py-4 rounded-full font-bold text-lg hover:shadow-lg transition-all focus:outline-none focus:ring-4 focus:ring-white/50'
        >
          Book Appointment Now
        </motion.button>
      </motion.div>
    </section>
  )
}