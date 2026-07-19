const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')

const Appointment = require('../models/Appointment')
const Contact = require('../models/Contact')
const User = require('../models/User')
const Notification = require('../models/Notification')

const { protect, adminOnly } = require('../middleware/auth')

const TERMINAL_STATUSES = ['completed', 'cancelled']
const REVENUE_STATUSES = ['confirmed', 'completed']
const MANILA_TIME_ZONE = 'Asia/Manila'

const ML_SERVICE_URL = String(
    process.env.ML_SERVICE_URL || 'http://localhost:5001'
).replace(/\/$/, '')

const postToMlService = async (
    path,
    payload,
    timeoutMs = 15000
) => {
    const controller = new AbortController()
    const timeout = setTimeout(
        () => controller.abort(),
        timeoutMs
    )

    try {
        const response = await fetch(
            `${ML_SERVICE_URL}${path}`,
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
                `ML service returned ${response.status}`
            )
        }

        return data
    } finally {
        clearTimeout(timeout)
    }
}

const getSalesTrainingAppointments = async () => {
    const appointments = await Appointment.find({}, {
        date: 1,
        status: 1,
        price: 1,
        service: 1,
        haircutStyle: 1,
        breed: 1,
        createdAt: 1,
        updatedAt: 1,
        revenueRecordedAt: 1
    })
        .sort({ date: 1 })
        .limit(5000)
        .lean()

    return appointments.map((appointment) => ({
        date: appointment.date,
        status: appointment.status,
        price: Number(appointment.price || 0),
        service: appointment.service,
        haircutStyle: appointment.haircutStyle,
        breed: appointment.breed,
        createdAt: appointment.createdAt,
        updatedAt: appointment.updatedAt,
        revenueRecordedAt: appointment.revenueRecordedAt
    }))
}

const buildMachineLearningSalesForecast = async () => {
    const appointments =
        await getSalesTrainingAppointments()

    const data = await postToMlService(
        '/forecast/sales',
        {
            appointments,
            timezone: MANILA_TIME_ZONE,
            today: getManilaDateKey()
        },
        20000
    )

    return {
        ...data.forecast,
        dataset: data.dataset
    }
}

const padNumber = (value) => String(value).padStart(2, '0')

// ─────────────────────────────────────────────────────────────
// Manila date helpers
// ─────────────────────────────────────────────────────────────

const getManilaDateParts = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: MANILA_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date)

    return parts.reduce((result, part) => {
        if (part.type !== 'literal') {
            result[part.type] = part.value
        }

        return result
    }, {})
}

const getManilaDateKey = (date = new Date()) => {
    const parts = getManilaDateParts(date)

    return `${parts.year}-${parts.month}-${parts.day}`
}

const getMonthKey = (monthOffset = 0) => {
    const { year, month } = getManilaDateParts()

    const date = new Date(
        Date.UTC(
            Number(year),
            Number(month) - 1 + monthOffset,
            1,
            12
        )
    )

    return [
        date.getUTCFullYear(),
        padNumber(date.getUTCMonth() + 1)
    ].join('-')
}

const getDaysInMonth = (monthKey) => {
    const [year, month] = monthKey
        .split('-')
        .map(Number)

    return new Date(
        Date.UTC(year, month, 0)
    ).getUTCDate()
}

const getEnglishMonthLabel = (monthKey) => {
    const [year, month] = monthKey
        .split('-')
        .map(Number)

    return new Date(
        Date.UTC(year, month - 1, 1, 12)
    ).toLocaleDateString('en-US', {
        month: 'short',
        timeZone: 'UTC'
    })
}

const getMonthDateRange = (monthKey) => {
    const lastDay = getDaysInMonth(monthKey)

    return {
        start: `${monthKey}-01`,
        end: `${monthKey}-${padNumber(lastDay)}`
    }
}

const getRecentDayBuckets = (numberOfDays = 7) => {
    const { year, month, day } = getManilaDateParts()

    const currentDate = new Date(
        Date.UTC(
            Number(year),
            Number(month) - 1,
            Number(day),
            12
        )
    )

    return Array.from(
        { length: numberOfDays },
        (_, index) => {
            const daysBack =
                numberOfDays - 1 - index

            const date = new Date(currentDate)

            date.setUTCDate(
                currentDate.getUTCDate() - daysBack
            )

            return {
                key: [
                    date.getUTCFullYear(),
                    padNumber(date.getUTCMonth() + 1),
                    padNumber(date.getUTCDate())
                ].join('-'),

                day: date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    timeZone: 'UTC'
                })
            }
        }
    )
}

const getRecentMonthBuckets = (numberOfMonths = 6) => {
    const { year, month } = getManilaDateParts()

    return Array.from(
        { length: numberOfMonths },
        (_, index) => {
            const monthsBack =
                numberOfMonths - 1 - index

            const date = new Date(
                Date.UTC(
                    Number(year),
                    Number(month) - 1 - monthsBack,
                    1,
                    12
                )
            )

            return {
                key: [
                    date.getUTCFullYear(),
                    padNumber(date.getUTCMonth() + 1)
                ].join('-'),

                year: date.getUTCFullYear(),
                monthIndex: date.getUTCMonth(),

                label: date.toLocaleDateString(
                    'en-US',
                    {
                        month: 'short',
                        timeZone: 'UTC'
                    }
                )
            }
        }
    )
}

// ─────────────────────────────────────────────────────────────
// Revenue aggregation
// ─────────────────────────────────────────────────────────────

const buildRevenueAggregation = (dateFormat) => [
    {
        $match: {
            status: {
                $in: REVENUE_STATUSES
            }
        }
    },
    {
        $addFields: {
            effectiveRevenueDate: {
                $ifNull: [
                    '$revenueRecordedAt',
                    {
                        $ifNull: [
                            '$updatedAt',
                            '$createdAt'
                        ]
                    }
                ]
            }
        }
    },
    {
        $group: {
            _id: {
                $dateToString: {
                    format: dateFormat,
                    date: '$effectiveRevenueDate',
                    timezone: MANILA_TIME_ZONE
                }
            },

            revenue: {
                $sum: {
                    $ifNull: ['$price', 0]
                }
            },

            bookings: {
                $sum: 1
            }
        }
    },
    {
        $sort: {
            _id: 1
        }
    }
]

// ─────────────────────────────────────────────────────────────
// Forecasting helpers
// ─────────────────────────────────────────────────────────────

const clamp = (value, minimum, maximum) =>
    Math.min(maximum, Math.max(minimum, value))

const mean = (values) => {
    if (!values.length) return 0

    return values.reduce(
        (total, value) => total + value,
        0
    ) / values.length
}

const median = (values) => {
    if (!values.length) return 0

    const sorted = [...values].sort(
        (first, second) => first - second
    )

    const middle = Math.floor(
        sorted.length / 2
    )

    if (sorted.length % 2 === 0) {
        return (
            sorted[middle - 1] +
            sorted[middle]
        ) / 2
    }

    return sorted[middle]
}

const standardDeviation = (values) => {
    if (values.length < 2) return 0

    const average = mean(values)

    const variance = values.reduce(
        (total, value) => {
            return (
                total +
                Math.pow(value - average, 2)
            )
        },
        0
    ) / values.length

    return Math.sqrt(variance)
}

const weightedAverage = (values) => {
    if (!values.length) return 0

    let weightedTotal = 0
    let totalWeight = 0

    values.forEach((value, index) => {
        // Newer months receive more weight.
        const weight = index + 1

        weightedTotal += value * weight
        totalWeight += weight
    })

    return totalWeight > 0
        ? weightedTotal / totalWeight
        : 0
}

const linearTrendForecast = (values) => {
    if (!values.length) return 0

    if (values.length === 1) {
        return values[0]
    }

    const count = values.length
    const xMean = (count - 1) / 2
    const yMean = mean(values)

    let numerator = 0
    let denominator = 0

    values.forEach((value, index) => {
        numerator +=
            (index - xMean) *
            (value - yMean)

        denominator += Math.pow(
            index - xMean,
            2
        )
    })

    const slope =
        denominator > 0
            ? numerator / denominator
            : 0

    const intercept =
        yMean - slope * xMean

    return Math.max(
        0,
        intercept + slope * count
    )
}

const forecastFromHistory = (values) => {
    if (!values.length) return 0

    if (values.length === 1) {
        return values[0]
    }

    const weightedResult =
        weightedAverage(values)

    const trendResult =
        linearTrendForecast(values)

    const recentValues =
        values.slice(-3)

    const recentMedian =
        median(recentValues)

    /*
     * Weighted average:
     * Prevents one unusual month from controlling the result.
     *
     * Linear trend:
     * Detects whether sales are growing or declining.
     *
     * Recent median:
     * Gives importance to current performance while resisting
     * unusual high or low values.
     */
    return Math.max(
        0,
        weightedResult * 0.50 +
        trendResult * 0.25 +
        recentMedian * 0.25
    )
}

const calculateBacktestAccuracy = (values) => {
    /*
     * At least four completed months are needed:
     * three months for training and one known month for testing.
     */
    if (values.length < 4) {
        return null
    }

    const errors = []

    for (
        let index = 3;
        index < values.length;
        index += 1
    ) {
        const trainingValues =
            values.slice(0, index)

        const predicted =
            forecastFromHistory(trainingValues)

        const actual =
            values[index]

        /*
         * Symmetric percentage error avoids division problems
         * when one of the values is zero.
         */
        const error =
            (
                2 *
                Math.abs(predicted - actual)
            ) /
            (
                Math.abs(actual) +
                Math.abs(predicted) +
                1
            )

        errors.push(error)
    }

    const averageError =
        mean(errors)

    return Math.round(
        clamp(
            (1 - averageError) * 100,
            20,
            95
        )
    )
}

const roundPeso = (
    value,
    nearest = 100
) => {
    if (!Number.isFinite(value)) {
        return 0
    }

    return Math.max(
        0,
        Math.round(value / nearest) *
        nearest
    )
}

// ─────────────────────────────────────────────────────────────
// Reliable next-month prediction
// ─────────────────────────────────────────────────────────────

const buildReliableSalesForecast = async (
    monthlyRevenueResults
) => {
    const currentMonthKey =
        getMonthKey(0)

    const nextMonthKey =
        getMonthKey(1)

    const nextMonthRange =
        getMonthDateRange(nextMonthKey)

    const historicalMonthKeys =
        Array.from(
            { length: 12 },
            (_, index) =>
                getMonthKey(index - 12)
        )

    const [
        nextMonthPipelineResults,
        bookingStatusResults
    ] = await Promise.all([
        /*
         * Confirmed bookings are committed revenue.
         * Pending bookings are multiplied by the historical
         * successful-booking rate.
         */
        Appointment.aggregate([
            {
                $match: {
                    date: {
                        $gte: nextMonthRange.start,
                        $lte: nextMonthRange.end
                    },

                    status: {
                        $in: [
                            'pending',
                            'confirmed',
                            'completed'
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: '$status',

                    revenue: {
                        $sum: {
                            $ifNull: ['$price', 0]
                        }
                    },

                    bookings: {
                        $sum: 1
                    }
                }
            }
        ]),

        /*
         * Used to calculate the historical percentage of
         * bookings that became successful rather than cancelled.
         */
        Appointment.aggregate([
            {
                $group: {
                    _id: '$status',

                    count: {
                        $sum: 1
                    }
                }
            }
        ])
    ])

    const monthlyRevenueMap =
        monthlyRevenueResults.reduce(
            (result, item) => {
                result[item._id] = {
                    revenue:
                        Number(item.revenue || 0),

                    bookings:
                        Number(item.bookings || 0)
                }

                return result
            },
            {}
        )

    const historicalMonths =
        historicalMonthKeys.map(
            (monthKey) => {
                const metrics =
                    monthlyRevenueMap[
                    monthKey
                    ] || {
                        revenue: 0,
                        bookings: 0
                    }

                return {
                    monthKey,
                    revenue:
                        metrics.revenue,
                    bookings:
                        metrics.bookings
                }
            }
        )

    /*
     * Remove zero months that occurred before the business
     * recorded its first sale. Zero months after the first
     * active month remain included because they are real data.
     */
    const firstActiveMonthIndex =
        historicalMonths.findIndex(
            (month) =>
                month.revenue > 0 ||
                month.bookings > 0
        )

    const activeHistoricalMonths =
        firstActiveMonthIndex >= 0
            ? historicalMonths.slice(
                firstActiveMonthIndex
            )
            : []

    const historicalRevenueValues =
        activeHistoricalMonths.map(
            (month) => month.revenue
        )

    const totalHistoricalBookings =
        activeHistoricalMonths.reduce(
            (total, month) =>
                total + month.bookings,
            0
        )

    // ── Historical forecast ─────────────────────────────────

    const historicalForecast =
        forecastFromHistory(
            historicalRevenueValues
        )

    // ── Current-month run rate ──────────────────────────────

    const currentMonthMetrics =
        monthlyRevenueMap[
        currentMonthKey
        ] || {
            revenue: 0,
            bookings: 0
        }

    const currentDateParts =
        getManilaDateParts()

    const currentDay =
        Number(currentDateParts.day)

    const currentMonthDays =
        getDaysInMonth(
            currentMonthKey
        )

    const currentMonthProgress =
        currentMonthDays > 0
            ? currentDay /
            currentMonthDays
            : 0

    let currentMonthRunRate =
        currentDay > 0
            ? (
                currentMonthMetrics.revenue /
                currentDay
            ) * currentMonthDays
            : 0

    /*
     * Prevent one unusually large booking early in the month
     * from producing an extreme forecast.
     */
    const positiveHistoricalValues =
        historicalRevenueValues.filter(
            (value) => value > 0
        )

    const historicalMedian =
        median(
            positiveHistoricalValues
        )

    if (
        historicalMedian > 0 &&
        currentMonthRunRate >
        historicalMedian * 3
    ) {
        currentMonthRunRate =
            historicalMedian * 3
    }

    /*
     * The current month's influence increases as more of the
     * month is completed, but it never completely replaces
     * historical performance.
     */
    const currentMonthWeight =
        currentMonthMetrics.revenue > 0
            ? clamp(
                currentMonthProgress,
                0.15,
                0.45
            )
            : 0

    let statisticalBaseline = 0

    if (
        historicalForecast > 0 &&
        currentMonthRunRate > 0
    ) {
        statisticalBaseline =
            historicalForecast *
            (1 - currentMonthWeight) +
            currentMonthRunRate *
            currentMonthWeight
    } else {
        statisticalBaseline =
            historicalForecast ||
            currentMonthRunRate
    }

    // ── Next-month booking pipeline ─────────────────────────

    const pipelineMap =
        nextMonthPipelineResults.reduce(
            (result, item) => {
                result[item._id] = {
                    revenue:
                        Number(item.revenue || 0),

                    bookings:
                        Number(item.bookings || 0)
                }

                return result
            },
            {}
        )

    const committedRevenue =
        (
            pipelineMap.confirmed
                ?.revenue || 0
        ) +
        (
            pipelineMap.completed
                ?.revenue || 0
        )

    const pendingRevenue =
        pipelineMap.pending
            ?.revenue || 0

    const statusMap =
        bookingStatusResults.reduce(
            (result, item) => {
                result[item._id] =
                    Number(item.count || 0)

                return result
            },
            {}
        )

    const successfulBookings =
        (statusMap.confirmed || 0) +
        (statusMap.completed || 0)

    const cancelledBookings =
        statusMap.cancelled || 0

    const decidedBookings =
        successfulBookings +
        cancelledBookings

    /*
     * Use the real confirmation rate when there is enough data.
     * Keep it within a reasonable range to avoid extreme results
     * from a very small number of bookings.
     */
    const confirmationRate =
        decidedBookings > 0
            ? clamp(
                successfulBookings /
                decidedBookings,
                0.25,
                0.90
            )
            : 0.60

    const expectedPendingRevenue =
        pendingRevenue *
        confirmationRate

    const expectedPipelineRevenue =
        committedRevenue +
        expectedPendingRevenue

    // ── Combine statistics and scheduled bookings ───────────

    let rawPrediction = 0

    if (
        statisticalBaseline > 0 &&
        expectedPipelineRevenue > 0
    ) {
        /*
         * When future bookings already exceed the statistical
         * baseline, trust the known pipeline more strongly.
         */
        if (
            expectedPipelineRevenue >=
            statisticalBaseline
        ) {
            rawPrediction =
                statisticalBaseline * 0.40 +
                expectedPipelineRevenue * 0.60
        } else {
            rawPrediction =
                statisticalBaseline * 0.85 +
                expectedPipelineRevenue * 0.15
        }
    } else {
        rawPrediction =
            statisticalBaseline ||
            expectedPipelineRevenue
    }

    /*
     * Revenue from confirmed next-month bookings is guaranteed
     * to be part of the minimum forecast unless later cancelled.
     */
    rawPrediction = Math.max(
        committedRevenue,
        rawPrediction
    )

    const predictedRevenue =
        roundPeso(rawPrediction)

    // ── Confidence calculation ──────────────────────────────

    const averageHistoricalRevenue =
        mean(
            historicalRevenueValues
        )

    const historicalDeviation =
        standardDeviation(
            historicalRevenueValues
        )

    const variationRate =
        averageHistoricalRevenue > 0
            ? historicalDeviation /
            averageHistoricalRevenue
            : 1

    const stabilityScore =
        1 -
        clamp(
            variationRate,
            0,
            1
        )

    const historyScore =
        clamp(
            activeHistoricalMonths.length /
            12,
            0,
            1
        )

    const volumeScore =
        clamp(
            totalHistoricalBookings / 50,
            0,
            1
        )

    const pipelineCoverage =
        predictedRevenue > 0
            ? clamp(
                committedRevenue /
                predictedRevenue,
                0,
                1
            )
            : 0

    const backtestAccuracy =
        calculateBacktestAccuracy(
            historicalRevenueValues
        )

    let confidence

    if (backtestAccuracy !== null) {
        confidence =
            backtestAccuracy * 0.55 +
            historyScore * 20 +
            volumeScore * 10 +
            stabilityScore * 5 +
            pipelineCoverage * 10
    } else {
        confidence =
            30 +
            historyScore * 20 +
            volumeScore * 15 +
            stabilityScore * 10 +
            pipelineCoverage * 10
    }

    /*
     * Do not claim high confidence while the system has fewer
     * than four completed months of sales.
     */
    const maximumConfidence =
        activeHistoricalMonths.length < 4
            ? 60
            : 90

    confidence = Math.round(
        clamp(
            confidence,
            25,
            maximumConfidence
        )
    )

    const confidenceLabel =
        confidence >= 75
            ? 'High data confidence'
            : confidence >= 55
                ? 'Moderate data confidence'
                : 'Low data confidence'

    // ── Forecast range ──────────────────────────────────────

    let uncertaintyRate

    if (backtestAccuracy !== null) {
        const backtestErrorRate =
            1 -
            backtestAccuracy / 100

        uncertaintyRate =
            clamp(
                backtestErrorRate * 0.75 +
                (1 - stabilityScore) * 0.25,
                0.12,
                0.45
            )
    } else {
        uncertaintyRate =
            clamp(
                0.50 -
                historyScore * 0.15 -
                pipelineCoverage * 0.10 +
                (1 - stabilityScore) * 0.10,
                0.25,
                0.55
            )
    }

    const rangeLow =
        predictedRevenue > 0
            ? roundPeso(
                Math.max(
                    committedRevenue,
                    predictedRevenue *
                    (1 - uncertaintyRate)
                )
            )
            : 0

    const rangeHigh =
        predictedRevenue > 0
            ? roundPeso(
                predictedRevenue *
                (1 + uncertaintyRate)
            )
            : 0

    const comparisonBaseline =
        statisticalBaseline ||
        averageHistoricalRevenue

    const growthDelta =
        roundPeso(
            predictedRevenue -
            comparisonBaseline
        )

    const percentageChange =
        comparisonBaseline > 0
            ? (
                predictedRevenue -
                comparisonBaseline
            ) / comparisonBaseline
            : 0

    const signal =
        percentageChange > 0.05
            ? 'uptrend'
            : percentageChange < -0.05
                ? 'cooldown'
                : 'stable'

    return {
        month:
            getEnglishMonthLabel(
                nextMonthKey
            ),

        monthKey:
            nextMonthKey,

        predictedRevenue,
        rangeLow,
        rangeHigh,

        confidence,
        confidenceLabel,

        signal,
        growthDelta,

        committedRevenue:
            roundPeso(
                committedRevenue
            ),

        expectedPendingRevenue:
            roundPeso(
                expectedPendingRevenue
            ),

        expectedPipelineRevenue:
            roundPeso(
                expectedPipelineRevenue
            ),

        confirmationRate:
            Math.round(
                confirmationRate * 100
            ),

        currentMonthRevenue:
            currentMonthMetrics.revenue,

        currentMonthRunRate:
            roundPeso(
                currentMonthRunRate
            ),

        historicalBaseline:
            roundPeso(
                historicalForecast
            ),

        statisticalBaseline:
            roundPeso(
                statisticalBaseline
            ),

        historyMonths:
            activeHistoricalMonths.length,

        historicalBookings:
            totalHistoricalBookings,

        backtestAccuracy,

        model:
            'Weighted trend, current run rate, and booking pipeline v3'
    }
}

// ─────────────────────────────────────────────────────────────
// Appointment notification helper
// ─────────────────────────────────────────────────────────────

const buildStatusNotification = (
    appointment,
    status
) => {
    const statusLabels = {
        pending: 'Pending Review',
        confirmed: 'Confirmed',
        completed: 'Completed',
        cancelled: 'Cancelled'
    }

    const title =
        `Service ${statusLabels[status] || status
        }`

    const messageMap = {
        pending:
            `Your booking for ${appointment.service} is now pending review.`,

        confirmed:
            `Great news! Your ${appointment.service} booking on ${appointment.date} at ${appointment.time} is confirmed.`,

        completed:
            `Your ${appointment.service} service on ${appointment.date} is marked as completed. Thank you for trusting Timmy Tails!`,

        cancelled:
            `Your ${appointment.service} booking on ${appointment.date} at ${appointment.time} has been cancelled.`
    }

    return {
        title,

        message:
            messageMap[status] ||
            `Your booking status has been updated to ${status}.`
    }
}

// All routes below require an authenticated admin.
router.use(protect, adminOnly)

// ─────────────────────────────────────────────────────────────
// GET /api/admin/users
// ─────────────────────────────────────────────────────────────

router.get('/users', async (req, res) => {
    try {
        const users = await User.find({
            role: 'user'
        })
            .select('_id firstName lastName email')
            .sort({
                firstName: 1,
                lastName: 1
            })

        res.json({
            success: true,
            users
        })
    } catch (error) {
        console.error(
            'Get notification recipients error:',
            error
        )

        res.status(500).json({
            success: false,
            message: 'Server error'
        })
    }
})


// ─────────────────────────────────────────────────────────────
// GET /api/admin/stats
// ─────────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
    try {
        const todayKey =
            getManilaDateKey()

        const currentMonthKey =
            todayKey.slice(0, 7)

        const [
            todayCount,
            totalCustomers,
            confirmedCount,
            pendingCount,
            dailyRevenueResults,
            monthlyRevenueResults,
            totalRevenueResults
        ] = await Promise.all([
            Appointment.countDocuments({
                date: todayKey,

                status: {
                    $in: [
                        'pending',
                        'confirmed'
                    ]
                }
            }),

            User.countDocuments({
                role: 'user'
            }),

            Appointment.countDocuments({
                status: 'confirmed'
            }),

            Appointment.countDocuments({
                status: 'pending'
            }),

            Appointment.aggregate(
                buildRevenueAggregation(
                    '%Y-%m-%d'
                )
            ),

            Appointment.aggregate(
                buildRevenueAggregation(
                    '%Y-%m'
                )
            ),

            Appointment.aggregate([
                {
                    $match: {
                        status: {
                            $in:
                                REVENUE_STATUSES
                        }
                    }
                },
                {
                    $group: {
                        _id: null,

                        total: {
                            $sum: {
                                $ifNull: [
                                    '$price',
                                    0
                                ]
                            }
                        }
                    }
                }
            ])
        ])

        const todayRevenue =
            dailyRevenueResults.find(
                (item) =>
                    item._id === todayKey
            )?.revenue || 0

        const monthlyRevenue =
            monthlyRevenueResults.find(
                (item) =>
                    item._id ===
                    currentMonthKey
            )?.revenue || 0

        const totalRevenue =
            totalRevenueResults[0]
                ?.total || 0

        res.json({
            success: true,

            stats: {
                todayAppointments:
                    todayCount,

                todayRevenue,

                todayRevenueFormatted:
                    `₱${todayRevenue.toLocaleString(
                        'en-PH'
                    )}`,

                monthlyRevenue:
                    `₱${monthlyRevenue.toLocaleString(
                        'en-PH'
                    )}`,

                monthlyRevenueValue:
                    monthlyRevenue,

                totalRevenue,
                totalCustomers,

                confirmedBookings:
                    confirmedCount,

                pendingAppointments:
                    pendingCount
            }
        })
    } catch (error) {
        console.error(
            'Admin stats error:',
            error
        )

        res.status(500).json({
            success: false,
            message: 'Server error'
        })
    }
})

// ─────────────────────────────────────────────────────────────
// GET /api/admin/appointments
// ─────────────────────────────────────────────────────────────

router.get(
    '/appointments',
    async (req, res) => {
        try {
            const {
                status,
                date,
                page = 1,
                limit = 20
            } = req.query

            const query = {}

            const validStatuses = [
                'pending',
                'confirmed',
                'completed',
                'cancelled'
            ]

            if (status) {
                if (
                    !validStatuses.includes(
                        status
                    )
                ) {
                    return res
                        .status(400)
                        .json({
                            success: false,
                            message:
                                'Invalid status filter'
                        })
                }

                query.status =
                    String(status)
            }

            if (date) {
                if (
                    !/^\d{4}-\d{2}-\d{2}$/.test(
                        date
                    )
                ) {
                    return res
                        .status(400)
                        .json({
                            success: false,
                            message:
                                'Invalid date format'
                        })
                }

                query.date =
                    String(date)
            }

            const pageNum =
                Math.max(
                    1,
                    parseInt(page, 10) || 1
                )

            const limitNum =
                Math.min(
                    100,
                    Math.max(
                        1,
                        parseInt(limit, 10) ||
                        20
                    )
                )

            const skip =
                (pageNum - 1) *
                limitNum

            const [
                appointments,
                total
            ] = await Promise.all([
                Appointment.find(query)
                    .sort({
                        date: -1,
                        createdAt: -1
                    })
                    .skip(skip)
                    .limit(limitNum)
                    .populate(
                        'user',
                        'firstName lastName email'
                    ),

                Appointment.countDocuments(
                    query
                )
            ])

            res.json({
                success: true,
                appointments,

                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,

                    pages:
                        Math.ceil(
                            total /
                            limitNum
                        )
                }
            })
        } catch (error) {
            console.error(
                'Get admin appointments error:',
                error
            )

            res.status(500).json({
                success: false,
                message: 'Server error'
            })
        }
    }
)

// ─────────────────────────────────────────────────────────────
// PATCH /api/admin/appointments/:id/status
// ─────────────────────────────────────────────────────────────

router.patch(
    '/appointments/:id/status',
    async (req, res) => {
        const { status } = req.body

        const validStatuses = [
            'pending',
            'confirmed',
            'completed',
            'cancelled'
        ]

        if (
            !validStatuses.includes(status)
        ) {
            return res
                .status(400)
                .json({
                    success: false,
                    message: 'Invalid status'
                })
        }

        if (
            !mongoose.isValidObjectId(
                req.params.id
            )
        ) {
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        'Invalid appointment ID'
                })
        }

        try {
            const appointment =
                await Appointment.findById(
                    req.params.id
                )

            if (!appointment) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        message:
                            'Appointment not found'
                    })
            }

            if (
                appointment.status === status
            ) {
                return res.json({
                    success: true,
                    appointment
                })
            }

            if (
                TERMINAL_STATUSES.includes(
                    appointment.status
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,

                        message:
                            `Cannot change status because this booking is already ${appointment.status}`
                    })
            }

            const previousStatus =
                appointment.status

            const previouslyCountedAsRevenue =
                REVENUE_STATUSES.includes(
                    previousStatus
                )

            const shouldCountAsRevenue =
                REVENUE_STATUSES.includes(
                    status
                )

            if (
                shouldCountAsRevenue &&
                !previouslyCountedAsRevenue
            ) {
                appointment.revenueRecordedAt =
                    new Date()
            } else if (
                !shouldCountAsRevenue
            ) {
                appointment.revenueRecordedAt =
                    null
            }

            appointment.status =
                String(status)

            await appointment.save()

            if (appointment.user) {
                const statusNotification =
                    buildStatusNotification(
                        appointment,
                        status
                    )

                await Notification.create({
                    ...statusNotification,

                    audience: 'user',

                    targetUser:
                        appointment.user,

                    type:
                        'appointment-status',

                    appointment:
                        appointment._id,

                    createdBy:
                        req.user._id
                })
            }

            res.json({
                success: true,
                appointment
            })
        } catch (error) {
            console.error(
                'Update appointment status error:',
                error
            )

            res.status(500).json({
                success: false,
                message: 'Server error'
            })
        }
    }
)

// ─────────────────────────────────────────────────────────────
// DELETE /api/admin/appointments/:id
// ─────────────────────────────────────────────────────────────

router.delete(
    '/appointments/:id',
    async (req, res) => {
        if (
            !mongoose.isValidObjectId(
                req.params.id
            )
        ) {
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        'Invalid appointment ID'
                })
        }

        try {
            const appointment =
                await Appointment
                    .findByIdAndDelete(
                        req.params.id
                    )

            if (!appointment) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        message:
                            'Appointment not found'
                    })
            }

            res.json({
                success: true,

                message:
                    'Appointment deleted successfully'
            })
        } catch (error) {
            console.error(
                'Delete appointment error:',
                error
            )

            res.status(500).json({
                success: false,
                message: 'Server error'
            })
        }
    }
)

// ─────────────────────────────────────────────────────────────
// GET /api/admin/analytics
// ─────────────────────────────────────────────────────────────

router.get(
    '/analytics',
    async (req, res) => {
        try {
            const monthBuckets =
                getRecentMonthBuckets(6)

            const dayBuckets =
                getRecentDayBuckets(7)

            const [
                monthlyRevenueResults,
                dailyRevenueResults,
                serviceAgg,
                breedAgg
            ] = await Promise.all([
                Appointment.aggregate(
                    buildRevenueAggregation(
                        '%Y-%m'
                    )
                ),

                Appointment.aggregate(
                    buildRevenueAggregation(
                        '%Y-%m-%d'
                    )
                ),

                Appointment.aggregate([
                    {
                        $match: {
                            status: {
                                $nin: [
                                    'cancelled'
                                ]
                            }
                        }
                    },
                    {
                        $group: {
                            _id: '$service',
                            count: {
                                $sum: 1
                            }
                        }
                    },
                    {
                        $sort: {
                            count: -1
                        }
                    }
                ]),

                Appointment.aggregate([
                    {
                        $match: {
                            status: {
                                $nin: [
                                    'cancelled'
                                ]
                            },

                            haircutStyle: {
                                $ne: null
                            }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                breed: '$breed',
                                haircut:
                                    '$haircutStyle'
                            },

                            count: {
                                $sum: 1
                            }
                        }
                    },
                    {
                        $sort: {
                            count: -1
                        }
                    },
                    {
                        $limit: 10
                    }
                ])
            ])

            const monthlyRevenueMap =
                monthlyRevenueResults.reduce(
                    (result, item) => {
                        result[item._id] = {
                            revenue:
                                item.revenue,

                            bookings:
                                item.bookings
                        }

                        return result
                    },
                    {}
                )

            const dailyRevenueMap =
                dailyRevenueResults.reduce(
                    (result, item) => {
                        result[item._id] = {
                            revenue:
                                item.revenue,

                            bookings:
                                item.bookings
                        }

                        return result
                    },
                    {}
                )

            const monthlyData =
                monthBuckets.map(
                    (month) => {
                        const metrics =
                            monthlyRevenueMap[
                            month.key
                            ] || {
                                revenue: 0,
                                bookings: 0
                            }

                        return {
                            month:
                                month.label,

                            monthKey:
                                month.key,

                            monthIndex:
                                month.monthIndex,

                            year:
                                month.year,

                            revenue:
                                metrics.revenue,

                            appointments:
                                metrics.bookings
                        }
                    }
                )

            const dailyRevenue =
                dayBuckets.map(
                    (day) => {
                        const metrics =
                            dailyRevenueMap[
                            day.key
                            ] || {
                                revenue: 0,
                                bookings: 0
                            }

                        return {
                            date: day.key,
                            day: day.day,

                            revenue:
                                metrics.revenue,

                            bookings:
                                metrics.bookings
                        }
                    }
                )

            const totalApps =
                serviceAgg.reduce(
                    (sum, item) =>
                        sum + item.count,
                    0
                ) || 1

            const serviceDistribution =
                serviceAgg.map(
                    (service) => ({
                        name:
                            service._id,

                        percentage:
                            Math.round(
                                (
                                    service.count /
                                    totalApps
                                ) * 100
                            )
                    })
                )

            const trendingData =
                breedAgg.map(
                    (breed) => ({
                        breed:
                            breed._id.breed,

                        haircut:
                            breed._id.haircut,

                        bookings:
                            breed.count,

                        trend:
                            Math.min(
                                99,
                                70 +
                                breed.count
                            )
                    })
                )

            /*
             * This replaces the old three-month average-growth
             * formula.
             */
            const statisticalFallback =
                await buildReliableSalesForecast(
                    monthlyRevenueResults
                )

            let nextMonthPrediction =
                statisticalFallback

            let aiSystem = {
                status: 'Statistical fallback active',
                engine: 'Express forecasting fallback',
                recommendationModel:
                    'Dataset-backed grooming model',
                datasets: [
                    'Timmy Tails appointment history',
                    'Breed grooming traits dataset',
                    'Haircut compatibility catalog',
                    'PAGASA-aligned season profile'
                ],
                mlServiceAvailable: false
            }

            try {
                const mlForecast =
                    await buildMachineLearningSalesForecast()

                nextMonthPrediction = {
                    ...statisticalFallback,
                    ...mlForecast,
                    statisticalFallbackModel:
                        statisticalFallback.model
                }

                aiSystem = {
                    ...aiSystem,
                    status:
                        mlForecast.fallbackUsed
                            ? 'ML service connected — collecting more training data'
                            : 'Machine-learning forecast active',
                    engine:
                        mlForecast.engine === 'scikit-learn'
                            ? 'Python scikit-learn microservice'
                            : 'Python ML service with safe fallback',
                    mlServiceAvailable: true,
                    trainingRecords:
                        Number(mlForecast.trainingAppointments || 0),
                    trainingRows:
                        Number(mlForecast.trainingRows || 0),
                    model:
                        mlForecast.model,
                    fallbackUsed:
                        Boolean(mlForecast.fallbackUsed)
                }
            } catch (mlError) {
                console.warn(
                    'ML sales forecast unavailable; using statistical fallback:',
                    mlError.message
                )
            }

            const currentMonthIndex =
                Number(
                    getManilaDateParts()
                        .month
                ) - 1

            const isPhilippinesRainySeason =
                currentMonthIndex >= 5 &&
                currentMonthIndex <= 10

            const weatherInsights = {
                region: 'Philippines',

                seasonType:
                    isPhilippinesRainySeason
                        ? 'Rainy'
                        : 'Dry',

                guidance:
                    isPhilippinesRainySeason
                        ? 'Prioritize easy-maintenance trims and anti-matting services for humid and rainy days.'
                        : 'Promote lightweight cooling styles and de-shedding services for warm, dry conditions.'
            }

            const mlSuggestions = [
                {
                    title:
                        'Weather-aligned Campaign',

                    detail:
                        isPhilippinesRainySeason
                            ? 'Promote shorter maintenance trims this rainy season to reduce matting.'
                            : 'Highlight cooling cuts and hydration add-ons for dry season comfort.'
                },
                {
                    title:
                        'Next Month Sales Target',

                    detail:
                        `Projected revenue for ${nextMonthPrediction.month} is ₱${nextMonthPrediction.predictedRevenue.toLocaleString('en-PH')}. Likely range: ₱${nextMonthPrediction.rangeLow.toLocaleString('en-PH')}–₱${nextMonthPrediction.rangeHigh.toLocaleString('en-PH')}. Model: ${nextMonthPrediction.model}.`
                },
                {
                    title:
                        'Top Breed Opportunity',

                    detail:
                        trendingData[0]
                            ? `${trendingData[0].breed} owners are leaning toward ${trendingData[0].haircut}; consider a featured bundle.`
                            : 'Collect more confirmed appointments to unlock stronger breed-level insights.'
                }
            ]

            res.json({
                success: true,

                analytics: {
                    monthlyData,
                    dailyRevenue,
                    nextMonthPrediction,
                    weatherInsights,
                    aiSystem,
                    mlSuggestions,
                    serviceDistribution,
                    trendingData
                }
            })
        } catch (error) {
            console.error(
                'Admin analytics error:',
                error
            )

            res.status(500).json({
                success: false,
                message: 'Server error'
            })
        }
    }
)

// ─────────────────────────────────────────────────────────────
// GET /api/admin/contacts
// ─────────────────────────────────────────────────────────────

router.get(
    '/contacts',
    async (req, res) => {
        try {
            const contacts =
                await Contact.find()
                    .sort({
                        createdAt: -1
                    })
                    .limit(50)

            res.json({
                success: true,
                contacts
            })
        } catch (error) {
            console.error(
                'Get contacts error:',
                error
            )

            res.status(500).json({
                success: false,
                message: 'Server error'
            })
        }
    }
)

// ─────────────────────────────────────────────────────────────
// PATCH /api/admin/contacts/:id/read
// ─────────────────────────────────────────────────────────────

router.patch(
    '/contacts/:id/read',
    async (req, res) => {
        if (
            !mongoose.isValidObjectId(
                req.params.id
            )
        ) {
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        'Invalid contact message ID'
                })
        }

        try {
            const contact =
                await Contact.findByIdAndUpdate(
                    req.params.id,
                    {
                        read: true
                    },
                    {
                        new: true,
                        runValidators: true
                    }
                )

            if (!contact) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        message:
                            'Contact message not found'
                    })
            }

            return res.json({
                success: true,
                message:
                    'Contact message marked as read',
                contact
            })
        } catch (error) {
            console.error(
                'Mark contact message as read error:',
                error
            )

            return res
                .status(500)
                .json({
                    success: false,
                    message: 'Server error'
                })
        }
    }
)

// ─────────────────────────────────────────────────────────────
// DELETE /api/admin/contacts/:id
// ─────────────────────────────────────────────────────────────

router.delete(
    '/contacts/:id',
    async (req, res) => {
        if (
            !mongoose.isValidObjectId(
                req.params.id
            )
        ) {
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        'Invalid contact message ID'
                })
        }

        try {
            const contact =
                await Contact.findByIdAndDelete(
                    req.params.id
                )

            if (!contact) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        message:
                            'Contact message not found'
                    })
            }

            return res.json({
                success: true,
                message:
                    'Contact message deleted successfully'
            })
        } catch (error) {
            console.error(
                'Delete contact message error:',
                error
            )

            return res
                .status(500)
                .json({
                    success: false,
                    message: 'Server error'
                })
        }
    }
)

// ─────────────────────────────────────────────────────────────
// GET /api/admin/notifications
// ─────────────────────────────────────────────────────────────

router.get('/notifications', async (req, res) => {
    try {
        const notifications = await Notification.find()
            .sort({
                createdAt: -1
            })
            .limit(100)
            .populate(
                'createdBy',
                'firstName lastName email'
            )
            .populate(
                'targetUser',
                'firstName lastName email'
            )

        res.json({
            success: true,
            notifications
        })
    } catch (error) {
        console.error(
            'Get admin notifications error:',
            error
        )

        res.status(500).json({
            success: false,
            message: 'Server error'
        })
    }
})

// ─────────────────────────────────────────────────────────────
// POST /api/admin/notifications
// ─────────────────────────────────────────────────────────────

router.post('/notifications', async (req, res) => {
    const {
        title,
        message,
        audience = 'user',
        targetUser
    } = req.body

    const cleanTitle =
        typeof title === 'string'
            ? title.trim()
            : ''

    const cleanMessage =
        typeof message === 'string'
            ? message.trim()
            : ''

    if (!cleanTitle) {
        return res.status(400).json({
            success: false,
            message: 'Title is required'
        })
    }

    if (!cleanMessage) {
        return res.status(400).json({
            success: false,
            message: 'Message is required'
        })
    }

    if (
        !['user', 'all-users'].includes(audience)
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid notification audience'
        })
    }

    try {
        let recipient = null

        if (audience === 'user') {
            if (
                !targetUser ||
                !mongoose.isValidObjectId(targetUser)
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Please select a valid user'
                })
            }

            recipient = await User.findOne({
                _id: targetUser,
                role: 'user'
            }).select(
                '_id firstName lastName email'
            )

            if (!recipient) {
                return res.status(404).json({
                    success: false,
                    message: 'Selected user was not found'
                })
            }
        }

        const notification =
            await Notification.create({
                title: cleanTitle,
                message: cleanMessage,
                audience,

                targetUser:
                    audience === 'user'
                        ? recipient._id
                        : null,

                type: 'broadcast',
                createdBy: req.user._id
            })

        await notification.populate(
            'createdBy',
            'firstName lastName email'
        )

        await notification.populate(
            'targetUser',
            'firstName lastName email'
        )

        res.status(201).json({
            success: true,

            message:
                audience === 'user'
                    ? `Notification sent only to ${recipient.firstName} ${recipient.lastName}`
                    : 'Notification sent to all users',

            notification
        })
    } catch (error) {
        console.error(
            'Create notification error:',
            error
        )

        res.status(500).json({
            success: false,
            message: 'Server error'
        })
    }
})

module.exports = router