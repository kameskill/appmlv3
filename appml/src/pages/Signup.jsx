import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import {
    Mail,
    Lock,
    User,
    Phone,
    Eye,
    EyeOff,
    CheckCircle,
    Scissors,
    ShieldCheck
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/api'
import Footer from '../components/Footer'


const sanitizePhoneInput = (value) => {
    let digits = String(value || '').replace(/\D/g, '')

    // Accept pasted formats such as +639123456789 or 639123456789.
    if (digits.startsWith('63')) {
        digits = digits.slice(2)
    }

    // Accept local format such as 09123456789.
    if (digits.startsWith('0')) {
        digits = digits.slice(1)
    }

    // Store only the 10 digits after +63 in the input.
    return digits.slice(0, 10)
}

const OTP_COOLDOWN_SECONDS = 5 * 60
const OTP_COOLDOWN_STORAGE_PREFIX =
    'timmytails-signup-otp-cooldown'

const getOtpCooldownStorageKey = (phone) =>
    `${OTP_COOLDOWN_STORAGE_PREFIX}:${phone}`

const getRemainingOtpCooldown = (phone) => {
    if (
        !phone ||
        typeof window === 'undefined'
    ) {
        return 0
    }

    const storedValue =
        window.localStorage.getItem(
            getOtpCooldownStorageKey(phone)
        )

    const expiresAt =
        Number(storedValue)

    if (
        !Number.isFinite(expiresAt) ||
        expiresAt <= Date.now()
    ) {
        window.localStorage.removeItem(
            getOtpCooldownStorageKey(phone)
        )

        return 0
    }

    return Math.ceil(
        (expiresAt - Date.now()) / 1000
    )
}

const startOtpCooldown = (phone) => {
    if (
        !phone ||
        typeof window === 'undefined'
    ) {
        return
    }

    const expiresAt =
        Date.now() +
        OTP_COOLDOWN_SECONDS * 1000

    window.localStorage.setItem(
        getOtpCooldownStorageKey(phone),
        String(expiresAt)
    )
}

const clearOtpCooldown = (phone) => {
    if (
        !phone ||
        typeof window === 'undefined'
    ) {
        return
    }

    window.localStorage.removeItem(
        getOtpCooldownStorageKey(phone)
    )
}

const formatCooldown = (seconds) => {
    const minutes =
        Math.floor(seconds / 60)

    const remainingSeconds =
        seconds % 60

    return `${String(minutes).padStart(
        2,
        '0'
    )}:${String(remainingSeconds).padStart(
        2,
        '0'
    )}`
}

export default function Signup() {
    const navigate = useNavigate()
    const { user, register, sendRegisterOtp } = useAuth()

    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        otp: '',
        agreeTerms: false
    })

    const [errors, setErrors] = useState({})
    const [isLoading, setIsLoading] = useState(false)
    const [passwordStrength, setPasswordStrength] = useState(0)
    const [otpSent, setOtpSent] = useState(false)
    const [otpCooldown, setOtpCooldown] = useState(0)


    const normalizedPhone =
        /^9\d{9}$/.test(formData.phone)
            ? `+63${formData.phone}`
            : ''

    useEffect(() => {
        if (user?.role === 'admin') {
            navigate('/admin', { replace: true })
        } else if (user?.role === 'user') {
            navigate('/dashboard', { replace: true })
        }
    }, [user, navigate])

    useEffect(() => {
        setOtpCooldown(
            getRemainingOtpCooldown(
                normalizedPhone
            )
        )
    }, [normalizedPhone])

    useEffect(() => {
        if (otpCooldown <= 0) {
            return undefined
        }

        const timer =
            window.setInterval(() => {
                const remaining =
                    getRemainingOtpCooldown(
                        normalizedPhone
                    )

                setOtpCooldown(
                    remaining
                )
            }, 1000)

        return () => {
            window.clearInterval(timer)
        }
    }, [
        otpCooldown,
        normalizedPhone
    ])

    const handleInputChange = (e) => {
        const {
            name,
            value,
            type,
            checked
        } = e.target

        setFormData((prev) => ({
            ...prev,
            [name]:
                type === 'checkbox'
                    ? checked
                    : name === 'phone'
                        ? sanitizePhoneInput(value)
                        : value
        }))

        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: ''
            }))
        }

        if (name === 'password') {
            let strength = 0

            if (value.length >= 8) strength++
            if (value.length >= 12) strength++
            if (
                /[a-z]/.test(value) &&
                /[A-Z]/.test(value)
            ) {
                strength++
            }
            if (/[0-9]/.test(value)) strength++
            if (/[^a-zA-Z0-9]/.test(value)) strength++

            setPasswordStrength(strength)
        }
    }

    const validateBaseForm = () => {
        const newErrors = {}

        if (!formData.firstName.trim()) {
            newErrors.firstName =
                'First name is required'
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName =
                'Last name is required'
        }

        if (!formData.email) {
            newErrors.email =
                'Email is required'
        } else if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                formData.email
            )
        ) {
            newErrors.email =
                'Please enter a valid email'
        }

        if (!formData.phone) {
            newErrors.phone =
                'Phone number is required'
        } else if (!/^9\d{9}$/.test(formData.phone)) {
            newErrors.phone =
                'Enter a valid number such as 9123456789'
        }

        if (!formData.password) {
            newErrors.password =
                'Password is required'
        } else if (
            formData.password.length < 8
        ) {
            newErrors.password =
                'Password must be at least 8 characters'
        }

        if (
            formData.password !==
            formData.confirmPassword
        ) {
            newErrors.confirmPassword =
                'Passwords do not match'
        }

        if (!formData.agreeTerms) {
            newErrors.agreeTerms =
                'You must agree to the terms and conditions'
        }

        return newErrors
    }

    const handleSendOtp = async () => {
        const remainingCooldown =
            getRemainingOtpCooldown(
                normalizedPhone
            )

        if (remainingCooldown > 0) {
            setOtpCooldown(
                remainingCooldown
            )

            toast.error(
                `Please wait ${formatCooldown(
                    remainingCooldown
                )} before requesting another OTP.`
            )

            return
        }

        const newErrors =
            validateBaseForm()

        if (
            Object.keys(newErrors).length > 0
        ) {
            setErrors(newErrors)
            return
        }

        setIsLoading(true)

        try {
            const {
                firstName,
                lastName,
                email,
                password
            } = formData

            await sendRegisterOtp({
                firstName,
                lastName,
                email,
                phone: normalizedPhone,
                password
            })

            startOtpCooldown(
                normalizedPhone
            )

            setOtpCooldown(
                OTP_COOLDOWN_SECONDS
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

    const handleVerifyOtp = async (e) => {
        e.preventDefault()

        if (
            !formData.otp ||
            formData.otp.length !== 6
        ) {
            setErrors((prev) => ({
                ...prev,
                otp: 'Please enter a valid 6-digit OTP'
            }))

            return
        }

        setIsLoading(true)

        try {
            const data = await register({
                email: formData.email,
                phone: normalizedPhone,
                otp: formData.otp
            })

            toast.success(
                `Welcome to Timmy Tails, ${data.user.firstName}!`
            )

            clearOtpCooldown(
                normalizedPhone
            )

            navigate('/dashboard')
        } catch (error) {
            toast.error(
                getErrorMessage(error)
            )
        } finally {
            setIsLoading(false)
        }
    }

    const strengthColor =
        passwordStrength <= 2
            ? 'bg-red-500'
            : passwordStrength === 3
                ? 'bg-yellow-500'
                : 'bg-green-500'

    const strengthText =
        passwordStrength <= 2
            ? 'Weak'
            : passwordStrength === 3
                ? 'Good'
                : 'Strong'

    const otpRequestDisabled =
        isLoading ||
        otpCooldown > 0

    const inputClass = (field) =>
        `w-full pl-12 pr-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all ${errors[field]
            ? 'border-red-500 bg-red-50 focus:ring-red-100'
            : 'border-gray-300 focus:border-purple-600 focus:ring-purple-100'
        }`

    return (
        <>
            <div className='min-h-screen bg-gradient-to-br from-white via-purple-50 to-white flex items-center justify-center px-4 pt-20 pb-20'>
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
                                whileHover={{
                                    scale: 1.1
                                }}
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
                                Create Account
                            </h1>

                            <p className='text-gray-600'>
                                Join Timmy Tails
                            </p>
                        </div>

                        {!otpSent ? (
                            <form
                                onSubmit={(e) =>
                                    e.preventDefault()
                                }
                                className='space-y-4'
                            >
                                <div className='grid grid-cols-2 gap-4'>
                                    {[
                                        'firstName',
                                        'lastName'
                                    ].map(
                                        (field, index) => (
                                            <div key={field}>
                                                <label className='block text-gray-700 font-bold mb-2'>
                                                    {index === 0
                                                        ? 'First Name'
                                                        : 'Last Name'}
                                                </label>

                                                <div className='relative'>
                                                    <User
                                                        className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400'
                                                        size={20}
                                                    />

                                                    <input
                                                        type='text'
                                                        name={field}
                                                        value={
                                                            formData[
                                                            field
                                                            ]
                                                        }
                                                        onChange={
                                                            handleInputChange
                                                        }
                                                        placeholder={
                                                            index === 0
                                                                ? 'Juan'
                                                                : 'Dela Cruz'
                                                        }
                                                        className={inputClass(
                                                            field
                                                        )}
                                                    />
                                                </div>

                                                {errors[
                                                    field
                                                ] && (
                                                        <p className='text-red-500 text-sm mt-1'>
                                                            {
                                                                errors[
                                                                field
                                                                ]
                                                            }
                                                        </p>
                                                    )}
                                            </div>
                                        )
                                    )}
                                </div>

                                <div>
                                    <label className='block text-gray-700 font-bold mb-2'>
                                        Email Address
                                    </label>

                                    <div className='relative'>
                                        <Mail
                                            className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400'
                                            size={20}
                                        />

                                        <input
                                            type='email'
                                            name='email'
                                            value={
                                                formData.email
                                            }
                                            onChange={
                                                handleInputChange
                                            }
                                            placeholder='your@email.com'
                                            className={inputClass(
                                                'email'
                                            )}
                                        />
                                    </div>

                                    {errors.email && (
                                        <p className='text-red-500 text-sm mt-1'>
                                            {errors.email}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className='block text-gray-700 font-bold mb-2'>
                                        Phone Number
                                    </label>

                                    <div className='relative'>
                                        <Phone
                                            className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400'
                                            size={20}
                                        />

                                        <span className='absolute left-12 top-1/2 -translate-y-1/2 text-gray-700 font-bold border-r border-gray-300 pr-3'>
                                            +63
                                        </span>

                                        <input
                                            type='tel'
                                            inputMode='numeric'
                                            autoComplete='tel'
                                            name='phone'
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            maxLength={10}
                                            placeholder='9123456789'
                                            className={`w-full pl-24 pr-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all ${errors.phone
                                                ? 'border-red-500 bg-red-50 focus:ring-red-100'
                                                : 'border-gray-300 focus:border-purple-600 focus:ring-purple-100'
                                                }`}
                                        />
                                    </div>

                                    <p className='text-xs text-gray-500 mt-2'>
                                        Enter 10 digits after +63. You may also paste a number beginning with 09 or +63.
                                    </p>

                                    {normalizedPhone && (
                                        <p className='text-xs font-semibold text-purple-600 mt-1'>
                                            Number: {normalizedPhone}
                                        </p>
                                    )}

                                    {errors.phone && (
                                        <p className='text-red-500 text-sm mt-1'>
                                            {errors.phone}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className='block text-gray-700 font-bold mb-2'>
                                        Password
                                    </label>

                                    <div className='relative'>
                                        <Lock
                                            className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400'
                                            size={20}
                                        />

                                        <input
                                            type={
                                                showPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            name='password'
                                            value={
                                                formData.password
                                            }
                                            onChange={
                                                handleInputChange
                                            }
                                            minLength={8}
                                            autoComplete='new-password'
                                            placeholder='Minimum 8 characters'
                                            className={`${inputClass(
                                                'password'
                                            )} pr-12`}
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
                                                <EyeOff
                                                    size={
                                                        20
                                                    }
                                                />
                                            ) : (
                                                <Eye
                                                    size={
                                                        20
                                                    }
                                                />
                                            )}
                                        </button>
                                    </div>

                                    {formData.password && (
                                        <div className='mt-2'>
                                            <div className='flex items-center gap-2 mb-2'>
                                                <div className='flex-1 h-2 bg-gray-200 rounded-full overflow-hidden'>
                                                    <motion.div
                                                        initial={{
                                                            width: 0
                                                        }}
                                                        animate={{
                                                            width: `${(
                                                                passwordStrength /
                                                                5
                                                            ) * 100}%`
                                                        }}
                                                        className={`h-full ${strengthColor}`}
                                                    />
                                                </div>

                                                <span className='text-xs font-bold text-gray-600'>
                                                    {
                                                        strengthText
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div className='mt-2 text-xs text-gray-500 space-y-1'>
                                        <p className='font-semibold text-gray-600'>
                                            For a strong password, use:
                                        </p>
                                        <p className={formData.password.length >= 8 ? 'text-green-600' : ''}>
                                            • At least 8 characters
                                        </p>
                                        <p className={/[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password) ? 'text-green-600' : ''}>
                                            • Uppercase and lowercase letters
                                        </p>
                                        <p className={/[0-9]/.test(formData.password) ? 'text-green-600' : ''}>
                                            • At least one number
                                        </p>
                                        <p className={/[^a-zA-Z0-9]/.test(formData.password) ? 'text-green-600' : ''}>
                                            • At least one special character
                                        </p>
                                    </div>

                                    {errors.password && (
                                        <p className='text-red-500 text-sm mt-1'>
                                            {
                                                errors.password
                                            }
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className='block text-gray-700 font-bold mb-2'>
                                        Confirm Password
                                    </label>

                                    <div className='relative'>
                                        <Lock
                                            className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400'
                                            size={20}
                                        />

                                        <input
                                            type={
                                                showConfirmPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            name='confirmPassword'
                                            value={
                                                formData.confirmPassword
                                            }
                                            onChange={
                                                handleInputChange
                                            }
                                            minLength={8}
                                            autoComplete='new-password'
                                            placeholder='Re-enter your password'
                                            className={`${inputClass(
                                                'confirmPassword'
                                            )} pr-12`}
                                        />

                                        <button
                                            type='button'
                                            onClick={() =>
                                                setShowConfirmPassword(
                                                    !showConfirmPassword
                                                )
                                            }
                                            aria-label={
                                                showConfirmPassword
                                                    ? 'Hide password'
                                                    : 'Show password'
                                            }
                                            className='cursor-pointer absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-purple-600'
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff
                                                    size={
                                                        20
                                                    }
                                                />
                                            ) : (
                                                <Eye
                                                    size={
                                                        20
                                                    }
                                                />
                                            )}
                                        </button>
                                    </div>

                                    {errors.confirmPassword && (
                                        <p className='text-red-500 text-sm mt-1'>
                                            {
                                                errors.confirmPassword
                                            }
                                        </p>
                                    )}

                                    {formData.password &&
                                        formData.confirmPassword ===
                                        formData.password && (
                                            <p className='text-green-500 text-sm mt-1 flex items-center gap-1'>
                                                <CheckCircle
                                                    size={
                                                        16
                                                    }
                                                />
                                                Passwords
                                                match
                                            </p>
                                        )}
                                </div>

                                <div className='flex items-start gap-3 pt-2'>
                                    <input
                                        type='checkbox'
                                        name='agreeTerms'
                                        checked={
                                            formData.agreeTerms
                                        }
                                        onChange={
                                            handleInputChange
                                        }
                                        className='cursor-pointer w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-400 mt-1'
                                    />

                                    <label className='text-gray-600 text-sm'>
                                        I agree to the{' '}
                                        <Link
                                            to='/terms-of-service'
                                            className='cursor-pointer text-purple-600 hover:text-purple-700 font-semibold focus:outline-none focus:underline'
                                        >
                                            Terms and Conditions
                                        </Link>{' '}
                                        and{' '}
                                        <Link
                                            to='/privacy-policy'
                                            className='cursor-pointer text-purple-600 hover:text-purple-700 font-semibold focus:outline-none focus:underline'
                                        >
                                            Privacy Policy
                                        </Link>
                                    </label>
                                </div>

                                {errors.agreeTerms && (
                                    <p className='text-red-500 text-sm'>
                                        {
                                            errors.agreeTerms
                                        }
                                    </p>
                                )}

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
                                        otpRequestDisabled
                                    }
                                    className='cursor-pointer w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3 rounded-lg font-bold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6 focus:outline-none focus:ring-4 focus:ring-purple-200'
                                >
                                    {isLoading
                                        ? 'Sending OTP...'
                                        : otpCooldown > 0
                                            ? `Wait ${formatCooldown(
                                                otpCooldown
                                            )}`
                                            : 'Send OTP'}
                                </motion.button>
                            </form>
                        ) : (
                            <form
                                onSubmit={
                                    handleVerifyOtp
                                }
                                className='space-y-5'
                            >
                                <div className='bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-700'>
                                    <p className='font-semibold flex items-center gap-2'>
                                        <ShieldCheck
                                            size={18}
                                        />
                                        OTP sent to{' '}
                                        {
                                            normalizedPhone
                                        }
                                    </p>

                                    <p className='mt-1'>
                                        Enter the
                                        6-digit code to
                                        complete your
                                        account creation.
                                    </p>
                                </div>

                                <div>
                                    <label className='block text-gray-700 font-bold mb-2'>
                                        OTP Code
                                    </label>

                                    <input
                                        type='text'
                                        name='otp'
                                        value={
                                            formData.otp
                                        }
                                        onChange={
                                            handleInputChange
                                        }
                                        maxLength={6}
                                        placeholder='Enter 6-digit OTP'
                                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all ${errors.otp
                                            ? 'border-red-500 bg-red-50 focus:ring-red-100'
                                            : 'border-gray-300 focus:border-purple-600 focus:ring-purple-100'
                                            }`}
                                    />

                                    {errors.otp && (
                                        <p className='text-red-500 text-sm mt-1'>
                                            {errors.otp}
                                        </p>
                                    )}
                                </div>

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
                                            otpRequestDisabled
                                        }
                                        className='cursor-pointer flex-1 border-2 border-purple-300 text-purple-700 py-3 rounded-lg font-bold hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-purple-100'
                                    >
                                        {isLoading
                                            ? 'Sending...'
                                            : otpCooldown > 0
                                                ? `Resend in ${formatCooldown(
                                                    otpCooldown
                                                )}`
                                                : 'Resend OTP'}
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
                                        className='cursor-pointer flex-1 bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3 rounded-lg font-bold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-purple-200'
                                    >
                                        {isLoading
                                            ? 'Verifying...'
                                            : 'Verify & Create'}
                                    </motion.button>
                                </div>
                            </form>
                        )}

                        <p className='text-center text-gray-600 mt-6'>
                            Already have an
                            account?{' '}
                            <Link
                                to='/login'
                                className='cursor-pointer text-purple-600 hover:text-purple-700 font-bold focus:outline-none focus:underline'
                            >
                                Sign in here
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>

            <Footer />
        </>
    )
}