import { motion } from 'framer-motion'
import { Sparkles, Bath, Scissors, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAdminRedirect } from '../utils/useAdminRedirect'
import Footer from '../components/Footer'

export default function Services() {
    const navigate = useNavigate()
    useAdminRedirect()

    const services = [
        {
            icon: Sparkles,
            title: 'Full Grooming Package',
            price: '₱1,200',
            description: 'Complete grooming with bath, haircut, nail trim, and ear cleaning',
            duration: '3-4 hours',
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
            description: 'Relaxing bath with premium shampoo and thorough brushing',
            duration: '1.5-2 hours',
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
            description: 'Professional haircut with breed-specific styling',
            duration: '2-3 hours',
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
            description: 'Fast maintenance service for nails, paws, and sanitary trimming',
            duration: '30-45 minutes',
            details: [
                'Nail trimming',
                'Paw pad care',
                'Sanitary trim',
                'Quick touch-up',
                'Express service'
            ]
        }
    ]

    return (
        <>
            <section className='pt-32 pb-20 px-4'>
                <div className='max-w-7xl mx-auto'>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className='text-center mb-16'
                    >
                        <h1 className='text-5xl md:text-6xl font-bold text-gray-900 mb-4'>
                            Our Services
                        </h1>

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
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        duration: 0.6,
                                        delay: index * 0.1
                                    }}
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
                                        onClick={() => navigate('/booking')}
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

            <Footer />
        </>
    )
}