import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
    LogOut, BarChart3, Calendar, TrendingUp, Users, DollarSign,
    CheckCircle, Clock, Loader2, RefreshCw, Bell, Sparkles, Send, Activity,
    Trash2, ChevronDown, ChevronUp, Mail, Phone, FileText, AlertTriangle, Menu
} from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi, getErrorMessage } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { formatTime } from '../utils/formatters'

const STATUS_STYLES = {
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    confirmed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    completed: 'bg-purple-50 text-purple-700 border border-purple-200',
    cancelled: 'bg-rose-50 text-rose-700 border border-rose-200'
}

const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric'
    })
}

const formatPeso = (value) => {
    const amount = Number(value)
    return `₱${Number.isFinite(amount) ? amount.toLocaleString('en-PH') : '0'}`
}

const formatForecastPeso = (value) => {
    const amount = Number(value)
    return Number.isFinite(amount) ? formatPeso(amount) : 'Not available'
}

const formatForecastPercent = (value) => {
    const amount = Number(value)
    return Number.isFinite(amount) ? `${Math.round(amount)}%` : 'Not available'
}

const getForecastSummary = (prediction) => {
    if (!prediction) return 'Waiting for enough sales history.'

    const low = Number(prediction.rangeLow)
    const high = Number(prediction.rangeHigh)
    const confidence = Number(prediction.confidence)

    if (Number.isFinite(low) && Number.isFinite(high)) {
        const confidenceText =
            prediction.confidenceLabel ||
            `${Number.isFinite(confidence) ? confidence : 0}% confidence`

        return `Likely range: ${formatPeso(low)} – ${formatPeso(high)} · ${confidenceText}`
    }

    return `${Number.isFinite(confidence) ? confidence : 0}% confidence model`
}

const formatEnglishMonth = (data) => {
    if (Number.isInteger(data?.year) && Number.isInteger(data?.monthIndex)) {
        return new Date(Date.UTC(data.year, data.monthIndex, 1))
            .toLocaleDateString('en-US', {
                month: 'short',
                timeZone: 'UTC'
            })
            .toUpperCase()
    }

    return String(data?.month || '').toUpperCase()
}

const TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'appointments', label: 'Bookings', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'ml-trends', label: 'ML Trends', icon: Sparkles },
    { id: 'notifications', label: 'Alerts', icon: Bell }
]

export default function Admin() {
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const [activeTab, setActiveTab] = useState('overview')
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState(null)
    const [appointments, setAppointments] = useState([])
    const [analytics, setAnalytics] = useState(null)
    const [notifications, setNotifications] = useState([])
    const [users, setUsers] = useState([])
    const [notificationForm, setNotificationForm] = useState({
        title: '',
        message: '',
        audience: 'user',
        targetUser: ''
    })
    const [statusFilter, setStatusFilter] = useState('')
    const [updatingId, setUpdatingId] = useState(null)
    const [pendingDeleteId, setPendingDeleteId] = useState(null)
    const [expandedId, setExpandedId] = useState(null)

    useEffect(() => {
        if (!user) { navigate('/login'); return }
        if (user.role !== 'admin') { toast.error('Admin access required'); navigate('/'); return }
    }, [user, navigate])

    const fetchStats = async () => {
        try {
            const { data } = await adminApi.getStats()
            setStats(data.stats)
        } catch (e) { toast.error(getErrorMessage(e)) }
    }

    const fetchAppointments = async () => {
        try {
            const { data } = await adminApi.getAppointments()
            setAppointments(data.appointments || [])
        } catch (e) { toast.error(getErrorMessage(e)) }
    }

    const fetchAnalytics = async () => {
        try {
            const { data } = await adminApi.getAnalytics()
            setAnalytics(data.analytics)
        } catch (e) { toast.error(getErrorMessage(e)) }
    }

    const fetchNotifications = async () => {
        try {
            const { data } = await adminApi.getNotifications()
            setNotifications(data.notifications || [])
        } catch (e) { toast.error(getErrorMessage(e)) }
    }

    const fetchUsers = async () => {
        try {
            const { data } = await adminApi.getUsers()
            setUsers(data.users || [])
        } catch (e) { toast.error(getErrorMessage(e)) }
    }

    const loadAll = async () => {
        setLoading(true)
        await Promise.all([
            fetchStats(),
            fetchAppointments(),
            fetchAnalytics(),
            fetchNotifications(),
            fetchUsers()
        ])
        setLoading(false)
    }

    useEffect(() => { if (user?.role === 'admin') loadAll() }, [user])

    const handleStatusUpdate = async (id, currentStatus, newStatus, e) => {
        e.stopPropagation();
        if (currentStatus === newStatus) return
        if (currentStatus === 'completed' || currentStatus === 'cancelled') {
            toast.error(`Cannot change status because this booking is already ${currentStatus}`)
            return
        }
        setUpdatingId(id)
        try {
            await adminApi.updateStatus(id, newStatus)
            toast.success(`Appointment marked as ${newStatus}`)
            await Promise.all([
                fetchAppointments(),
                fetchStats(),
                fetchAnalytics()
            ])
        } catch (e) {
            toast.error(getErrorMessage(e))
        } finally {
            setUpdatingId(null)
        }
    }

    const handleDeleteAppointment = async (id, e) => {
        e.stopPropagation();
        setPendingDeleteId(id)
    }

    const confirmDeleteAppointment = async () => {
        if (!pendingDeleteId) return
        try {
            await adminApi.deleteAppointment(pendingDeleteId)
            toast.success('Booking removed successfully')
            await Promise.all([
                fetchAppointments(),
                fetchStats(),
                fetchAnalytics()
            ])
        } catch (e) {
            toast.error(getErrorMessage(e))
        } finally {
            setPendingDeleteId(null)
        }
    }

    const handleLogout = () => {
        logout()
        toast.success('Logged out')
        navigate('/')
    }

    const handleCreateNotification = async (e) => {
        e.preventDefault()

        if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
            toast.error('Title and message are required')
            return
        }

        if (notificationForm.audience === 'user' && !notificationForm.targetUser) {
            toast.error('Please select a recipient')
            return
        }

        try {
            await adminApi.createNotification({
                title: notificationForm.title.trim(),
                message: notificationForm.message.trim(),
                audience: notificationForm.audience,
                targetUser: notificationForm.audience === 'user'
                    ? notificationForm.targetUser
                    : null
            })

            const selectedUser = users.find((item) => item._id === notificationForm.targetUser)

            toast.success(
                notificationForm.audience === 'user'
                    ? `Notification sent only to ${selectedUser?.firstName || 'the selected user'}`
                    : 'Notification sent to all users'
            )

            setNotificationForm({
                title: '',
                message: '',
                audience: 'user',
                targetUser: ''
            })

            await fetchNotifications()
        } catch (e) {
            toast.error(getErrorMessage(e))
        }
    }

    const filteredAppointments = useMemo(() => {
        let filtered = statusFilter ? appointments.filter(a => a.status === statusFilter) : [...appointments];
        return filtered.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
            const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
            return dateA - dateB;
        });
    }, [appointments, statusFilter]);

    const StatCard = ({ icon: Icon, label, value, change, color, bg }) => (
        <motion.div whileHover={{ y: -4 }} className='bg-white rounded-3xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-purple-50 h-full flex flex-col justify-between'>
            <div>
                <div className='flex items-center justify-between mb-4'>
                    <div className={`p-3 rounded-2xl ${bg}`}><Icon size={22} className={color} /></div>
                </div>
                <h3 className='text-slate-500 text-xs font-bold uppercase tracking-wider mb-1'>{label}</h3>
            </div>
            <div className='flex items-end gap-3 mt-2'>
                <p className='text-3xl font-extrabold text-slate-900 leading-none'>{value ?? '—'}</p>
                {change && <p className='text-fuchsia-500 text-xs font-bold mb-1'>{change}</p>}
            </div>
        </motion.div>
    )

    if (loading) {
        return (
            <div className='min-h-screen bg-[#fafafa] flex items-center justify-center'>
                <div className='text-center'>
                    <Loader2 className='animate-spin text-purple-500 mx-auto mb-4' size={40} />
                    <p className='text-slate-500 font-medium'>Syncing administration data...</p>
                </div>
            </div>
        )
    }

    const maxRevenue = analytics?.monthlyData?.length
        ? Math.max(...analytics.monthlyData.map(d => d.revenue), 1) : 1
    const maxDailyRevenue = analytics?.dailyRevenue?.length
        ? Math.max(...analytics.dailyRevenue.map((d) => d.revenue), 1) : 1

    return (
        <div className='flex h-screen bg-[#fafafa] font-sans overflow-hidden relative [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed'>
            {/* Subtle background decorative blobs */}
            <div className='absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/30 rounded-full blur-3xl pointer-events-none'></div>
            <div className='absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-fuchsia-200/20 rounded-full blur-3xl pointer-events-none'></div>

            {/* DESKTOP SIDEBAR */}
            <aside className='hidden lg:flex flex-col w-72 bg-white/80 backdrop-blur-xl border-r border-purple-100 z-20 shadow-[4px_0_24px_rgb(0,0,0,0.02)]'>
                <div className='p-8 flex items-center gap-4'>
                    <div className='w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0'>
                        <Activity size={24} className='text-white' />
                    </div>
                    <div>
                        <h1 className='text-xl font-extrabold text-slate-900 tracking-tight leading-tight'>Timmy Tails</h1>
                        <p className='text-[10px] font-bold text-fuchsia-500 uppercase tracking-widest'>Admin Dashboard</p>
                    </div>
                </div>

                <nav className='flex-1 px-4 space-y-2 overflow-y-auto'>
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.id
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`w-full py-3.5 px-5 font-bold text-sm flex items-center gap-3 rounded-2xl transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-md shadow-purple-500/25' : 'text-slate-500 hover:text-purple-600 hover:bg-purple-50/80'}`}>
                                <tab.icon size={18} className={isActive ? 'text-white' : 'opacity-70'} /> {tab.label}
                            </button>
                        )
                    })}
                </nav>

                <div className='p-4 border-t border-purple-50'>
                    <button onClick={handleLogout} className='w-full flex items-center justify-center gap-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all'>
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className='flex-1 flex flex-col h-full overflow-hidden relative z-10'>

                {/* Header (Sticky) */}
                <header className='bg-white/70 backdrop-blur-md border-b border-purple-50 sticky top-0 z-30 px-6 py-4 flex justify-between items-center lg:px-10'>
                    <div className='flex items-center gap-3 lg:hidden'>
                        <div className='w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center shadow-md'>
                            <Activity size={20} className='text-white' />
                        </div>
                        <h1 className='text-lg font-extrabold text-slate-900 tracking-tight'>Admin</h1>
                    </div>

                    <div className='hidden lg:block'>
                        <h2 className='text-xl font-bold text-slate-800 capitalize'>{activeTab.replace('-', ' ')}</h2>
                    </div>

                    <div className='flex items-center gap-3'>
                        <button onClick={loadAll} className='flex items-center gap-2 px-4 py-2 bg-white border border-purple-100 rounded-full hover:bg-purple-50 transition-colors text-slate-500 hover:text-purple-600 text-sm font-bold shadow-sm'>
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            <span className='hidden sm:inline'>Refresh</span>
                        </button>
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className='flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 pb-28 lg:pb-12'>
                    <div className='max-w-7xl mx-auto'>

                        {/* --- OVERVIEW TAB --- */}
                        {activeTab === 'overview' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='space-y-8'>
                                {/* Stat Cards */}
                                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6'>
                                    <StatCard icon={Calendar} label="Today's Bookings" value={stats?.todayAppointments ?? 0} color='text-purple-600' bg='bg-purple-50' />
                                    <StatCard icon={DollarSign} label="Today's Sales" value={formatPeso(stats?.todayRevenue)} color='text-emerald-500' bg='bg-emerald-50' />
                                    <StatCard icon={DollarSign} label='Monthly Revenue' value={stats?.monthlyRevenue || formatPeso(stats?.monthlyRevenueValue)} color='text-teal-500' bg='bg-teal-50' />
                                    <StatCard icon={Users} label='Total Clients' value={stats?.totalCustomers ?? 0} color='text-blue-500' bg='bg-blue-50' />
                                    <StatCard
                                        icon={TrendingUp}
                                        label='Next Month Forecast'
                                        value={analytics?.nextMonthPrediction ? formatPeso(analytics.nextMonthPrediction.predictedRevenue) : '—'}
                                        change={analytics?.nextMonthPrediction ? `${analytics.nextMonthPrediction.confidence}% confidence` : undefined}
                                        color='text-fuchsia-500'
                                        bg='bg-fuchsia-50'
                                    />
                                </div>

                                <div className='grid lg:grid-cols-3 gap-8 items-start'>
                                    {/* Revenue Chart */}
                                    {analytics?.monthlyData?.length > 0 && (
                                        <div className='lg:col-span-2 bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-purple-50 h-full flex flex-col'>
                                            <h2 className='text-lg font-bold text-slate-900 mb-8'>Revenue Forecast</h2>
                                            <div className='flex-1 flex items-end gap-2 sm:gap-4 justify-between border-b border-purple-50 pb-2'>
                                                {analytics.monthlyData.map((d, idx) => (
                                                    <div key={idx} className='flex-1 flex flex-col items-center gap-3 group'>
                                                        <span className='text-[10px] sm:text-xs text-slate-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity'>
                                                            {formatPeso(d.revenue)}
                                                        </span>
                                                        <div className='w-full relative flex justify-center'>
                                                            <motion.div initial={{ height: 0 }} animate={{ height: `${(d.revenue / maxRevenue) * 220}px` }} transition={{ delay: idx * 0.05, duration: 0.8, type: 'spring' }}
                                                                className='w-full max-w-[48px] bg-gradient-to-t from-purple-500 to-fuchsia-400 rounded-t-xl min-h-[4px]' />
                                                        </div>
                                                        <span className='text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide mt-2'>{formatEnglishMonth(d)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {analytics?.dailyRevenue?.length > 0 && (
                                                <div className='mt-8 pt-6 border-t border-purple-50'>
                                                    <div className='flex items-center justify-between mb-4'>
                                                        <h3 className='text-sm font-bold text-slate-700'>Daily Revenue (Last 7 Days)</h3>
                                                        <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Actual Daily Sales</span>
                                                    </div>
                                                    <div className='grid grid-cols-7 gap-3 items-end h-28'>
                                                        {analytics.dailyRevenue.map((day, idx) => (
                                                            <div key={day.date || idx} className='flex flex-col items-center justify-end gap-2'>
                                                                <span className='text-[9px] text-slate-400 font-bold'>{formatPeso(day.revenue)}</span>
                                                                <motion.div
                                                                    initial={{ height: 0 }}
                                                                    animate={{ height: `${(day.revenue / maxDailyRevenue) * 72}px` }}
                                                                    transition={{ delay: idx * 0.04, duration: 0.5 }}
                                                                    className='w-full max-w-[20px] bg-gradient-to-t from-emerald-400 to-teal-400 rounded-t-md min-h-[4px]'
                                                                />
                                                                <span className='text-[10px] font-bold text-slate-400 uppercase'>{day.day}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Quick Appointments Feed */}
                                    <div className='bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-purple-50 h-full flex flex-col'>
                                        <div className='flex justify-between items-center mb-6'>
                                            <h2 className='text-lg font-bold text-slate-900'>Recent Activity</h2>
                                            <button onClick={() => setActiveTab('appointments')} className='text-xs font-bold text-fuchsia-500 hover:text-fuchsia-600 bg-fuchsia-50 px-3 py-1.5 rounded-lg'>All</button>
                                        </div>

                                        {appointments.length > 0 ? (
                                            <div className='space-y-4 overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-purple-100'>
                                                {appointments.slice().sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)).slice(0, 5).map((a, idx) => (
                                                    <div key={idx} className='flex items-start gap-4 p-4 bg-purple-50/30 rounded-2xl border border-purple-50/50 hover:bg-purple-50/80 transition-colors'>
                                                        <div className='w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-fuchsia-100 border border-purple-200 flex items-center justify-center shrink-0 text-purple-600'>
                                                            <span className='font-bold text-sm'>{a.petName?.slice(0, 1)}</span>
                                                        </div>
                                                        <div className='flex-1 min-w-0'>
                                                            <p className='font-bold text-slate-800 text-sm truncate'>
                                                                {a.petName} <span className='text-slate-400 font-medium'>({a.breed})</span>
                                                            </p>
                                                            <p className='text-xs text-slate-500 mt-0.5 truncate'>{a.service}</p>
                                                        </div>
                                                        <div className='text-right shrink-0'>
                                                            <p className='text-[10px] font-bold text-purple-400 uppercase tracking-wider'>{formatTime(a.time)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className='flex-1 flex flex-col items-center justify-center text-slate-400'>
                                                <Activity size={32} className='mb-3 opacity-20' />
                                                <p className='text-sm'>No recent activity.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* --- APPOINTMENTS TAB --- */}
                        {activeTab === 'appointments' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='space-y-6'>

                                <div className='bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-purple-50 overflow-hidden flex flex-col'>
                                    {/* Unified Header & Filters */}
                                    <div className='p-6 md:p-8 border-b border-purple-50/60 bg-purple-50/10 flex flex-col lg:flex-row lg:items-center justify-between gap-6'>
                                        <div>
                                            <h2 className='text-xl font-bold text-slate-900'>Master Schedule</h2>
                                            <p className='text-sm text-slate-500 font-medium mt-1'>{filteredAppointments.length} matching booking{filteredAppointments.length !== 1 ? 's' : ''}</p>
                                        </div>

                                        <div className='flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-purple-100 shadow-sm'>
                                            {['', 'pending', 'confirmed', 'completed', 'cancelled'].map(s => (
                                                <button key={s} onClick={() => setStatusFilter(s)}
                                                    className={`px-5 py-2 rounded-xl text-xs font-bold capitalize transition-all duration-300 ${statusFilter === s ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-md shadow-purple-500/20' : 'bg-transparent text-slate-500 hover:bg-purple-50 hover:text-purple-600'}`}>
                                                    {s || 'All'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Table Content */}
                                    {filteredAppointments.length === 0 ? (
                                        <div className='p-20 text-center flex flex-col items-center'>
                                            <div className='w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-4'>
                                                <Calendar className='text-purple-300' size={40} />
                                            </div>
                                            <p className='text-slate-500 font-medium text-lg'>No appointments found</p>
                                            <p className='text-slate-400 text-sm mt-1'>Try adjusting your status filters.</p>
                                        </div>
                                    ) : (
                                        <div className='overflow-x-auto'>
                                            <table className='w-full text-sm text-left'>
                                                <thead className='bg-white border-b border-purple-50 text-slate-400 text-[10px] uppercase tracking-widest font-bold'>
                                                    <tr>
                                                        <th className='px-6 py-5 w-10'></th>
                                                        <th className='px-6 py-5'>Client & Pet</th>
                                                        <th className='px-6 py-5'>Service Info</th>
                                                        <th className='px-6 py-5'>Schedule</th>
                                                        <th className='px-6 py-5'>Status</th>
                                                        <th className='px-6 py-5 text-right'>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className='divide-y divide-purple-50/50'>
                                                    {filteredAppointments.map((a) => {
                                                        const isExpanded = expandedId === a._id;
                                                        return (
                                                            <React.Fragment key={a._id}>
                                                                <tr onClick={() => setExpandedId(isExpanded ? null : a._id)}
                                                                    className={`transition-colors cursor-pointer ${isExpanded ? 'bg-purple-50/30' : 'hover:bg-purple-50/40'}`}>
                                                                    <td className='px-6 py-5 text-purple-300'>
                                                                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                                    </td>
                                                                    <td className='px-6 py-5'>
                                                                        <div className='flex items-center gap-3'>
                                                                            <div className='w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-fuchsia-100 flex items-center justify-center shrink-0'>
                                                                                <span className='font-bold text-xs text-purple-600'>{a.ownerName?.charAt(0)}</span>
                                                                            </div>
                                                                            <div>
                                                                                <p className='font-bold text-slate-800'>{a.ownerName}</p>
                                                                                <p className='text-xs text-slate-400 mt-0.5'>{a.petName} ({a.breed})</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className='px-6 py-5'>
                                                                        <p className='font-bold text-slate-700'>{a.service}</p>
                                                                        {a.haircutStyle && <span className='inline-block mt-1 px-2 py-0.5 bg-fuchsia-50 text-fuchsia-600 rounded text-[10px] font-bold'>Style: {a.haircutStyle}</span>}
                                                                    </td>
                                                                    <td className='px-6 py-5'>
                                                                        <p className='font-bold text-slate-700'>{formatDate(a.date)}</p>
                                                                        <div className='flex items-center gap-1 mt-1 text-slate-400'>
                                                                            <Clock size={12} />
                                                                            <p className='text-xs'>{formatTime(a.time)}</p>
                                                                        </div>
                                                                    </td>
                                                                    <td className='px-6 py-5'>
                                                                        <span className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold shadow-sm ${STATUS_STYLES[a.status] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                                            {a.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className='px-6 py-5 text-right'>
                                                                        <div className='flex justify-end items-center gap-3'>
                                                                            {updatingId === a._id ? (
                                                                                <Loader2 className='animate-spin text-purple-500 mr-2' size={18} />
                                                                            ) : (
                                                                                <div className='inline-block relative' onClick={e => e.stopPropagation()}>
                                                                                    <select
                                                                                        value={a.status}
                                                                                        disabled={a.status === 'completed' || a.status === 'cancelled'}
                                                                                        onChange={(e) => handleStatusUpdate(a._id, a.status, e.target.value, e)}
                                                                                        className='appearance-none bg-white border border-purple-100 text-slate-600 py-1.5 pl-4 pr-9 rounded-xl text-xs font-bold cursor-pointer hover:border-purple-400 hover:ring-4 hover:ring-purple-50 focus:outline-none transition-all shadow-sm'>
                                                                                        {['pending', 'confirmed', 'completed', 'cancelled'].map(s => (
                                                                                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                                                                        ))}
                                                                                    </select>
                                                                                    <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-purple-400'>
                                                                                        <ChevronDown size={14} />
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            <button onClick={(e) => handleDeleteAppointment(a._id, e)}
                                                                                className='text-slate-300 hover:text-rose-500 p-2 rounded-xl hover:bg-rose-50 transition-colors' title='Delete Booking'>
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                <AnimatePresence>
                                                                    {isExpanded && (
                                                                        <tr>
                                                                            <td colSpan={6} className='p-0 border-b border-purple-100/50'>
                                                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                                                    className='overflow-hidden bg-purple-50/40 shadow-inner'>
                                                                                    <div className='p-8 md:pl-[4.5rem] grid md:grid-cols-3 gap-8'>
                                                                                        <div className='space-y-4 bg-white p-5 rounded-2xl border border-purple-50 shadow-sm'>
                                                                                            <h4 className='text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2'>
                                                                                                <Users size={12} /> Contact Details
                                                                                            </h4>
                                                                                            <div className='space-y-2'>
                                                                                                <p className='flex items-center gap-3 text-sm text-slate-700 font-medium'>
                                                                                                    <Mail size={16} className='text-purple-300' /> {a.ownerEmail || 'N/A'}
                                                                                                </p>
                                                                                                <p className='flex items-center gap-3 text-sm text-slate-700 font-medium'>
                                                                                                    <Phone size={16} className='text-purple-300' /> {a.ownerPhone || 'N/A'}
                                                                                                </p>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className='space-y-4 bg-white p-5 rounded-2xl border border-purple-50 shadow-sm'>
                                                                                            <h4 className='text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2'>
                                                                                                <DollarSign size={12} /> Financial
                                                                                            </h4>
                                                                                            <div className='flex items-end gap-2'>
                                                                                                <span className='text-sm text-slate-500 mb-1'>Total:</span>
                                                                                                <span className='text-2xl font-extrabold text-slate-900'>₱{a.price?.toLocaleString() || '—'}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className='space-y-4 bg-white p-5 rounded-2xl border border-purple-50 shadow-sm'>
                                                                                            <h4 className='text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2'>
                                                                                                <FileText size={12} /> Special Notes
                                                                                            </h4>
                                                                                            <p className='text-sm text-slate-600 leading-relaxed italic'>
                                                                                                "{a.notes ? a.notes : 'No special requests provided.'}"
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                </motion.div>
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </AnimatePresence>
                                                            </React.Fragment>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* --- ANALYTICS TAB --- */}
                        {activeTab === 'analytics' && analytics && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='space-y-8'>
                                <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 items-start'>
                                    <div className='bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-purple-50 h-full'>
                                        <h3 className='text-lg font-bold text-slate-900 mb-8'>Service Popularity</h3>
                                        {analytics.serviceDistribution.length > 0 ? (
                                            <div className='space-y-6'>
                                                {analytics.serviceDistribution.map((s, idx) => (
                                                    <div key={idx}>
                                                        <div className='flex justify-between items-end mb-2.5'>
                                                            <span className='text-sm text-slate-700 font-bold'>{s.name}</span>
                                                            <span className='text-xs font-bold text-purple-500 bg-purple-50 px-2 py-0.5 rounded'>{s.percentage}%</span>
                                                        </div>
                                                        <div className='w-full h-3 bg-slate-100 rounded-full overflow-hidden'>
                                                            <motion.div initial={{ width: 0 }} animate={{ width: `${s.percentage}%` }} transition={{ delay: idx * 0.1, duration: 0.8 }}
                                                                className='h-full bg-gradient-to-r from-purple-400 to-fuchsia-500 rounded-full' />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : <p className='text-slate-400 text-sm'>No service data available yet.</p>}
                                    </div>

                                    <div className='bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-purple-50 h-full'>
                                        <h3 className='text-lg font-bold text-slate-900 mb-10'>Booking Volume Trends</h3>
                                        {analytics.monthlyData.length > 0 ? (
                                            <div className='h-64 flex items-end gap-3 sm:gap-6 justify-between border-b border-purple-50 pt-4'>
                                                {analytics.monthlyData.map((d, idx) => {
                                                    const maxApts = Math.max(...analytics.monthlyData.map(x => x.appointments), 1)
                                                    return (
                                                        <div key={idx} className='flex-1 flex flex-col items-center gap-3 group'>
                                                            <span className='text-xs text-slate-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity'>{d.appointments}</span>
                                                            <div className='w-full relative flex justify-center'>
                                                                <motion.div initial={{ height: 0 }} animate={{ height: `${(d.appointments / maxApts) * 180}px` }} transition={{ delay: idx * 0.05, duration: 0.8 }}
                                                                    className='w-full max-w-[36px] bg-gradient-to-t from-fuchsia-400 to-pink-400 rounded-t-xl min-h-[4px]' />
                                                            </div>
                                                            <span className='text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide mt-2'>{formatEnglishMonth(d)}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : <p className='text-slate-400 text-sm'>No volume data yet.</p>}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* --- ML TRENDS TAB --- */}
                        {activeTab === 'ml-trends' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='space-y-8'>
                                <div className='bg-gradient-to-r from-purple-600 to-fuchsia-500 rounded-3xl p-8 md:p-12 text-white shadow-xl shadow-purple-500/20 relative overflow-hidden'>
                                    <div className='absolute right-0 top-0 opacity-20 pointer-events-none scale-150 transform translate-x-1/4 -translate-y-1/4'>
                                        <Sparkles size={250} />
                                    </div>
                                    <div className='relative z-10'>
                                        <div className='inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase mb-5 text-white border border-white/30 shadow-sm'>
                                            <Activity size={14} /> AI Engine Active
                                        </div>
                                        <h2 className='text-3xl lg:text-4xl font-extrabold mb-4 tracking-tight'>Smart Trend Analysis</h2>
                                        <p className='text-purple-50 max-w-xl text-sm leading-relaxed font-medium'>Dataset-trained grooming recommendations and time-series sales forecasting using Philippine season signals, service mix, booking pipeline, and your real appointment history.</p>
                                    </div>
                                </div>

                                <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                                    {[
                                        {
                                            color: 'text-amber-500',
                                            bg: 'bg-amber-50',
                                            title: 'Seasonal Matrix',
                                            body: analytics?.weatherInsights?.seasonType ? `${analytics.weatherInsights.seasonType} Season` : 'Climate Synced',
                                            sub: analytics?.weatherInsights?.guidance || 'Algorithm prioritizing weather-fit trims.'
                                        },
                                        {
                                            color: 'text-fuchsia-500',
                                            bg: 'bg-fuchsia-50',
                                            title: 'Sales Predictor',
                                            body: Number.isFinite(Number(analytics?.nextMonthPrediction?.predictedRevenue))
                                                ? `${formatPeso(analytics.nextMonthPrediction.predictedRevenue)} expected next month`
                                                : 'Not enough sales data yet',
                                            sub: getForecastSummary(analytics?.nextMonthPrediction)
                                        },
                                        {
                                            color: 'text-purple-500',
                                            bg: 'bg-purple-50',
                                            title: 'System Status',
                                            body: analytics?.aiSystem?.status || 'AI service status unavailable',
                                            sub: analytics?.aiSystem?.engine || 'Using the safe statistical fallback.'
                                        }
                                    ].map((card) => (
                                        <div key={card.title} className='bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-purple-50 flex flex-col'>
                                            <div className={`inline-flex self-start p-3 rounded-2xl ${card.bg} ${card.color} mb-4`}>
                                                <Sparkles size={20} />
                                            </div>
                                            <h4 className='font-bold text-slate-800 mb-1'>{card.title}</h4>
                                            <p className='text-sm font-bold text-slate-600 mb-1'>{card.body}</p>
                                            <p className='text-xs text-slate-400'>{card.sub}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Forecast calculation details */}
                                <div className='bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-purple-50'>
                                    <div className='flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6'>
                                        <div>
                                            <div className='inline-flex items-center gap-2 text-fuchsia-600 bg-fuchsia-50 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3'>
                                                <BarChart3 size={14} /> Forecast Breakdown
                                            </div>
                                            <h3 className='text-xl font-bold text-slate-900'>How the predicted sales were calculated</h3>
                                            <p className='text-sm text-slate-500 mt-2 max-w-3xl leading-relaxed'>
                                                The forecasting service compares multiple regression models using time-ordered
                                                validation, then trains the best candidate on daily booking, service, season,
                                                pipeline, lag, and rolling-revenue features. When data is still limited, it clearly
                                                switches to the statistical fallback instead of claiming an unreliable ML result.
                                            </p>
                                        </div>

                                        <div className='rounded-2xl bg-purple-50 border border-purple-100 px-4 py-3 shrink-0'>
                                            <p className='text-[10px] font-bold uppercase tracking-widest text-purple-400'>Forecast Model</p>
                                            <p className='text-sm font-bold text-purple-700 mt-1'>
                                                {analytics?.nextMonthPrediction?.model || 'Sales forecasting model'}
                                            </p>
                                        </div>
                                    </div>

                                    {analytics?.nextMonthPrediction ? (
                                        <>
                                            <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
                                                {[
                                                    {
                                                        label: 'Historical Baseline',
                                                        value: formatForecastPeso(analytics.nextMonthPrediction.historicalBaseline),
                                                        detail: `Based on ${Number(analytics.nextMonthPrediction.historyMonths) || 0} completed month(s)`,
                                                        icon: BarChart3,
                                                        color: 'text-purple-600',
                                                        bg: 'bg-purple-50'
                                                    },
                                                    {
                                                        label: 'Current Month Pace',
                                                        value: formatForecastPeso(analytics.nextMonthPrediction.currentMonthRunRate),
                                                        detail: `Actual sales so far: ${formatForecastPeso(analytics.nextMonthPrediction.currentMonthRevenue)}`,
                                                        icon: Activity,
                                                        color: 'text-blue-600',
                                                        bg: 'bg-blue-50'
                                                    },
                                                    {
                                                        label: 'Confirmed Next Month',
                                                        value: formatForecastPeso(analytics.nextMonthPrediction.committedRevenue),
                                                        detail: 'Revenue already supported by confirmed bookings',
                                                        icon: CheckCircle,
                                                        color: 'text-emerald-600',
                                                        bg: 'bg-emerald-50'
                                                    },
                                                    {
                                                        label: 'Expected Pending Sales',
                                                        value: formatForecastPeso(analytics.nextMonthPrediction.expectedPendingRevenue),
                                                        detail: `${formatForecastPercent(analytics.nextMonthPrediction.confirmationRate)} historical confirmation rate`,
                                                        icon: Clock,
                                                        color: 'text-amber-600',
                                                        bg: 'bg-amber-50'
                                                    }
                                                ].map((item) => (
                                                    <div key={item.label} className='rounded-2xl border border-purple-50 bg-slate-50/50 p-5'>
                                                        <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-4`}>
                                                            <item.icon size={18} className={item.color} />
                                                        </div>
                                                        <p className='text-[10px] font-bold uppercase tracking-widest text-slate-400'>{item.label}</p>
                                                        <p className='text-xl font-extrabold text-slate-900 mt-1'>{item.value}</p>
                                                        <p className='text-xs text-slate-500 mt-2 leading-relaxed'>{item.detail}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4'>
                                                <div className='lg:col-span-2 rounded-2xl border border-fuchsia-100 bg-gradient-to-r from-fuchsia-50 to-purple-50 p-5'>
                                                    <p className='text-[10px] font-bold uppercase tracking-widest text-fuchsia-500'>Final Forecast</p>
                                                    <div className='flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mt-2'>
                                                        <div>
                                                            <p className='text-3xl font-extrabold text-slate-900'>
                                                                {formatForecastPeso(analytics.nextMonthPrediction.predictedRevenue)}
                                                            </p>
                                                            <p className='text-sm text-slate-500 mt-1'>
                                                                Likely range: {formatForecastPeso(analytics.nextMonthPrediction.rangeLow)}
                                                                {' – '}
                                                                {formatForecastPeso(analytics.nextMonthPrediction.rangeHigh)}
                                                            </p>
                                                        </div>
                                                        <div className='sm:text-right'>
                                                            <p className='text-sm font-bold text-fuchsia-600'>
                                                                {analytics.nextMonthPrediction.confidenceLabel ||
                                                                    `${formatForecastPercent(analytics.nextMonthPrediction.confidence)} confidence`}
                                                            </p>
                                                            <p className='text-xs text-slate-400 mt-1 capitalize'>
                                                                Trend: {analytics.nextMonthPrediction.signal || 'stable'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className='rounded-2xl border border-purple-100 bg-white p-5'>
                                                    <p className='text-[10px] font-bold uppercase tracking-widest text-purple-400'>Model Check</p>
                                                    <p className='text-sm font-bold text-slate-800 mt-3'>
                                                        Backtest accuracy: {formatForecastPercent(analytics.nextMonthPrediction.backtestAccuracy)}
                                                    </p>
                                                    <p className='text-xs text-slate-500 mt-2'>
                                                        MAE: {Number.isFinite(Number(analytics.nextMonthPrediction.metrics?.mae))
                                                            ? formatPeso(Math.round(Number(analytics.nextMonthPrediction.metrics.mae)))
                                                            : 'Not available'}
                                                        {' · '}
                                                        sMAPE: {Number.isFinite(Number(analytics.nextMonthPrediction.metrics?.smape))
                                                            ? `${Number(analytics.nextMonthPrediction.metrics.smape).toFixed(1)}%`
                                                            : 'Not available'}
                                                    </p>
                                                    <p className='text-xs text-slate-500 mt-2 leading-relaxed'>
                                                        Time-series validation trains only on earlier dates and tests on later dates,
                                                        helping prevent future sales from leaking into model evaluation.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className='mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-5'>
                                                <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3'>
                                                    <h4 className='text-sm font-bold text-slate-800'>Model process</h4>
                                                    <span className={`self-start text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${analytics.nextMonthPrediction.engine === 'scikit-learn'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-amber-100 text-amber-700'}`}>
                                                        {analytics.nextMonthPrediction.engine === 'scikit-learn'
                                                            ? 'Machine Learning Active'
                                                            : 'Safe Fallback Active'}
                                                    </span>
                                                </div>

                                                {analytics.nextMonthPrediction.engine === 'scikit-learn' ? (
                                                    <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600'>
                                                        <p><span className='font-bold text-purple-600'>1.</span> Converts appointment history into one daily business dataset.</p>
                                                        <p><span className='font-bold text-purple-600'>2.</span> Builds calendar, rainy/dry season, service-mix, booking-pipeline, lag, and rolling-average features.</p>
                                                        <p><span className='font-bold text-purple-600'>3.</span> Compares Ridge, Random Forest, and Gradient Boosting when enough data exists.</p>
                                                        <p><span className='font-bold text-purple-600'>4.</span> Uses TimeSeriesSplit and chooses the candidate with the lowest validation error.</p>
                                                        <p><span className='font-bold text-purple-600'>5.</span> Recursively forecasts each day of next month and sums the daily predictions.</p>
                                                        <p><span className='font-bold text-purple-600'>6.</span> Keeps confirmed revenue and probability-adjusted pending bookings as a pipeline floor.</p>
                                                    </div>
                                                ) : (
                                                    <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600'>
                                                        <p><span className='font-bold text-purple-600'>1.</span> Uses completed-month revenue, current sales pace, and next-month bookings.</p>
                                                        <p><span className='font-bold text-purple-600'>2.</span> Avoids training an ML model until enough real business data is available.</p>
                                                        <p><span className='font-bold text-purple-600'>3.</span> Requires at least 45 calendar days and 10 revenue-producing days for ML training.</p>
                                                        <p><span className='font-bold text-purple-600'>4.</span> Automatically switches to the ML forecast after the data requirement is reached.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className='rounded-2xl border border-dashed border-purple-200 bg-purple-50/40 p-8 text-center'>
                                            <BarChart3 size={32} className='mx-auto text-purple-300 mb-3' />
                                            <p className='text-sm font-bold text-slate-600'>Forecast details are not available yet.</p>
                                            <p className='text-xs text-slate-400 mt-1'>
                                                Add and confirm more bookings, then refresh the dashboard.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
                                    <div className='bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-purple-50'>
                                        <div className='flex items-center justify-between gap-4 mb-6'>
                                            <div>
                                                <p className='text-[10px] font-bold uppercase tracking-widest text-purple-500'>Training Evidence</p>
                                                <h3 className='text-lg font-bold text-slate-900 mt-1'>Model data health</h3>
                                            </div>
                                            <Activity size={22} className='text-purple-500' />
                                        </div>

                                        <div className='grid grid-cols-2 gap-4'>
                                            {[
                                                {
                                                    label: 'Appointment Records',
                                                    value: Number(analytics?.nextMonthPrediction?.trainingAppointments || analytics?.aiSystem?.trainingRecords || 0).toLocaleString('en-PH')
                                                },
                                                {
                                                    label: 'Daily Training Rows',
                                                    value: Number(analytics?.nextMonthPrediction?.trainingRows || analytics?.aiSystem?.trainingRows || 0).toLocaleString('en-PH')
                                                },
                                                {
                                                    label: 'Training Start',
                                                    value: analytics?.nextMonthPrediction?.trainingPeriod?.start || 'Collecting data'
                                                },
                                                {
                                                    label: 'Training End',
                                                    value: analytics?.nextMonthPrediction?.trainingPeriod?.end || 'Collecting data'
                                                }
                                            ].map((item) => (
                                                <div key={item.label} className='rounded-2xl bg-slate-50 border border-slate-100 p-4'>
                                                    <p className='text-[10px] uppercase tracking-widest font-bold text-slate-400'>{item.label}</p>
                                                    <p className='text-sm font-extrabold text-slate-800 mt-2 break-words'>{item.value}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {analytics?.nextMonthPrediction?.fallbackReason && (
                                            <div className='mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4'>
                                                <p className='text-xs font-bold text-amber-800'>Why ML is not active yet</p>
                                                <p className='text-xs text-amber-700 mt-1 leading-relaxed'>
                                                    {analytics.nextMonthPrediction.fallbackReason}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className='bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-purple-50'>
                                        <div className='flex items-center justify-between gap-4 mb-6'>
                                            <div>
                                                <p className='text-[10px] font-bold uppercase tracking-widest text-fuchsia-500'>Explainable AI</p>
                                                <h3 className='text-lg font-bold text-slate-900 mt-1'>Most influential forecast features</h3>
                                            </div>
                                            <BarChart3 size={22} className='text-fuchsia-500' />
                                        </div>

                                        {analytics?.nextMonthPrediction?.featureImportance?.length > 0 ? (
                                            <div className='space-y-4'>
                                                {analytics.nextMonthPrediction.featureImportance.slice(0, 6).map((item) => (
                                                    <div key={item.feature}>
                                                        <div className='flex justify-between gap-3 text-xs mb-1.5'>
                                                            <span className='font-bold text-slate-700'>{item.feature}</span>
                                                            <span className='font-bold text-purple-600'>{Number(item.importance).toFixed(1)}%</span>
                                                        </div>
                                                        <div className='h-2.5 bg-slate-100 rounded-full overflow-hidden'>
                                                            <div
                                                                className='h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full'
                                                                style={{ width: `${Math.min(100, Math.max(2, Number(item.importance) || 0))}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className='rounded-2xl border border-dashed border-purple-200 bg-purple-50/40 p-6 text-center'>
                                                <p className='text-sm font-bold text-slate-600'>Feature importance appears after ML training.</p>
                                                <p className='text-xs text-slate-400 mt-1'>Continue recording real appointments and completed sales.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className='bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-purple-50 overflow-hidden'>
                                    <div className='p-6 md:p-8 border-b border-purple-50/60 bg-purple-50/10'>
                                        <h3 className='text-lg font-bold text-slate-900'>Live Trending Haircuts</h3>
                                    </div>
                                    {analytics?.trendingData?.length > 0 ? (
                                        <div className='overflow-x-auto'>
                                            <table className='w-full text-sm text-left'>
                                                <thead className='bg-white border-b border-purple-50 text-slate-400 text-[10px] uppercase tracking-widest font-bold'>
                                                    <tr>
                                                        <th className='px-6 py-5'>Dog Breed</th>
                                                        <th className='px-6 py-5'>Top Style Match</th>
                                                        <th className='px-6 py-5'>Confidence Score</th>
                                                        <th className='px-6 py-5 text-right'>Total Bookings</th>
                                                    </tr>
                                                </thead>
                                                <tbody className='divide-y divide-purple-50'>
                                                    {analytics.trendingData.map((t, idx) => (
                                                        <tr key={idx} className='hover:bg-purple-50/30 transition-colors'>
                                                            <td className='px-6 py-5 font-bold text-slate-800 flex items-center gap-3'>
                                                                <span className='text-purple-400 text-xs bg-purple-50 px-2.5 py-1 rounded-lg'>#{idx + 1}</span> {t.breed}
                                                            </td>
                                                            <td className='px-6 py-5'>
                                                                <span className='px-3 py-1.5 bg-gradient-to-r from-purple-50 to-fuchsia-50 text-purple-700 border border-purple-100 rounded-lg text-xs font-bold shadow-sm'>{t.haircut}</span>
                                                            </td>
                                                            <td className='px-6 py-5 w-1/3'>
                                                                <div className='flex items-center gap-3'>
                                                                    <div className='flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden'>
                                                                        <div className='h-full bg-gradient-to-r from-purple-400 to-fuchsia-500 rounded-full' style={{ width: `${t.trend}%` }} />
                                                                    </div>
                                                                    <span className='font-bold text-slate-600 text-xs w-8'>{t.trend}%</span>
                                                                </div>
                                                            </td>
                                                            <td className='px-6 py-5 font-extrabold text-slate-800 text-right'>{t.bookings}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className='text-center py-20'>
                                            <div className='w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4'>
                                                <TrendingUp className='text-purple-300' size={40} />
                                            </div>
                                            <p className='text-slate-500 font-medium'>Awaiting sufficient booking data to generate trends.</p>
                                        </div>
                                    )}
                                </div>

                                {analytics?.mlSuggestions?.length > 0 && (
                                    <div className='bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-purple-50 p-6 md:p-8'>
                                        <h3 className='text-lg font-bold text-slate-900 mb-5'>AI Suggestions</h3>
                                        <div className='space-y-4'>
                                            {analytics.mlSuggestions.map((suggestion, idx) => (
                                                <div key={idx} className='rounded-2xl border border-purple-100 bg-purple-50/40 p-4'>
                                                    <p className='text-xs font-bold uppercase tracking-wider text-purple-600 mb-1'>{suggestion.title}</p>
                                                    <p className='text-sm text-slate-600 font-medium'>{suggestion.detail}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* --- NOTIFICATIONS TAB --- */}
                        {activeTab === 'notifications' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='grid lg:grid-cols-5 gap-8 items-start'>
                                {/* Composer */}
                                <div className='lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-purple-50 lg:sticky top-28'>
                                    <h3 className='text-lg font-bold text-slate-900 mb-6 flex items-center gap-3'>
                                        <div className='p-2 bg-fuchsia-50 rounded-lg'>
                                            <Send size={18} className='text-fuchsia-500' />
                                        </div>
                                        Send Notification
                                    </h3>
                                    <form onSubmit={handleCreateNotification} className='space-y-5'>
                                        <div>
                                            <label className='block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2'>Recipient Type</label>
                                            <div className='grid grid-cols-2 gap-2 rounded-2xl bg-purple-50/60 p-1.5 border border-purple-100'>
                                                <button
                                                    type='button'
                                                    onClick={() => setNotificationForm(prev => ({ ...prev, audience: 'user', targetUser: '' }))}
                                                    className={`rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${notificationForm.audience === 'user' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-purple-600'}`}
                                                >
                                                    Specific User
                                                </button>
                                                <button
                                                    type='button'
                                                    onClick={() => setNotificationForm(prev => ({ ...prev, audience: 'all-users', targetUser: '' }))}
                                                    className={`rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${notificationForm.audience === 'all-users' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-purple-600'}`}
                                                >
                                                    All Users
                                                </button>
                                            </div>
                                        </div>

                                        {notificationForm.audience === 'user' && (
                                            <div>
                                                <label className='block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2'>Select User</label>
                                                <select
                                                    value={notificationForm.targetUser}
                                                    onChange={(e) => setNotificationForm(prev => ({ ...prev, targetUser: e.target.value }))}
                                                    className='w-full px-4 py-3.5 border border-purple-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 bg-purple-50/20 text-sm font-medium transition-all'
                                                    required
                                                >
                                                    <option value=''>Choose a user...</option>
                                                    {users.map((recipient) => (
                                                        <option key={recipient._id} value={recipient._id}>
                                                            {recipient.firstName} {recipient.lastName} — {recipient.email}
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className='mt-2 text-[11px] text-slate-400'>Only the selected user will receive and see this notification.</p>
                                            </div>
                                        )}

                                        <div>
                                            <label className='block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2'>Alert Title</label>
                                            <input value={notificationForm.title} onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                                                className='w-full px-4 py-3.5 border border-purple-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 bg-purple-50/20 text-sm font-medium transition-all'
                                                placeholder='e.g., Service completed' />
                                        </div>
                                        <div>
                                            <label className='block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2'>Message Body</label>
                                            <textarea value={notificationForm.message} onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))} rows={6}
                                                className='w-full px-4 py-3.5 border border-purple-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 bg-purple-50/20 text-sm font-medium resize-none transition-all'
                                                placeholder='Write your announcement here...' />
                                        </div>
                                        <button type='submit' className='w-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white py-4 rounded-2xl font-bold hover:from-purple-600 hover:to-fuchsia-600 shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2'>
                                            {notificationForm.audience === 'user' ? 'Send to Selected User' : 'Push to All Users'}
                                        </button>
                                    </form>
                                </div>

                                {/* History Log */}
                                <div className='lg:col-span-3 bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-purple-50'>
                                    <h3 className='text-lg font-bold text-slate-900 mb-6'>Notification History</h3>
                                    {notifications.length === 0 ? (
                                        <div className='py-20 text-center text-slate-400 flex flex-col items-center'>
                                            <div className='w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-4'>
                                                <Bell className='text-purple-300' size={40} />
                                            </div>
                                            <p className='font-medium'>No announcements sent yet.</p>
                                        </div>
                                    ) : (
                                        <div className='space-y-4'>
                                            {notifications.map((n) => (
                                                <div key={n._id} className='p-6 bg-white rounded-2xl border border-purple-100 shadow-sm flex gap-5 hover:border-purple-300 transition-colors'>
                                                    <div className='bg-purple-50 p-3 rounded-2xl shrink-0 text-fuchsia-500 self-start'>
                                                        <Bell size={20} />
                                                    </div>
                                                    <div>
                                                        <div className='flex flex-wrap items-center gap-x-3 gap-y-2 mb-2'>
                                                            <p className='font-bold text-slate-800 text-base'>{n.title}</p>
                                                            <span className='text-[10px] font-bold text-purple-500 uppercase tracking-widest bg-purple-50 px-2.5 py-1 rounded-md'>
                                                                {new Date(n.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <div className='flex flex-wrap items-center gap-2 mb-2'>
                                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${n.audience === 'user' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                                {n.audience === 'user'
                                                                    ? `Only: ${n.targetUser ? `${n.targetUser.firstName} ${n.targetUser.lastName}` : 'Specific user'}`
                                                                    : 'All users'}
                                                            </span>
                                                            {n.type === 'appointment-status' && (
                                                                <span className='text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-purple-50 text-purple-600'>
                                                                    Appointment status
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className='text-sm text-slate-500 leading-relaxed'>{n.message}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </main>

            {/* MOBILE BOTTOM NAVIGATION */}
            <nav className='lg:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-purple-100 z-40 pb-safe'>
                <div className='flex justify-around items-center p-2'>
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.id
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`flex flex-col items-center gap-1 p-2 rounded-xl min-w-[64px] transition-all ${isActive ? 'text-fuchsia-600' : 'text-slate-400 hover:text-purple-500'}`}>
                                <div className={`p-1.5 rounded-lg ${isActive ? 'bg-fuchsia-50' : ''}`}>
                                    <tab.icon size={20} />
                                </div>
                                <span className={`text-[10px] font-bold ${isActive ? 'text-fuchsia-600' : ''}`}>{tab.label}</span>
                            </button>
                        )
                    })}
                </div>
            </nav>

            {/* DELETE MODAL */}
            <AnimatePresence>
                {pendingDeleteId && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4' onClick={() => setPendingDeleteId(null)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} className='w-full max-w-md bg-white rounded-[2rem] border border-purple-100 shadow-2xl p-8' onClick={(e) => e.stopPropagation()}>
                            <div className='flex items-start gap-5'>
                                <div className='p-4 rounded-2xl bg-rose-50 text-rose-500 shrink-0'>
                                    <AlertTriangle size={28} />
                                </div>
                                <div>
                                    <h3 className='text-xl font-bold text-slate-900'>Delete Booking?</h3>
                                    <p className='text-sm text-slate-500 mt-2 leading-relaxed'>This action is permanent and will completely remove this appointment from the system. It cannot be undone.</p>
                                </div>
                            </div>
                            <div className='mt-8 flex justify-end gap-3'>
                                <button onClick={() => setPendingDeleteId(null)} className='px-6 py-3 text-sm font-bold text-slate-600 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors'>
                                    Cancel
                                </button>
                                <button onClick={confirmDeleteAppointment} className='px-6 py-3 text-sm font-bold text-white bg-rose-500 rounded-2xl hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-all'>
                                    Delete Booking
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}