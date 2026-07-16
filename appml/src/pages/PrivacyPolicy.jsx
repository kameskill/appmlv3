import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'

const sections = [
    {
        title: '1. Information We Collect',
        content: (
            <>
                <p>We may collect information that you provide when you create an account, book an appointment, contact us, or use our services.</p>
                <ul className='list-disc pl-6 mt-3 space-y-2'>
                    <li>Name, email address, and mobile number</li>
                    <li>Account and login information</li>
                    <li>Pet details, including name, breed, age, size, temperament, and grooming needs</li>
                    <li>Appointment date, selected service, special instructions, and booking history</li>
                    <li>Messages, feedback, and customer-support requests</li>
                    <li>Basic technical information such as browser type, device type, and website activity</li>
                </ul>
            </>
        )
    },
    {
        title: '2. How We Use Your Information',
        content: (
            <>
                <p>We use your information only for legitimate business and service-related purposes, including:</p>
                <ul className='list-disc pl-6 mt-3 space-y-2'>
                    <li>Creating and managing your Timmy Tails account</li>
                    <li>Processing, confirming, updating, or cancelling appointments</li>
                    <li>Sending OTP codes, booking reminders, and service notifications</li>
                    <li>Providing grooming recommendations based on the information you submit</li>
                    <li>Responding to questions, complaints, and support requests</li>
                    <li>Improving website security, reliability, and user experience</li>
                    <li>Complying with applicable legal and regulatory requirements</li>
                </ul>
            </>
        )
    },
    {
        title: '3. SMS and Service Notifications',
        content: (
            <p>
                We may send OTP codes, appointment confirmations, reminders, status updates, and other necessary service messages to the mobile number connected to your account. These messages are used to provide and secure the services you request.
            </p>
        )
    },
    {
        title: '4. Sharing of Information',
        content: (
            <>
                <p>We do not sell your personal information. We may share limited information only when reasonably necessary with:</p>
                <ul className='list-disc pl-6 mt-3 space-y-2'>
                    <li>Authorized Timmy Tails staff who manage appointments and customer service</li>
                    <li>Service providers that support hosting, databases, communications, SMS delivery, and website security</li>
                    <li>Government authorities when disclosure is required by law or a valid legal process</li>
                    <li>Other parties when you have given your permission</li>
                </ul>
            </>
        )
    },
    {
        title: '5. Data Security and Retention',
        content: (
            <>
                <p>
                    We use reasonable administrative, technical, and organizational safeguards to protect personal information from unauthorized access, loss, misuse, alteration, or disclosure.
                </p>
                <p className='mt-3'>
                    We keep personal information only for as long as reasonably needed to provide our services, maintain records, resolve disputes, enforce agreements, and comply with legal obligations. No online system can guarantee absolute security.
                </p>
            </>
        )
    },
    {
        title: '6. Your Privacy Rights',
        content: (
            <>
                <p>Subject to applicable law, you may request to:</p>
                <ul className='list-disc pl-6 mt-3 space-y-2'>
                    <li>Know whether we process your personal information</li>
                    <li>Access the personal information we hold about you</li>
                    <li>Correct inaccurate or incomplete information</li>
                    <li>Object to or withdraw consent from certain processing activities</li>
                    <li>Request deletion or blocking when legally allowed</li>
                    <li>Request a copy of eligible personal information</li>
                    <li>File a complaint regarding the handling of your information</li>
                </ul>
                <p className='mt-3'>
                    Some information may need to be retained when required by law or when necessary for legitimate business records.
                </p>
            </>
        )
    },
    {
        title: '7. Contact Us',
        content: (
            <>
                <p>For privacy questions or requests, contact Timmy Tails through:</p>
                <div className='mt-3 space-y-1'>
                    <p><strong>Phone:</strong> (+63) 975-669-2647</p>
                    <p><strong>Address:</strong> Tangos, Baliuag City, Bulacan, Philippines</p>
                    <p>
                        <strong>Online:</strong>{' '}
                        <Link to='/contact' className='text-purple-600 font-semibold hover:text-purple-800'>
                            Contact page
                        </Link>
                    </p>
                </div>
            </>
        )
    }
]

export default function PrivacyPolicy() {
    return (
        <>
            <main className='min-h-screen bg-gradient-to-br from-white via-purple-50 to-white px-4 pt-28 pb-20'>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className='max-w-4xl mx-auto'
                >
                    <div className='text-center mb-12'>

                        <h1 className='text-4xl md:text-5xl font-bold text-gray-900 mb-3'>
                            Privacy Policy
                        </h1>

                        <p className='text-gray-600'>
                            Effective date: July 14, 2026
                        </p>
                    </div>

                    <div className='bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-10'>
                        <div className='text-gray-700 leading-relaxed mb-8'>
                            <p>
                                Timmy Tails respects your privacy. This Privacy Policy explains what personal information we collect, why we collect it, how we use and protect it, and the choices available to you when you use our website, create an account, or book grooming services.
                            </p>
                        </div>

                        <div className='space-y-8'>
                            {sections.map(({ title, content }) => (
                                <section
                                    key={title}
                                    className='border-b border-gray-100 pb-8 last:border-0 last:pb-0'
                                >
                                    <h2 className='text-xl font-bold text-gray-900 mb-3'>
                                        {title}
                                    </h2>

                                    <div className='text-gray-600 leading-relaxed'>
                                        {content}
                                    </div>
                                </section>
                            ))}
                        </div>

                        <div className='mt-10 rounded-2xl bg-purple-50 border border-purple-200 p-5 text-sm text-purple-800'>
                            We may update this Privacy Policy when our services, technology, or legal obligations change. The updated version will be posted on this page with a revised effective date.
                        </div>
                    </div>
                </motion.div>
            </main>

            <Footer />
        </>
    )
}