import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Scissors, Star, Shield } from 'lucide-react'

export default function Hero() {
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
    <section className='min-h-screen flex items-center justify-center relative overflow-hidden pt-20'>
      {/* Background blobs */}
      <div className='absolute top-32 -left-24 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse' />
      <div className='absolute bottom-32 -right-24 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse' />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className='text-center z-10 px-4 max-w-5xl mx-auto'
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className='inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-5 py-2.5 rounded-full text-sm font-bold mb-6 border border-purple-200'
        >
          <Star
            size={14}
            className='text-yellow-500 fill-yellow-500'
          />
          Premium Dog Grooming — AI Powered
        </motion.div>

        <h1 className='text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight'>
          Premium Dog
          <span className='block bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 text-transparent bg-clip-text'>
            Grooming Made Simple
          </span>
        </h1>

        <p className='text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed'>
          Book appointments online, get AI-powered haircut recommendations
          tailored to your dog&apos;s breed and the current season.
        </p>

        <div className='flex flex-col sm:flex-row gap-4 justify-center mb-16'>
          <motion.button
            whileHover={{
              scale: 1.05,
              boxShadow: '0 20px 40px rgba(168,85,247,0.4)'
            }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBookingClick}
            className='cursor-pointer bg-gradient-to-r from-purple-600 to-purple-500 text-white px-9 py-4 rounded-full font-bold text-lg shadow-lg shadow-purple-500/40 transition-all focus:outline-none focus:ring-4 focus:ring-purple-300'
          >
            Book Appointment Now
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/services')}
            className='cursor-pointer border-2 border-purple-600 text-purple-600 px-9 py-4 rounded-full font-bold text-lg hover:bg-purple-50 transition-all focus:outline-none focus:ring-4 focus:ring-purple-100'
          >
            View Services
          </motion.button>
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className='flex flex-wrap justify-center gap-6 text-sm text-gray-500'
        >
          {[
            {
              icon: Shield,
              text: 'Certified Groomers'
            },
            {
              icon: Scissors,
              text: 'AI Haircut Suggestions'
            },
            {
              icon: Star,
              text: '500+ Happy Pets'
            }
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className='flex items-center gap-2'
            >
              <Icon
                size={16}
                className='text-purple-500'
              />

              <span className='font-medium'>
                {text}
              </span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{
          duration: 2,
          repeat: Infinity
        }}
        className='absolute bottom-10 left-1/2 -translate-x-1/2'
      >
        <div className='w-6 h-10 border-2 border-purple-400 rounded-full flex items-start justify-center p-2'>
          <motion.div className='w-1 h-2 bg-purple-500 rounded-full' />
        </div>
      </motion.div>
    </section>
  )
}