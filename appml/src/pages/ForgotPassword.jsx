import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
    ShieldCheck,
    Smartphone,
    Lock
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/api'

const sanitizePhoneInput = (value) => {
    let digits = String(value || '').replace(/\D/g, '')

    // Accept pasted numbers such as +639123456789.
    if (digits.startsWith('63')) {
        digits = digits.slice(2)
    }

    // Accept numbers such as 09123456789.
    if (digits.startsWith('0')) {
        digits = digits.slice(1)
    }

    return digits.slice(0, 10)
}

export default function ForgotPassword() {
    const navigate = useNavigate()

    const {
        user,
        sendPasswordOtp,
        resetPasswordWithOtp
    } = useAuth()

    const [formData, setFormData] = useState({
        phone: '',
        otp: '',
        newPassword: ''
    })

    const [otpSent, setOtpSent] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (user?.role === 'admin') {
            navigate('/admin', {
                replace: true
            })
        } else if (user?.role === 'user') {
            navigate('/dashboard', {
                replace: true
            })
        }
    }, [user, navigate])

    const normalizedPhone =
        formData.phone.length === 10
            ? `+63${formData.phone}`
            : ''

    const handleChange = (e) => {
        const { name, value } = e.target

        setFormData((prev) => ({
            ...prev,

            [name]:
                name === 'phone'
                    ? sanitizePhoneInput(value)
                    : value
        }))
    }

    const validatePhone = () => {
        if (!formData.phone) {
            toast.error('Mobile number is required')
            return false
        }

        if (!/^9\d{9}$/.test(formData.phone)) {
            toast.error(
                'Enter a valid number such as 9123456789'
            )

            return false
        }

        return true
    }

    const handleSendOtp = async () => {
        if (!validatePhone()) return

        setIsLoading(true)

        try {
            await sendPasswordOtp(
                normalizedPhone
            )

            setOtpSent(true)

            toast.success(
                'OTP sent to your mobile number'
            )
        } catch (error) {
            toast.error(
                getErrorMessage(error)
            )
        } finally {
            setIsLoading(false)
        }
    }

    const handleReset = async (e) => {
        e.preventDefault()

        if (!validatePhone()) return

        if (
            !/^\d{6}$/.test(formData.otp)
        ) {
            toast.error(
                'Enter a valid 6-digit OTP'
            )

            return
        }

        if (
            !formData.newPassword ||
            formData.newPassword.length < 6
        ) {
            toast.error(
                'Password must be at least 6 characters'
            )

            return
        }

        setIsLoading(true)

        try {
            await resetPasswordWithOtp({
                phone: normalizedPhone,
                otp: formData.otp,
                newPassword:
                    formData.newPassword
            })

            toast.success(
                'Password changed successfully. Please login.'
            )

            navigate('/login')
        } catch (error) {
            toast.error(
                getErrorMessage(error)
            )
        } finally {
            setIsLoading(false)
        }
    }

    const inputClass =
        'w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100 transition-all'

    return (
        <div className='min-h-screen bg-gradient-to-br from-white via-purple-50 to-white flex items-center justify-center px-4 pt-20'>
            <motion.div
                initial={{
                    opacity: 0,
                    y: 20
                }}
                animate={{
                    opacity: 1,
                    y: 0
                }}
                transition={{
                    duration: 0.6
                }}
                className='w-full max-w-md'
            >
                <div className='bg-white rounded-2xl shadow-2xl border border-gray-100 p-8'>
                    <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                        Reset Password
                    </h1>

                    <p className='text-gray-600 mb-6'>
                        Use mobile OTP to change your
                        password
                    </p>

                    <form
                        onSubmit={handleReset}
                        className='space-y-4'
                    >
                        <div>
                            <label
                                htmlFor='phone'
                                className='block text-gray-700 font-bold mb-2'
                            >
                                Mobile Number
                            </label>

                            <div className='relative'>
                                <Smartphone
                                    className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400'
                                    size={18}
                                />

                                <span className='absolute left-11 top-1/2 -translate-y-1/2 text-gray-700 font-bold border-r border-gray-300 pr-3'>
                                    +63
                                </span>

                                <input
                                    id='phone'
                                    name='phone'
                                    type='tel'
                                    inputMode='numeric'
                                    autoComplete='tel'
                                    value={
                                        formData.phone
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    readOnly={otpSent}
                                    maxLength={10}
                                    placeholder='9123456789'
                                    className='w-full pl-24 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100 transition-all read-only:bg-gray-100 read-only:text-gray-500'
                                />
                            </div>

                            <p className='text-xs text-gray-500 mt-2'>
                                Enter 10 digits after +63.
                                You may also paste a number
                                beginning with 09 or +63.
                            </p>

                            {normalizedPhone && (
                                <p className='text-xs font-semibold text-purple-600 mt-1'>
                                    Number: {normalizedPhone}
                                </p>
                            )}
                        </div>

                        {otpSent && (
                            <>
                                <div>
                                    <label
                                        htmlFor='otp'
                                        className='block text-gray-700 font-bold mb-2'
                                    >
                                        OTP
                                    </label>

                                    <div className='relative'>
                                        <ShieldCheck
                                            className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400'
                                            size={18}
                                        />

                                        <input
                                            id='otp'
                                            name='otp'
                                            type='text'
                                            inputMode='numeric'
                                            value={
                                                formData.otp
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            maxLength={6}
                                            placeholder='6-digit OTP'
                                            className={
                                                inputClass
                                            }
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label
                                        htmlFor='newPassword'
                                        className='block text-gray-700 font-bold mb-2'
                                    >
                                        New Password
                                    </label>

                                    <div className='relative'>
                                        <Lock
                                            className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400'
                                            size={18}
                                        />

                                        <input
                                            id='newPassword'
                                            type='password'
                                            name='newPassword'
                                            value={
                                                formData.newPassword
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder='Minimum 6 characters'
                                            className={
                                                inputClass
                                            }
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {!otpSent ? (
                            <motion.button
                                whileHover={
                                    isLoading
                                        ? {}
                                        : {
                                            scale: 1.02
                                        }
                                }
                                whileTap={
                                    isLoading
                                        ? {}
                                        : {
                                            scale: 0.98
                                        }
                                }
                                type='button'
                                onClick={
                                    handleSendOtp
                                }
                                disabled={
                                    isLoading
                                }
                                className='cursor-pointer w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/50 transition-all focus:outline-none focus:ring-4 focus:ring-purple-200'
                            >
                                {isLoading
                                    ? 'Sending OTP...'
                                    : 'Send OTP'}
                            </motion.button>
                        ) : (
                            <div className='flex gap-3'>
                                <motion.button
                                    whileHover={
                                        isLoading
                                            ? {}
                                            : {
                                                scale: 1.02
                                            }
                                    }
                                    whileTap={
                                        isLoading
                                            ? {}
                                            : {
                                                scale: 0.98
                                            }
                                    }
                                    type='button'
                                    onClick={
                                        handleSendOtp
                                    }
                                    disabled={
                                        isLoading
                                    }
                                    className='cursor-pointer flex-1 border-2 border-purple-300 text-purple-700 py-3 rounded-lg font-bold hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-purple-100'
                                >
                                    Resend OTP
                                </motion.button>

                                <motion.button
                                    whileHover={
                                        isLoading
                                            ? {}
                                            : {
                                                scale: 1.02
                                            }
                                    }
                                    whileTap={
                                        isLoading
                                            ? {}
                                            : {
                                                scale: 0.98
                                            }
                                    }
                                    type='submit'
                                    disabled={
                                        isLoading
                                    }
                                    className='cursor-pointer flex-1 bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/50 transition-all focus:outline-none focus:ring-4 focus:ring-purple-200'
                                >
                                    {isLoading
                                        ? 'Updating...'
                                        : 'Update Password'}
                                </motion.button>
                            </div>
                        )}
                    </form>

                    <p className='text-center text-gray-600 mt-6'>
                        Back to{' '}
                        <Link
                            to='/login'
                            className='cursor-pointer text-purple-600 font-bold focus:outline-none focus:underline'
                        >
                            Login
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    )
}