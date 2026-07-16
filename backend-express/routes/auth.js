const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const OtpRequest = require('../models/OtpRequest')
const { sendOtp } = require('../services/textbee')
const { protect } = require('../middleware/auth')

const OTP_TTL_MS = 10 * 60 * 1000

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    })
}

const validateRequest = (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() })
        return false
    }
    return true
}

const generateSixDigitOtp = () => `${Math.floor(100000 + Math.random() * 900000)}`
const normalizePhone = (value) => {
    let digits = String(value || '')
        .replace(/\D/g, '')

    if (digits.startsWith('63')) {
        digits = digits.slice(2)
    }

    if (digits.startsWith('0')) {
        digits = digits.slice(1)
    }

    if (!/^9\d{9}$/.test(digits)) {
        return ''
    }

    return `+63${digits}`
}

const getPhoneCandidates = (value) => {
    const normalizedPhone =
        normalizePhone(value)

    if (!normalizedPhone) {
        return []
    }

    const localNumber =
        normalizedPhone.slice(3)

    return [
        normalizedPhone,
        `0${localNumber}`,
        localNumber,
        `63${localNumber}`
    ]
}

// @route   POST /api/auth/register/send-otp
// @desc    Send OTP for account creation
// @access  Public
router.post(
    '/register/send-otp',
    [
        body('firstName').notEmpty().trim().withMessage('First name is required'),
        body('lastName').notEmpty().trim().withMessage('Last name is required'),
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('phone').notEmpty().trim().withMessage('Phone is required'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    ],
    async (req, res) => {
        if (!validateRequest(req, res)) return

        const { firstName, lastName, email, phone, password } = req.body

        try {
            const existingUser = await User.findOne({ email: String(email) })
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'Email already registered' })
            }

            const code = generateSixDigitOtp()
            const otpHash = await bcrypt.hash(code, 10)
            const expiresAt = new Date(Date.now() + OTP_TTL_MS)

            await OtpRequest.findOneAndUpdate(
                { purpose: 'signup', email: String(email), phone: String(phone) },
                {
                    purpose: 'signup',
                    email: String(email),
                    phone: String(phone),
                    otpHash,
                    expiresAt,
                    payload: {
                        firstName,
                        lastName,
                        email: String(email),
                        phone: String(phone),
                        password
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            )

            await sendOtp({ phone: String(phone), code, purpose: 'signup' })

            res.json({
                success: true,
                message: 'OTP sent to your mobile number'
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({ success: false, message: 'Failed to send OTP' })
        }
    }
)

// @route   POST /api/auth/register
// @desc    Verify signup OTP and create account
// @access  Public
router.post(
    '/register',
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('phone').notEmpty().trim().withMessage('Phone is required'),
        body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    ],
    async (req, res) => {
        if (!validateRequest(req, res)) return

        const { email, phone, otp } = req.body

        try {
            const otpRequest = await OtpRequest.findOne({
                purpose: 'signup',
                email: String(email),
                phone: String(phone)
            })

            if (!otpRequest || otpRequest.expiresAt.getTime() < Date.now()) {
                return res.status(400).json({ success: false, message: 'OTP expired or not found. Please request a new one.' })
            }

            const isMatch = await bcrypt.compare(String(otp), otpRequest.otpHash)
            if (!isMatch) {
                return res.status(400).json({ success: false, message: 'Invalid OTP' })
            }

            const payload = otpRequest.payload || {}
            const existingUser = await User.findOne({ email: String(email) })
            if (existingUser) {
                await OtpRequest.deleteOne({ _id: otpRequest._id })
                return res.status(400).json({ success: false, message: 'Email already registered' })
            }

            const user = await User.create({
                firstName: payload.firstName,
                lastName: payload.lastName,
                email: payload.email,
                phone: payload.phone,
                password: payload.password
            })

            await OtpRequest.deleteOne({ _id: otpRequest._id })

            res.status(201).json({
                success: true,
                message: 'Account created successfully',
                token: generateToken(user._id),
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    phone: user.phone,
                    role: user.role
                }
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({ success: false, message: 'Server error' })
        }
    }
)

// @route   POST /api/auth/password/send-otp
// @desc    Send OTP for password reset
// @access  Public
router.post(
    '/password/send-otp',
    [
        body('phone')
            .notEmpty()
            .trim()
            .withMessage(
                'Phone is required'
            )
    ],
    async (req, res) => {
        if (!validateRequest(req, res)) {
            return
        }

        const normalizedPhone =
            normalizePhone(req.body.phone)

        if (!normalizedPhone) {
            return res.status(400).json({
                success: false,
                message:
                    'Enter a valid Philippine mobile number'
            })
        }

        try {
            const user =
                await User.findOne({
                    phone: {
                        $in: getPhoneCandidates(
                            req.body.phone
                        )
                    }
                })

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message:
                        'No account found with this mobile number'
                })
            }

            const code =
                generateSixDigitOtp()

            const otpHash =
                await bcrypt.hash(
                    code,
                    10
                )

            const expiresAt =
                new Date(
                    Date.now() +
                    OTP_TTL_MS
                )

            await OtpRequest.findOneAndUpdate(
                {
                    purpose:
                        'reset_password',
                    phone:
                        normalizedPhone
                },
                {
                    purpose:
                        'reset_password',

                    phone:
                        normalizedPhone,

                    email:
                        user.email,

                    otpHash,
                    expiresAt,

                    payload: {
                        userId:
                            user._id.toString()
                    }
                },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true
                }
            )

            await sendOtp({
                phone:
                    normalizedPhone,
                code,
                purpose:
                    'reset_password'
            })

            res.json({
                success: true,
                message:
                    'OTP sent to your mobile number'
            })
        } catch (error) {
            console.error(error)

            res.status(500).json({
                success: false,
                message:
                    'Failed to send OTP'
            })
        }
    }
)

// @route   POST /api/auth/password/reset
// @desc    Reset password using OTP
// @access  Public
router.post(
    '/password/reset',
    [
        body('phone')
            .notEmpty()
            .trim()
            .withMessage(
                'Phone is required'
            ),

        body('otp')
            .isLength({
                min: 6,
                max: 6
            })
            .withMessage(
                'OTP must be 6 digits'
            ),

        body('newPassword')
            .isLength({
                min: 8
            })
            .withMessage(
                'Password must be at least 8 characters'
            )
    ],
    async (req, res) => {
        if (!validateRequest(req, res)) {
            return
        }

        const {
            otp,
            newPassword
        } = req.body

        const normalizedPhone =
            normalizePhone(req.body.phone)

        if (!normalizedPhone) {
            return res.status(400).json({
                success: false,
                message:
                    'Enter a valid Philippine mobile number'
            })
        }

        try {
            const otpRequest =
                await OtpRequest.findOne({
                    purpose:
                        'reset_password',

                    phone:
                        normalizedPhone
                })

            if (
                !otpRequest ||
                otpRequest.expiresAt.getTime() <
                Date.now()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'OTP expired or not found. Please request a new one.'
                })
            }

            const isMatch =
                await bcrypt.compare(
                    String(otp),
                    otpRequest.otpHash
                )

            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid OTP'
                })
            }

            const user =
                await User.findById(
                    otpRequest.payload
                        ?.userId
                ).select('+password')

            if (!user) {
                await OtpRequest.deleteOne({
                    _id: otpRequest._id
                })

                return res.status(404).json({
                    success: false,
                    message:
                        'Account not found'
                })
            }

            user.password =
                String(newPassword)

            // Standardize old stored numbers.
            user.phone =
                normalizedPhone

            await user.save()

            await OtpRequest.deleteOne({
                _id: otpRequest._id
            })

            res.json({
                success: true,
                message:
                    'Password updated successfully'
            })
        } catch (error) {
            console.error(error)

            res.status(500).json({
                success: false,
                message: 'Server error'
            })
        }
    }
)

// @route   POST /api/auth/login
// @desc    Login user and return token
// @access  Public
router.post(
    '/login',
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    async (req, res) => {
        if (!validateRequest(req, res)) return

        const { email, password } = req.body

        try {
            const user = await User.findOne({ email: String(email) }).select('+password')
            if (!user) {
                return res.status(401).json({ success: false, message: 'Invalid email or password' })
            }

            const isMatch = await user.matchPassword(password)
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Invalid email or password' })
            }

            res.json({
                success: true,
                message: 'Login successful',
                token: generateToken(user._id),
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    phone: user.phone,
                    role: user.role
                }
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({ success: false, message: 'Server error' })
        }
    }
)

// @route   GET /api/auth/me
// @desc    Get logged-in user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            email: req.user.email,
            phone: req.user.phone,
            role: req.user.role
        }
    })
})

// @route   PATCH /api/auth/me/phone
// @desc    Update logged-in user phone number
// @access  Private
router.patch(
    '/me/phone',
    [body('phone').notEmpty().trim().withMessage('Phone is required')],
    protect,
    async (req, res) => {
        if (!validateRequest(req, res)) return

        const phone = normalizePhone(req.body.phone)
        if (!phone || !/^\+63\d{10}$/.test(phone)) {
            return res.status(400).json({ success: false, message: 'Enter a valid Philippine mobile number' })
        }

        try {
            const existingUser = await User.findOne({ phone, _id: { $ne: req.user._id } })
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'Mobile number is already in use' })
            }

            const updatedUser = await User.findByIdAndUpdate(
                req.user._id,
                { phone },
                { new: true }
            )

            res.json({
                success: true,
                message: 'Mobile number updated successfully',
                user: {
                    id: updatedUser._id,
                    firstName: updatedUser.firstName,
                    lastName: updatedUser.lastName,
                    email: updatedUser.email,
                    phone: updatedUser.phone,
                    role: updatedUser.role
                }
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({ success: false, message: 'Server error' })
        }
    }
)

module.exports = router
