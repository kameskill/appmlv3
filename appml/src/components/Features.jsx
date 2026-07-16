import { motion } from 'framer-motion'
import { Calendar, TrendingUp, Users } from 'lucide-react'

export default function Features() {
  const features = [
    {
      icon: Calendar,
      title: 'Easy Online Booking',
      description:
        'Schedule appointments 24/7 with real-time availability. No more phone calls or waiting!',
      color: 'from-purple-500 to-purple-400',
    },
    {
      icon: TrendingUp,
      title: 'AI Haircut Trends',
      description:
        "Get ML-powered recommendations for trending styles based on your dog's breed and season.",
      color: 'from-purple-500 to-purple-400',
    },
    {
      icon: Users,
      title: 'Expert Groomers',
      description:
        'Our certified professionals have years of experience with all breeds and temperaments.',
      color: 'from-purple-500 to-purple-400',
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  }

  return (
    <section
      id='features'
      className='py-20 px-4 relative overflow-hidden'
    >
      <div className='max-w-7xl mx-auto'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className='text-center mb-16'
        >
          <h2 className='text-5xl font-bold text-gray-900'>
            Why Choose Timmy Tails?
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial='hidden'
          whileInView='visible'
          viewport={{ once: true, amount: 0.2 }}
          className='grid md:grid-cols-3 gap-8'
        >
          {features.map((feature, index) => {
            const Icon = feature.icon

            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -10 }}
                className='cursor-pointer bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100'
              >
                <div
                  className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6`}
                >
                  <Icon
                    className='text-white'
                    size={32}
                  />
                </div>

                <h3 className='text-2xl font-bold text-gray-900 mb-3'>
                  {feature.title}
                </h3>

                <p className='text-gray-600 leading-relaxed'>
                  {feature.description}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}