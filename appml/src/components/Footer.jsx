import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
    const currentYear = new Date().getFullYear()

    const socials = [
        {
            label: 'Facebook',
            href: '#',
            path: 'M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z'
        },
        {
            label: 'Instagram',
            href: '#',
            path: 'M12 2c2.72 0 3.06.01 4.12.06 1.06.05 1.79.22 2.43.47.66.26 1.21.6 1.76 1.15.5.5.9 1.1 1.15 1.76.25.64.42 1.37.47 2.43C21.99 8.94 22 9.28 22 12s-.01 3.06-.06 4.12c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.76 4.9 4.9 0 0 1-1.76 1.15c-.64.25-1.37.42-2.43.47C15.06 21.99 14.72 22 12 22s-3.06-.01-4.12-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.76-1.15 4.9 4.9 0 0 1-1.15-1.76c-.25-.64-.42-1.37-.47-2.43C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.06.22-1.79.47-2.43.26-.66.6-1.21 1.15-1.76A4.9 4.9 0 0 1 5.44 2.5c.64-.25 1.37-.42 2.43-.47C8.94 2.01 9.28 2 12 2zm0 1.8c-2.67 0-2.99.01-4.04.06-.87.04-1.34.18-1.65.3-.42.16-.71.35-1.02.66-.31.31-.5.6-.66 1.02-.12.31-.26.78-.3 1.65C4.28 8.99 4.27 9.31 4.27 12s.01 3.01.06 4.06c.04.87.18 1.34.3 1.65.16.42.35.71.66 1.02.31.31.6.5 1.02.66.31.12.78.26 1.65.3 1.05.05 1.37.06 4.04.06s2.99-.01 4.04-.06c.87-.04 1.34-.18 1.65-.3.42-.16.71-.35 1.02-.66.31-.31.5-.6.66-1.02.12-.31.26-.78.3-1.65.05-1.05.06-1.37.06-4.06s-.01-3.01-.06-4.06c-.04-.87-.18-1.34-.3-1.65a2.7 2.7 0 0 0-.66-1.02 2.7 2.7 0 0 0-1.02-.66c-.31-.12-.78-.26-1.65-.3C14.99 3.81 14.67 3.8 12 3.8zm0 3.2a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4zm5.2-2a1.16 1.16 0 1 1 0 2.32 1.16 1.16 0 0 1 0-2.32z'
        },
        {
            label: 'Twitter',
            href: '#',
            path: 'M22 5.9c-.74.33-1.53.55-2.36.65a4.1 4.1 0 0 0 1.8-2.27c-.8.47-1.68.82-2.62 1a4.1 4.1 0 0 0-7 3.74A11.65 11.65 0 0 1 3.4 4.6a4.1 4.1 0 0 0 1.27 5.48c-.67-.02-1.3-.2-1.85-.51v.05a4.1 4.1 0 0 0 3.29 4.02c-.6.17-1.25.19-1.83.07a4.1 4.1 0 0 0 3.83 2.85A8.24 8.24 0 0 1 2 18.4a11.62 11.62 0 0 0 6.29 1.84c7.55 0 11.68-6.26 11.68-11.68l-.01-.53c.8-.58 1.5-1.3 2.04-2.13z'
        }
    ]

    return (
        <footer className='bg-gray-900 text-gray-300 pt-16 pb-8'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-12 mb-12'>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className='flex flex-col items-start'
                    >
                        <div className='flex items-center gap-3 mb-4'>
                            <div className='w-12 h-12 rounded-full border-2 border-amber-400 overflow-hidden shadow-md flex items-center justify-center bg-[#4a1c52]'>
                                <img
                                    src='/logo.png'
                                    alt='Timmy Tails logo'
                                    className='w-full h-full object-cover'
                                />
                            </div>

                            <span className='text-2xl font-bold text-white'>
                                Timmy Tails
                            </span>
                        </div>

                        <p className='text-gray-400 text-sm leading-relaxed max-w-xs'>
                            Professional pet grooming services with AI-powered
                            haircut recommendations. We care for your furry
                            friends like family.
                        </p>

                        <div className='flex gap-3 mt-6'>
                            {socials.map(({ label, href, path }) => (
                                <motion.a
                                    key={label}
                                    whileHover={{ scale: 1.1, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    href={href}
                                    aria-label={label}
                                    title={label}
                                    className='cursor-pointer p-2.5 rounded-lg bg-gray-800 hover:bg-purple-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900'
                                >
                                    <svg
                                        viewBox='0 0 24 24'
                                        width={18}
                                        height={18}
                                        fill='currentColor'
                                        className='text-gray-300'
                                    >
                                        <path d={path} />
                                    </svg>
                                </motion.a>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        viewport={{ once: true }}
                    >
                        <h3 className='text-lg font-bold text-white mb-6'>
                            Quick Links
                        </h3>

                        <ul className='space-y-3'>
                            {[
                                { label: 'Home', href: '/' },
                                { label: 'Services', href: '/services' },
                                { label: 'Booking', href: '/booking' },
                                { label: 'About', href: '/about' },
                                { label: 'Contact', href: '/contact' }
                            ].map((link) => (
                                <li key={link.label}>
                                    <Link
                                        to={link.href}
                                        className='cursor-pointer text-gray-400 hover:text-purple-400 transition-colors font-medium text-sm focus:outline-none focus:text-purple-400'
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        viewport={{ once: true }}
                    >
                        <h3 className='text-lg font-bold text-white mb-6'>
                            Get in Touch
                        </h3>

                        <div className='space-y-4'>
                            <div className='flex items-start gap-3'>
                                <Phone
                                    size={20}
                                    className='text-purple-400 mt-1 flex-shrink-0'
                                />

                                <div>
                                    <p className='text-sm text-gray-400'>
                                        Phone
                                    </p>

                                    <a
                                        href='tel:+639756692647'
                                        className='cursor-pointer text-white hover:text-purple-400 transition-colors font-medium'
                                    >
                                        (+63) 975-669-2647
                                    </a>
                                </div>
                            </div>

                            <div className='flex items-start gap-3'>
                                <Mail
                                    size={20}
                                    className='text-purple-400 mt-1 flex-shrink-0'
                                />

                                <div>
                                    <p className='text-sm text-gray-400'>
                                        Email
                                    </p>

                                    <a
                                        href='#NA'
                                        className='cursor-pointer text-white hover:text-purple-400 transition-colors font-medium'
                                    >
                                        NA
                                    </a>
                                </div>
                            </div>

                            <div className='flex items-start gap-3'>
                                <MapPin
                                    size={20}
                                    className='text-purple-400 mt-1 flex-shrink-0'
                                />

                                <div>
                                    <p className='text-sm text-gray-400'>
                                        Address
                                    </p>

                                    <p className='text-white font-medium'>
                                        Tangos <br />
                                        Baliuag City, Bulacan, Philippines
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <div className='border-t border-gray-800 my-8'></div>

                <div className='flex flex-col md:flex-row justify-between items-center gap-4'>
                    <p className='text-gray-500 text-sm'>
                        © {currentYear} Timmy Tails. All rights reserved.
                    </p>

                    <div className='flex gap-6 text-sm'>
                        <Link
                            to='/privacy-policy'
                            className='cursor-pointer text-gray-400 hover:text-purple-400 transition-colors'
                        >
                            Privacy Policy
                        </Link>

                        <Link
                            to='/terms-of-service'
                            className='cursor-pointer text-gray-400 hover:text-purple-400 transition-colors'
                        >
                            Terms of Service
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}