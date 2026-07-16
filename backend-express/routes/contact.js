const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const Contact = require('../models/Contact')

// @route   POST /api/contact
// @desc    Submit a contact message
// @access  Public
router.post(
    '/',
    [
        body('name').notEmpty().trim().withMessage('Name is required'),
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('message').notEmpty().isLength({ max: 1000 }).withMessage('Message is required (max 1000 characters)')
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() })
        }

        const { name, email, phone, message } = req.body

        try {
            await Contact.create({ name, email, phone: phone || '', message })
            res.status(201).json({
                success: true,
                message: "Thank you for your message! We'll get back to you within 24 hours."
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({ success: false, message: 'Server error' })
        }
    }
)

module.exports = router
