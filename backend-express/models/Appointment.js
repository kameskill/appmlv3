const mongoose = require('mongoose')

const appointmentSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false
        },
        petName: {
            type: String,
            required: [true, 'Pet name is required'],
            trim: true,
            maxlength: [50, 'Pet name cannot exceed 50 characters']
        },
        breed: {
            type: String,
            required: [true, 'Breed is required'],
            trim: true
        },
        haircutStyle: {
            type: String,
            default: null,
            trim: true
        },
        service: {
            type: String,
            required: [true, 'Service is required'],
            enum: [
                'Full Grooming Package',
                'Bath & Brush',
                'Haircut Special',
                'Quick Trim',
                'Teeth Cleaning',
                'De-shedding Treatment'
            ]
        },
        date: {
            type: String,
            required: [true, 'Appointment date is required']
        },
        time: {
            type: String,
            required: [true, 'Appointment time is required']
        },
        ownerName: {
            type: String,
            required: [true, 'Owner name is required'],
            trim: true
        },
        ownerEmail: {
            type: String,
            required: [true, 'Owner email is required'],
            lowercase: true,
            trim: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
        },
        ownerPhone: {
            type: String,
            required: [true, 'Owner phone is required'],
            trim: true
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'completed', 'cancelled'],
            default: 'pending'
        },
        notes: {
            type: String,
            maxlength: [500, 'Notes cannot exceed 500 characters'],
            default: ''
        },
        price: {
            type: Number,
            default: 0,
            min: [0, 'Price cannot be negative']
        },
        revenueRecordedAt: {
            type: Date,
            default: null,
            index: true
        }
    },
    { timestamps: true }
)

appointmentSchema.index({ date: 1, time: 1 })
appointmentSchema.index({ ownerEmail: 1 })
appointmentSchema.index({ status: 1 })
appointmentSchema.index({ revenueRecordedAt: 1 })

module.exports = mongoose.model('Appointment', appointmentSchema)
