import { motion } from 'framer-motion'
import { Sparkles, Bath, Scissors, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Services() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleBookingClick = () => {
    if (!user) {
      navigate('/login', { state: { from: '/booking' } })
      return
    }

    navigate('/booking')
  }

  const services = [
    {
      icon: Sparkles,
      title: 'Full Grooming',
      price: '₱1,200',
      duration: '3-4 hours',
      description:
        'Complete grooming package including bath, haircut, nail trim, and ear cleaning. Perfect for dogs needing full maintenance.',
      details: [
        'Professional bath',
        'Custom haircut',
        'Nail trimming',
        'Ear cleaning',
        'Paw pad trimming'
      ]
    },
    {
      icon: Bath,
      title: 'Bath & Brush',
      price: '₱600',
      duration: '1.5-2 hours',
      description:
        'Gentle bath with premium products followed by professional brushing. Ideal for maintaining coat health.',
      details: [
        'Warm water bath',
        'Premium shampoo',
        'Conditioning treatment',
        'Professional brushing',
        'Drying service'
      ]
    },
    {
      icon: Scissors,
      title: 'Haircut Special',
      price: '₱800',
      duration: '2-3 hours',
      description:
        "Trending styles with AI-powered recommendations based on your dog's breed and season.",
      details: [
        'AI-recommended style',
        'Breed-specific cuts',
        'Seasonal styling',
        'Professional grooming',
        'Style consultation'
      ]
    },
    {
      icon: Clock,
      title: 'Quick Trim',
      price: '₱400',
      duration: '30-45 minutes',
      description:
        'Fast maintenance service for nails, paws, and sanitary trimming.',
      details: [
        'Nail trimming',
        'Paw pad care',
        'Sanitary trim',
        'Quick touch-up',
        'Express service',
      ]
    }
  ]

  return (
    <section className='pt-20 pb-20 px-4'>
      <div className='max-w-7xl mx-auto'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className='text-center mb-16'
        >
          <h2 className='text-5xl md:text-6xl font-bold text-gray-900 mb-4'>
            Our Services
          </h2>

          <p className='text-xl text-gray-600'>
            Premium grooming services tailored for your furry friend
          </p>
        </motion.div>

        <div className='grid md:grid-cols-2 gap-8'>
          {services.map((service, index) => {
            const Icon = service.icon

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.1
                }}
                viewport={{ once: true }}
                className='bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100'
              >
                <div className='flex items-start gap-4 mb-4'>
                  <div className='w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-purple-400 flex items-center justify-center flex-shrink-0'>
                    <Icon
                      className='text-white'
                      size={32}
                    />
                  </div>

                  <div>
                    <h3 className='text-2xl font-bold text-gray-900'>
                      {service.title}
                    </h3>

                    <p className='text-sm text-gray-500'>
                      Duration: {service.duration}
                    </p>
                  </div>
                </div>

                <p className='text-3xl font-bold text-purple-600 mb-4'>
                  {service.price}
                </p>

                <p className='text-gray-600 mb-6'>
                  {service.description}
                </p>

                <div className='mb-6'>
                  <h4 className='font-bold text-gray-900 mb-3'>
                    Includes:
                  </h4>

                  <ul className='space-y-2'>
                    {service.details.map((detail, idx) => (
                      <li
                        key={idx}
                        className='flex items-center gap-2 text-gray-600'
                      >
                        <div className='w-2 h-2 rounded-full bg-purple-500 flex-shrink-0' />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBookingClick}
                  className='cursor-pointer w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3 rounded-lg font-bold hover:shadow-lg hover:shadow-purple-500/50 transition-all focus:outline-none focus:ring-4 focus:ring-purple-200'
                >
                  Book Now
                </motion.button>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}