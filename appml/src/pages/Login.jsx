import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Scissors } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/api'

export default function Login() {
    const navigate = useNavigate()
    const location = useLocation()
    const { login, user } = useAuth()

    const [showPassword, setShowPassword] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    })
    const [errors, setErrors] = useState({})
    const [isLoading, setIsLoading] = useState(false)

    const intendedPath =
        location.state?.from === '/booking'
            ? '/booking'
            : '/dashboard'

    useEffect(() => {
        if (user?.role === 'admin') {
            navigate('/admin', { replace: true })
        } else if (user?.role === 'user') {
            navigate(intendedPath, { replace: true })
        }
    }, [user, navigate, intendedPath])

    const handleInputChange = (e) => {
        const { name, value } = e.target

        setFormData((prev) => ({
            ...prev,
            [name]: value
        }))

        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: ''
            }))
        }
    }

    const validateForm = () => {
        const newErrors = {}

        if (!formData.email) {
            newErrors.email = 'Email is required'
        } else if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                formData.email
            )
        ) {
            newErrors.email =
                'Please enter a valid email'
        }

        if (!formData.password) {
            newErrors.password =
                'Password is required'
        }

        return newErrors
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        const newErrors = validateForm()

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setIsLoading(true)

        try {
            const data = await login(
                formData.email,
                formData.password
            )

            toast.success(
                `Welcome back, ${data.user.firstName}!`
            )

            if (data.user.role === 'admin') {
                navigate('/admin')
            } else {
                navigate(intendedPath)
            }
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsLoading(false)
        }
    }

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
                <div className='bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 md:p-10'>
                    <div className='text-center mb-8'>
                        <motion.div
                            whileHover={{ scale: 1.1 }}
                            className='inline-block mb-4'
                        >
                            <div className='w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center'>
                                <Scissors
                                    size={28}
                                    className='text-white'
                                />
                            </div>
                        </motion.div>

                        <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                            Welcome Back
                        </h1>

                        <p className='text-gray-600'>
                            Sign in to your Timmy Tails
                            account
                        </p>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className='space-y-6'
                    >
                        <div>
                            <label
                                htmlFor='email'
                                className='block text-gray-700 font-bold mb-2'
                            >
                                Email Address
                            </label>

                            <div className='relative'>
                                <Mail
                                    className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400'
                                    size={20}
                                />

                                <input
                                    id='email'
                                    type='email'
                                    name='email'
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder='your@email.com'
                                    className={`w-full pl-12 pr-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all ${errors.email
                                            ? 'border-red-500 bg-red-50 focus:ring-red-100'
                                            : 'border-gray-300 focus:border-purple-600 focus:ring-purple-100'
                                        }`}
                                />
                            </div>

                            {errors.email && (
                                <p className='text-red-500 text-sm mt-1'>
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor='password'
                                className='block text-gray-700 font-bold mb-2'
                            >
                                Password
                            </label>

                            <div className='relative'>
                                <Lock
                                    className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400'
                                    size={20}
                                />

                                <input
                                    id='password'
                                    type={
                                        showPassword
                                            ? 'text'
                                            : 'password'
                                    }
                                    name='password'
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder='Enter your password'
                                    className={`w-full pl-12 pr-12 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all ${errors.password
                                            ? 'border-red-500 bg-red-50 focus:ring-red-100'
                                            : 'border-gray-300 focus:border-purple-600 focus:ring-purple-100'
                                        }`}
                                />

                                <button
                                    type='button'
                                    onClick={() =>
                                        setShowPassword(
                                            !showPassword
                                        )
                                    }
                                    aria-label={
                                        showPassword
                                            ? 'Hide password'
                                            : 'Show password'
                                    }
                                    className='cursor-pointer absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-purple-600'
                                >
                                    {showPassword ? (
                                        <EyeOff size={20} />
                                    ) : (
                                        <Eye size={20} />
                                    )}
                                </button>
                            </div>

                            {errors.password && (
                                <p className='text-red-500 text-sm mt-1'>
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        <div className='flex items-center justify-between'>
                            <label className='flex items-center gap-2 cursor-pointer'>
                                <input
                                    type='checkbox'
                                    className='cursor-pointer w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-400'
                                />

                                <span className='text-gray-600 text-sm'>
                                    Remember me
                                </span>
                            </label>

                            <Link
                                to='/forgot-password'
                                className='cursor-pointer text-purple-600 hover:text-purple-700 text-sm font-semibold focus:outline-none focus:underline'
                            >
                                Forgot password?
                            </Link>
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
                            {isLoading ? (
                                <span className='flex items-center justify-center gap-2'>
                                    <svg
                                        className='animate-spin h-5 w-5'
                                        viewBox='0 0 24 24'
                                        fill='none'
                                    >
                                        <circle
                                            className='opacity-25'
                                            cx='12'
                                            cy='12'
                                            r='10'
                                            stroke='currentColor'
                                            strokeWidth='4'
                                        />

                                        <path
                                            className='opacity-75'
                                            fill='currentColor'
                                            d='M4 12a8 8 0 018-8v8H4z'
                                        />
                                    </svg>

                                    Signing in...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </motion.button>
                    </form>

                    <p className='text-center text-gray-600 mt-8'>
                        Don&apos;t have an account?{' '}
                        <Link
                            to='/signup'
                            className='cursor-pointer text-purple-600 hover:text-purple-700 font-bold focus:outline-none focus:underline'
                        >
                            Sign up here
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    )
}