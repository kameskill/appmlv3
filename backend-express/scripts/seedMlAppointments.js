const path = require('path')

require('dotenv').config({
    path: path.resolve(__dirname, '../.env')
})

const mongoose = require('mongoose')
const Appointment = require('../models/Appointment')

const SEED_TAG = '[ML-SEED]'
const DEFAULT_DAYS = 120
const DEFAULT_RANDOM_SEED = 20260716
const MANILA_TIME_ZONE = 'Asia/Manila'

const SERVICES = [
    {
        name: 'Full Grooming Package',
        price: 1200,
        weight: 26,
        rainyFactor: 1.05,
        haircutStyles: [
            'Teddy Bear Cut',
            'Puppy Cut',
            'Breed Standard Trim'
        ]
    },
    {
        name: 'Bath & Brush',
        price: 600,
        weight: 24,
        rainyFactor: 1.20,
        haircutStyles: [null]
    },
    {
        name: 'Haircut Special',
        price: 800,
        weight: 20,
        rainyFactor: 0.95,
        haircutStyles: [
            'Teddy Bear Cut',
            'Puppy Cut',
            'Summer Trim',
            'Asian Fusion Style'
        ]
    },
    {
        name: 'Quick Trim',
        price: 400,
        weight: 15,
        rainyFactor: 1.00,
        haircutStyles: [
            'Face, Feet & Sanitary Trim',
            null
        ]
    },
    {
        name: 'Teeth Cleaning',
        price: 500,
        weight: 8,
        rainyFactor: 1.00,
        haircutStyles: [null]
    },
    {
        name: 'De-shedding Treatment',
        price: 700,
        weight: 7,
        rainyFactor: 1.15,
        haircutStyles: [null]
    }
]

const BREEDS = [
    'Aspin',
    'Shih Tzu',
    'Pomeranian',
    'Poodle',
    'Golden Retriever',
    'Labrador Retriever',
    'Siberian Husky',
    'Chihuahua',
    'Maltese',
    'Yorkshire Terrier',
    'Beagle',
    'French Bulldog',
    'Pug',
    'German Shepherd',
    'Corgi',
    'Mixed Breed'
]

const PET_NAMES = [
    'Milo',
    'Luna',
    'Max',
    'Bella',
    'Coco',
    'Buddy',
    'Daisy',
    'Charlie',
    'Mochi',
    'Rocky',
    'Snow',
    'Bruno',
    'Chloe',
    'Oreo',
    'Toby',
    'Nala'
]

const FIRST_NAMES = [
    'Juan',
    'Maria',
    'Paolo',
    'Angela',
    'Miguel',
    'Sofia',
    'Carlo',
    'Bianca',
    'Daniel',
    'Alyssa',
    'Marco',
    'Jasmine'
]

const LAST_NAMES = [
    'Santos',
    'Reyes',
    'Cruz',
    'Garcia',
    'Mendoza',
    'Bautista',
    'Flores',
    'Ramos',
    'Aquino',
    'Castillo'
]

const TIME_SLOTS = [
    '09:00 AM',
    '09:45 AM',
    '10:30 AM',
    '11:15 AM',
    '01:00 PM',
    '01:45 PM',
    '02:30 PM',
    '03:15 PM',
    '04:00 PM'
]

const getNumberArgument = (name, fallback) => {
    const prefix = `--${name}=`
    const argument = process.argv.find((item) =>
        item.startsWith(prefix)
    )

    if (!argument) return fallback

    const value = Number(argument.slice(prefix.length))

    return Number.isFinite(value) && value > 0
        ? Math.floor(value)
        : fallback
}

const hasFlag = (name) =>
    process.argv.includes(`--${name}`)

const createRandom = (seed) => {
    let state = seed >>> 0

    return () => {
        state += 0x6D2B79F5

        let result = state
        result = Math.imul(
            result ^ (result >>> 15),
            result | 1
        )
        result ^= result + Math.imul(
            result ^ (result >>> 7),
            result | 61
        )

        return (
            (
                result ^
                (result >>> 14)
            ) >>> 0
        ) / 4294967296
    }
}

const pick = (items, random) =>
    items[
        Math.floor(
            random() * items.length
        )
    ]

const weightedPick = (
    items,
    getWeight,
    random
) => {
    const total = items.reduce(
        (sum, item) =>
            sum + Math.max(0, getWeight(item)),
        0
    )

    let target = random() * total

    for (const item of items) {
        target -= Math.max(
            0,
            getWeight(item)
        )

        if (target <= 0) {
            return item
        }
    }

    return items[items.length - 1]
}

const shuffle = (items, random) => {
    const result = [...items]

    for (
        let index = result.length - 1;
        index > 0;
        index--
    ) {
        const otherIndex = Math.floor(
            random() * (index + 1)
        )

        ;[
            result[index],
            result[otherIndex]
        ] = [
            result[otherIndex],
            result[index]
        ]
    }

    return result
}

const getManilaDateKey = (
    date = new Date()
) => {
    const parts =
        new Intl.DateTimeFormat(
            'en-CA',
            {
                timeZone:
                    MANILA_TIME_ZONE,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }
        ).formatToParts(date)

    const values = {}

    for (const part of parts) {
        if (part.type !== 'literal') {
            values[part.type] =
                part.value
        }
    }

    return `${values.year}-${values.month}-${values.day}`
}

const parseDateKey = (dateKey) => {
    const [
        year,
        month,
        day
    ] = dateKey
        .split('-')
        .map(Number)

    return new Date(
        Date.UTC(
            year,
            month - 1,
            day
        )
    )
}

const addDays = (date, amount) => {
    const result = new Date(
        date.getTime()
    )

    result.setUTCDate(
        result.getUTCDate() + amount
    )

    return result
}

const toDateKey = (date) =>
    date.toISOString().slice(0, 10)

const isRainySeason = (date) => {
    const month =
        date.getUTCMonth() + 1

    return month >= 6 && month <= 11
}

const getDailyBookingCount = (
    date,
    random
) => {
    const day = date.getUTCDay()

    const ranges = {
        0: [0, 1],
        1: [1, 3],
        2: [1, 4],
        3: [2, 4],
        4: [2, 4],
        5: [2, 5],
        6: [3, 6]
    }

    const [minimum, maximum] =
        ranges[day]

    let count =
        minimum +
        Math.floor(
            random() *
            (maximum - minimum + 1)
        )

    if (
        day === 0 &&
        random() < 0.55
    ) {
        count = 0
    }

    if (
        (day === 5 || day === 6) &&
        random() < 0.18
    ) {
        count += 1
    }

    return Math.min(
        count,
        TIME_SLOTS.length
    )
}

const getStatus = ({
    bookingIndex,
    daysAgo,
    random
}) => {
    /*
     * Force at least one revenue-producing
     * appointment on every active seeded day.
     */
    if (bookingIndex === 0) {
        return 'completed'
    }

    const value = random()

    if (daysAgo <= 7) {
        if (value < 0.62) {
            return 'completed'
        }

        if (value < 0.87) {
            return 'confirmed'
        }

        if (value < 0.94) {
            return 'pending'
        }

        return 'cancelled'
    }

    if (value < 0.80) {
        return 'completed'
    }

    if (value < 0.91) {
        return 'confirmed'
    }

    return 'cancelled'
}

const getCreatedAt = (
    appointmentDate,
    random
) => {
    const leadDays =
        1 +
        Math.floor(random() * 14)

    const createdAt =
        addDays(
            appointmentDate,
            -leadDays
        )

    createdAt.setUTCHours(
        2 +
        Math.floor(random() * 8),
        Math.floor(random() * 60),
        0,
        0
    )

    return createdAt
}

const buildSeedAppointments = ({
    days,
    randomSeed
}) => {
    const random =
        createRandom(randomSeed)

    const today =
        parseDateKey(
            getManilaDateKey()
        )

    const endDate =
        addDays(today, -1)

    const startDate =
        addDays(
            endDate,
            -(days - 1)
        )

    const appointments = []
    let sequence = 1

    for (
        let dayOffset = 0;
        dayOffset < days;
        dayOffset++
    ) {
        const appointmentDate =
            addDays(
                startDate,
                dayOffset
            )

        const date =
            toDateKey(
                appointmentDate
            )

        const count =
            getDailyBookingCount(
                appointmentDate,
                random
            )

        const availableTimes =
            shuffle(
                TIME_SLOTS,
                random
            ).slice(0, count)

        const rainy =
            isRainySeason(
                appointmentDate
            )

        for (
            let bookingIndex = 0;
            bookingIndex < count;
            bookingIndex++
        ) {
            const service =
                weightedPick(
                    SERVICES,
                    (item) =>
                        item.weight *
                        (
                            rainy
                                ? item.rainyFactor
                                : 1
                        ),
                    random
                )

            const breed =
                pick(BREEDS, random)

            const petName =
                pick(PET_NAMES, random)

            const firstName =
                pick(FIRST_NAMES, random)

            const lastName =
                pick(LAST_NAMES, random)

            const ownerName =
                `${firstName} ${lastName}`

            const daysAgo =
                Math.max(
                    1,
                    Math.round(
                        (
                            today -
                            appointmentDate
                        ) /
                        86400000
                    )
                )

            const status =
                getStatus({
                    bookingIndex,
                    daysAgo,
                    random
                })

            const haircutStyle =
                pick(
                    service.haircutStyles,
                    random
                )

            const createdAt =
                getCreatedAt(
                    appointmentDate,
                    random
                )

            const revenueRecordedAt =
                status === 'completed'
                    ? new Date(
                        `${date}T09:00:00.000Z`
                    )
                    : null

            const ownerPhone =
                `+63917${String(
                    1000000 +
                    sequence
                ).slice(-7)}`

            appointments.push({
                petName,
                breed,
                haircutStyle,
                service:
                    service.name,
                date,
                time:
                    availableTimes[
                        bookingIndex
                    ],
                ownerName,
                ownerEmail:
                    `mlseed+${String(
                        sequence
                    ).padStart(
                        5,
                        '0'
                    )}@timmytails.local`,
                ownerPhone,
                status,
                notes:
                    `${SEED_TAG} Synthetic historical appointment for ML demonstration and testing only.`,
                price:
                    service.price,
                revenueRecordedAt,
                createdAt,
                updatedAt:
                    revenueRecordedAt ||
                    createdAt
            })

            sequence++
        }
    }

    return {
        appointments,
        startDate:
            toDateKey(startDate),
        endDate:
            toDateKey(endDate)
    }
}

const printSummary = (
    appointments,
    startDate,
    endDate
) => {
    const statusCounts = {}
    const serviceCounts = {}
    const revenueDates =
        new Set()

    let committedRevenue = 0

    for (
        const appointment
        of appointments
    ) {
        statusCounts[
            appointment.status
        ] =
            (
                statusCounts[
                    appointment.status
                ] || 0
            ) + 1

        serviceCounts[
            appointment.service
        ] =
            (
                serviceCounts[
                    appointment.service
                ] || 0
            ) + 1

        if (
            [
                'confirmed',
                'completed'
            ].includes(
                appointment.status
            )
        ) {
            committedRevenue +=
                appointment.price

            revenueDates.add(
                appointment.date
            )
        }
    }

    console.log('')
    console.log(
        'Timmy Tails ML seed completed'
    )
    console.log(
        '────────────────────────────'
    )
    console.log(
        `Training period: ${startDate} to ${endDate}`
    )
    console.log(
        `Inserted records: ${appointments.length}`
    )
    console.log(
        `Revenue-producing days: ${revenueDates.size}`
    )
    console.log(
        `Synthetic committed revenue: ₱${committedRevenue.toLocaleString('en-PH')}`
    )
    console.log(
        'Statuses:',
        statusCounts
    )
    console.log(
        'Services:',
        serviceCounts
    )
    console.log('')
    console.log(
        'The dashboard minimum is 45 calendar days and 10 revenue-producing days.'
    )
    console.log(
        'Restart or refresh the backend/admin dashboard while the Python ML service is running.'
    )
    console.log('')
}

const main = async () => {
    const days =
        getNumberArgument(
            'days',
            DEFAULT_DAYS
        )

    const randomSeed =
        getNumberArgument(
            'seed',
            DEFAULT_RANDOM_SEED
        )

    const reset =
        hasFlag('reset')

    const cleanupOnly =
        hasFlag('cleanup')

    if (!process.env.MONGODB_URI) {
        throw new Error(
            'MONGODB_URI is missing from backend-express/.env'
        )
    }

    await mongoose.connect(
        process.env.MONGODB_URI
    )

    console.log(
        `MongoDB connected: ${mongoose.connection.host}`
    )

    const seedFilter = {
        notes: {
            $regex:
                '^\\[ML-SEED\\]'
        }
    }

    if (reset || cleanupOnly) {
        const result =
            await Appointment.deleteMany(
                seedFilter
            )

        console.log(
            `Removed ${result.deletedCount} previous ML seed records.`
        )
    }

    if (cleanupOnly) {
        console.log(
            'ML seed cleanup completed.'
        )

        return
    }

    const {
        appointments,
        startDate,
        endDate
    } =
        buildSeedAppointments({
            days,
            randomSeed
        })

    await Appointment.insertMany(
        appointments,
        {
            ordered: true
        }
    )

    printSummary(
        appointments,
        startDate,
        endDate
    )
}

main()
    .catch((error) => {
        console.error(
            'ML seed failed:',
            error
        )

        process.exitCode = 1
    })
    .finally(async () => {
        await mongoose.disconnect()
    })