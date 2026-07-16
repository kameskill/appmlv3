import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Clock } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { contactApi, getErrorMessage } from '../utils/api'
import { useAdminRedirect } from '../utils/useAdminRedirect'
import Footer from '../components/Footer'

export default function Contact() {
    const navigate = useNavigate()
    useAdminRedirect()

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        message: ''
    })

    const [isLoading, setIsLoading] = useState(false)

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const { data } = await contactApi.send(formData)

            toast.success(data.message)

            setFormData({
                name: '',
                email: '',
                phone: '',
                message: ''
            })
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsLoading(false)
        }
    }

    const inputClass =
        'w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100 transition-all'

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
                            Contact Us
                        </h1>

                        <p className='text-xl text-gray-600'>
                            Get in touch with our grooming experts
                        </p>
                    </motion.div>

                    <div className='grid md:grid-cols-2 gap-8 mb-8'>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6 }}
                            className='space-y-6'
                        >
                            {[
                                {
                                    icon: Phone,
                                    label: 'Phone',
                                    value: '(+63) 975-669-2647',
                                    href: 'tel:+639756692647'
                                },
                                {
                                    icon: Mail,
                                    label: 'Email',
                                    value: 'NA',
                                    href: '#NA'
                                }
                            ].map(({ icon: Icon, label, value, href }) => (
                                <div
                                    key={label}
                                    className='flex gap-4 items-start'
                                >
                                    <div className='w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0'>
                                        <Icon
                                            className='text-purple-600'
                                            size={22}
                                        />
                                    </div>

                                    <div>
                                        <h3 className='font-bold text-gray-900 mb-1'>
                                            {label}
                                        </h3>

                                        <a
                                            href={href}
                                            className='cursor-pointer text-gray-600 hover:text-purple-600 transition-colors focus:outline-none focus:text-purple-600'
                                        >
                                            {value}
                                        </a>
                                    </div>
                                </div>
                            ))}

                            <div className='flex gap-4 items-start'>
                                <div className='w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0'>
                                    <MapPin
                                        className='text-purple-600'
                                        size={22}
                                    />
                                </div>

                                <div>
                                    <h3 className='font-bold text-gray-900 mb-1'>
                                        Address
                                    </h3>

                                    <p className='text-gray-600'>
                                        Tangos
                                        <br />
                                        Baliuag City, Bulacan, Philippines
                                    </p>
                                </div>
                            </div>

                            <div className='bg-purple-50 rounded-xl p-5 border border-purple-100'>
                                <h3 className='font-bold text-gray-900 mb-2 flex items-center gap-2'>
                                    <Clock
                                        size={16}
                                        className='text-purple-600'
                                    />
                                    Business Hours
                                </h3>

                                <div className='space-y-1 text-sm text-gray-600'>
                                    <p>
                                        Monday – Friday:{' '}
                                        <strong>9:00 AM – 5:00 PM</strong>
                                    </p>

                                    <p>
                                        Saturday:{' '}
                                        <strong>9:00 AM – 3:00 PM</strong>
                                    </p>

                                    <p>
                                        Sunday: <strong>Closed</strong>
                                    </p>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate('/booking')}
                                className='cursor-pointer w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3 rounded-lg font-bold hover:shadow-lg hover:shadow-purple-500/50 transition-all focus:outline-none focus:ring-4 focus:ring-purple-200'
                            >
                                Book Appointment
                            </motion.button>
                        </motion.div>

                        <motion.form
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6 }}
                            onSubmit={handleSubmit}
                            className='bg-white rounded-2xl p-8 shadow-lg border border-gray-100'
                        >
                            <div className='mb-4'>
                                <label className='block text-gray-900 font-bold mb-2'>
                                    Name *
                                </label>

                                <input
                                    type='text'
                                    name='name'
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className={inputClass}
                                    placeholder='Your name'
                                />
                            </div>

                            <div className='mb-4'>
                                <label className='block text-gray-900 font-bold mb-2'>
                                    Email *
                                </label>

                                <input
                                    type='email'
                                    name='email'
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className={inputClass}
                                    placeholder='Your email'
                                />
                            </div>

                            <div className='mb-4'>
                                <label className='block text-gray-900 font-bold mb-2'>
                                    Phone
                                </label>

                                <input
                                    type='tel'
                                    name='phone'
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder='Your phone'
                                />
                            </div>

                            <div className='mb-6'>
                                <label className='block text-gray-900 font-bold mb-2'>
                                    Message *
                                </label>

                                <textarea
                                    name='message'
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                    rows='4'
                                    className={`${inputClass} resize-none`}
                                    placeholder='Your message'
                                />
                            </div>

                            <motion.button
                                whileHover={
                                    isLoading
                                        ? {}
                                        : { scale: 1.02 }
                                }
                                whileTap={
                                    isLoading
                                        ? {}
                                        : { scale: 0.98 }
                                }
                                type='submit'
                                disabled={isLoading}
                                className='cursor-pointer w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3 rounded-lg font-bold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-purple-200'
                            >
                                {isLoading ? 'Sending...' : 'Send Message'}
                            </motion.button>
                        </motion.form>
                    </div>
                </div>
            </section>

            <Footer />
        </>
    )
}