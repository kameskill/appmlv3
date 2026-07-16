import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchMe = useCallback(async () => {
        const token = localStorage.getItem('token')
        if (!token) { setLoading(false); return }
        try {
            const { data } = await authApi.me()
            setUser(data.user)
        } catch {
            localStorage.removeItem('token')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchMe() }, [fetchMe])

    const login = async (email, password) => {
        const { data } = await authApi.login({ email, password })
        localStorage.setItem('token', data.token)
        setUser(data.user)
        return data
    }

    const register = async (formData) => {
        const { data } = await authApi.register(formData)
        localStorage.setItem('token', data.token)
        setUser(data.user)
        return data
    }

    const sendRegisterOtp = async (formData) => {
        const { data } = await authApi.sendRegisterOtp(formData)
        return data
    }

    const sendPasswordOtp = async (phone) => {
        const { data } = await authApi.sendPasswordOtp({ phone })
        return data
    }

    const resetPasswordWithOtp = async ({ phone, otp, newPassword }) => {
        const { data } = await authApi.resetPassword({ phone, otp, newPassword })
        return data
    }

    const updatePhone = async (phone) => {
        const { data } = await authApi.updatePhone({ phone })
        setUser(data.user)
        return data
    }

    const logout = () => {
        localStorage.removeItem('token')
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            register,
            sendRegisterOtp,
            sendPasswordOtp,
            resetPasswordWithOtp,
            updatePhone,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
    return ctx
}
