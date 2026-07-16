const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const { body, validationResult } = require('express-validator')
const Appointment = require('../models/Appointment')
const Notification = require('../models/Notification')
const { protect } = require('../middleware/auth')


const ML_SERVICE_URL = String(
    process.env.ML_SERVICE_URL || 'http://localhost:5001'
).replace(/\/$/, '')

const requestMlRecommendations = async (payload) => {
    const controller = new AbortController()
    const timeout = setTimeout(
        () => controller.abort(),
        10000
    )

    try {
        const response = await fetch(
            `${ML_SERVICE_URL}/recommend`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            }
        )

        const data = await response.json()

        if (!response.ok || !data?.success) {
            throw new Error(
                data?.message ||
                'Recommendation service failed'
            )
        }

        return data
    } finally {
        clearTimeout(timeout)
    }
}

const SERVICE_PRICES = {
    'Full Grooming Package': 1200,
    'Bath & Brush': 600,
    'Haircut Special': 900,
    'Quick Trim': 400,
    'Teeth Cleaning': 500,
    'De-shedding Treatment': 700
}

const HAIRCUT_PRICES = {
    'Puppy Cut': 800,
    'Teddy Bear Cut': 800,
    'Feathered Trim': 1100,
    'Lamb Cut': 800,
    'Lion Cut': 1200,
    'Summer Cut': 750,
    'Sanitary Trim': 800,
    'Show Cut': 1500,
    'Bath & Brush Only': 600,
    'De-shedding Treatment': 700
}

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key)

// @route   POST /api/appointments
// @desc    Create a new appointment
// @access  Private
router.post(
    '/',
    protect,
    [
        body('petName').notEmpty().trim().withMessage('Pet name is required'),
        body('breed').notEmpty().trim().withMessage('Breed is required'),
        body('service')
            .notEmpty()
            .withMessage('Service is required')
            .bail()
            .custom((value) => hasOwn(SERVICE_PRICES, value))
            .withMessage('Invalid service selected'),
        body('haircutStyle')
            .optional({ nullable: true })
            .custom((value) => !value || hasOwn(HAIRCUT_PRICES, value))
            .withMessage('Invalid haircut style selected'),
        body('date')
            .notEmpty()
            .withMessage('Date is required')
            .bail()
            .matches(/^\d{4}-\d{2}-\d{2}$/)
            .withMessage('Invalid date format'),
        body('time').notEmpty().withMessage('Time is required'),
        body('ownerName').notEmpty().trim().withMessage('Owner name is required'),
        body('ownerEmail').isEmail().normalizeEmail().withMessage('Valid owner email is required'),
        body('ownerPhone').notEmpty().trim().withMessage('Owner phone is required'),
        body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() })
        }

        const {
            petName,
            breed,
            haircutStyle,
            service,
            date,
            time,
            ownerName,
            ownerEmail,
            ownerPhone,
            notes
        } = req.body

        try {
            const existing = await Appointment.findOne({
                date: String(date),
                time: String(time),
                status: { $in: ['pending', 'confirmed'] }
            })

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'This time slot is already booked. Please choose another time.'
                })
            }

            const basePrice = SERVICE_PRICES[service] || 0
            const stylingPrice = haircutStyle ? HAIRCUT_PRICES[haircutStyle] || 0 : 0
            const totalPrice = basePrice + stylingPrice

            const appointment = await Appointment.create({
                user: req.user._id,
                petName,
                breed,
                haircutStyle: haircutStyle || null,
                service,
                date: String(date),
                time: String(time),
                ownerName,
                ownerEmail,
                ownerPhone,
                notes: notes || '',
                price: totalPrice
            })

            res.status(201).json({
                success: true,
                message: 'Appointment booked successfully! We will confirm your booking shortly.',
                appointment
            })
        } catch (error) {
            console.error('Create appointment error:', error)
            res.status(500).json({ success: false, message: 'Server error' })
        }
    }
)


// @route   GET /api/appointments/recommendations
// @desc    Get ML grooming recommendations enhanced by real booking popularity
// @access  Private
router.get(
    '/recommendations',
    protect,
    async (req, res) => {
        const breed = String(
            req.query.breed || 'Other'
        ).trim()

        const requestedSeason = String(
            req.query.season || ''
        ).trim().toLowerCase()

        const season = [
            'rainy',
            'dry'
        ].includes(requestedSeason)
            ? requestedSeason
            : undefined

        const topN = Math.max(
            1,
            Math.min(
                Number(req.query.top_n) || 3,
                10
            )
        )

        try {
            const popularityRows =
                await Appointment.aggregate([
                    {
                        $match: {
                            status: {
                                $in: [
                                    'confirmed',
                                    'completed'
                                ]
                            },
                            haircutStyle: {
                                $nin: [null, '']
                            }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                breed: '$breed',
                                haircut: '$haircutStyle'
                            },
                            count: {
                                $sum: 1
                            }
                        }
                    }
                ])

            const breedPopularity = {}
            const globalPopularity = {}

            popularityRows.forEach((row) => {
                const haircut =
                    String(row._id?.haircut || '')

                const rowBreed =
                    String(row._id?.breed || '')

                if (!haircut) return

                globalPopularity[haircut] =
                    (globalPopularity[haircut] || 0) +
                    Number(row.count || 0)

                if (
                    rowBreed.toLowerCase() ===
                    breed.toLowerCase()
                ) {
                    breedPopularity[haircut] =
                        Number(row.count || 0)
                }
            })

            const data =
                await requestMlRecommendations({
                    breed,
                    season,
                    top_n: topN,
                    country: 'philippines',
                    history: {
                        breed: breedPopularity,
                        global: globalPopularity
                    }
                })

            res.json(data)
        } catch (error) {
            console.error(
                'ML recommendations error:',
                error
            )

            res.status(503).json({
                success: false,
                message:
                    'AI recommendations are temporarily unavailable'
            })
        }
    }
)

// @route   GET /api/appointments/availability
// @desc    Get booked time slots for a given date
// @access  Public
router.get('/availability', async (req, res) => {
    const { date } = req.query

    if (!date) {
        return res.status(400).json({ success: false, message: 'Date query parameter is required' })
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, message: 'Invalid date format' })
    }

    try {
        const bookedSlots = await Appointment.find(
            { date: String(date), status: { $in: ['pending', 'confirmed'] } },
            { time: 1, _id: 0 }
        )

        res.json({
            success: true,
            bookedTimes: bookedSlots.map((appointment) => appointment.time)
        })
    } catch (error) {
        console.error('Get availability error:', error)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

// @route   GET /api/appointments/my
// @desc    Get current user's appointments
// @access  Private
router.get('/my', protect, async (req, res) => {
    try {
        const appointments = await Appointment.find({ user: req.user._id })
            .sort({ date: -1, time: -1 })

        res.json({ success: true, appointments })
    } catch (error) {
        console.error('Get user appointments error:', error)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

// @route   DELETE /api/appointments/:id
// @desc    Cancel an appointment (owner or admin)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid appointment ID' })
    }

    try {
        const appointment = await Appointment.findById(req.params.id)

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' })
        }

        const isOwner = appointment.user && appointment.user.toString() === req.user._id.toString()
        const isAdmin = req.user.role === 'admin'

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized' })
        }

        if (appointment.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Completed appointments can no longer be cancelled'
            })
        }

        if (appointment.status === 'cancelled') {
            return res.json({
                success: true,
                message: 'Appointment already cancelled',
                appointment
            })
        }

        appointment.status = 'cancelled'
        appointment.revenueRecordedAt = null
        await appointment.save()

        if (appointment.user) {
            await Notification.create({
                title: 'Booking Cancelled',
                message: `Your ${appointment.service} booking on ${appointment.date} at ${appointment.time} has been cancelled.`,
                audience: 'user',
                targetUser: appointment.user,
                type: 'appointment-status',
                appointment: appointment._id,
                createdBy: isAdmin ? req.user._id : null
            })
        }

        res.json({ success: true, message: 'Appointment cancelled', appointment })
    } catch (error) {
        console.error('Cancel appointment error:', error)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

module.exports = router
