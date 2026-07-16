import { motion } from 'framer-motion'
import { useAdminRedirect } from '../utils/useAdminRedirect'
import Footer from '../components/Footer'

export default function About() {
    useAdminRedirect()

    return (
        <>
            <section className='pt-32 pb-20 px-4'>
                <div className='max-w-4xl mx-auto'>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className='text-center mb-16'
                    >
                        <h1 className='text-5xl md:text-6xl font-bold text-gray-900 mb-4'>
                            About Timmy Tails
                        </h1>
                        <p className='text-xl text-gray-600'>
                            Your trusted partner in premium dog grooming
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className='bg-white rounded-2xl p-8 shadow-lg border border-gray-100 mb-8'
                    >
                        <h2 className='text-3xl font-bold text-gray-900 mb-4'>Our Mission</h2>
                        <p className='text-gray-600 text-lg leading-relaxed mb-6'>
                            At Timmy Tails, we believe every dog deserves premium grooming care. Our mission is to make professional dog grooming accessible, convenient, and stress-free for pet owners through innovative AI-powered recommendations and expert care.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className='bg-white rounded-2xl p-8 shadow-lg border border-gray-100'
                    >
                        <h2 className='text-3xl font-bold text-gray-900 mb-4'>Why Choose Us</h2>
                        <ul className='space-y-4 text-gray-600 text-lg'>
                            <li className='flex gap-3'>
                                <span className='text-purple-600 font-bold'>✓</span>
                                <span>Expert certified groomers with years of experience</span>
                            </li>
                            <li className='flex gap-3'>
                                <span className='text-purple-600 font-bold'>✓</span>
                                <span>AI-powered haircut recommendations</span>
                            </li>
                            <li className='flex gap-3'>
                                <span className='text-purple-600 font-bold'>✓</span>
                                <span>24/7 online booking system</span>
                            </li>
                            <li className='flex gap-3'>
                                <span className='text-purple-600 font-bold'>✓</span>
                                <span>Premium products for all coat types</span>
                            </li>
                            <li className='flex gap-3'>
                                <span className='text-purple-600 font-bold'>✓</span>
                                <span>Stress-free environment for your pet</span>
                            </li>
                        </ul>
                    </motion.div>
                </div>
            </section>
            <Footer />
        </>
    )
}