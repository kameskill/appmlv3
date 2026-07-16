import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, LogOut, User } from 'lucide-react'
import { useState } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function Header({ scrolled }) {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/services' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ]

  if (
    location.pathname === '/admin' ||
    location.pathname === '/dashboard'
  ) {
    return null
  }

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/')
    setIsOpen(false)
  }

  return (
    <header
      className={`fixed w-full top-0 z-50 transition-all duration-300 ${scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-lg'
          : 'bg-transparent'
        }`}
    >
      <nav className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center'>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className='flex items-center'
        >
          <Link
            to='/'
            className='cursor-pointer flex items-center gap-3 hover:opacity-90 transition-opacity rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2'
          >
            <div className='w-11 h-11 rounded-full border-2 border-amber-400 overflow-hidden shadow-md flex items-center justify-center bg-[#4a1c52]'>
              <img
                src='/logo.png'
                alt='Timmy Tails logo'
                className='w-full h-full object-cover'
              />
            </div>

            <span className='text-xl font-extrabold text-[#4a1c52] tracking-tight'>
              Timmy Tails
            </span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className='hidden md:flex items-center gap-8'
        >
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.href

            return (
              <Link
                key={item.label}
                to={item.href}
                className={`cursor-pointer relative transition-colors font-bold text-sm uppercase tracking-wider focus:outline-none focus:text-purple-600 ${isActive
                    ? 'text-purple-600'
                    : 'text-gray-700 hover:text-purple-600'
                  }`}
              >
                {item.label}

                {isActive && (
                  <motion.span
                    layoutId='nav-underline'
                    className='absolute -bottom-1.5 left-0 right-0 h-0.5 bg-purple-600 rounded-full'
                  />
                )}
              </Link>
            )
          })}

          {user?.role === 'admin' && (
            <Link
              to='/admin'
              className='cursor-pointer text-purple-600 font-bold hover:text-purple-800 transition-colors focus:outline-none focus:text-purple-800'
            >
              Admin
            </Link>
          )}

          {user?.role === 'user' && (
            <Link
              to='/dashboard'
              className='cursor-pointer text-purple-600 font-bold hover:text-purple-800 transition-colors focus:outline-none focus:text-purple-800'
            >
              Dashboard
            </Link>
          )}
        </motion.div>

        <div className='flex items-center gap-3'>
          {user ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className='hidden md:flex items-center gap-3'
            >
              <div className='flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-full border border-purple-200'>
                <User
                  size={16}
                  className='text-purple-600'
                />

                <span className='text-purple-700 font-medium text-sm'>
                  {user.firstName}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className='cursor-pointer flex items-center gap-1 text-gray-500 hover:text-red-500 px-3 py-2 rounded-full font-medium transition-all text-sm focus:outline-none focus:ring-2 focus:ring-red-300'
              >
                <LogOut size={16} />
                Logout
              </button>
            </motion.div>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className='cursor-pointer hidden md:inline-block text-purple-600 hover:text-purple-700 px-6 py-2 rounded-full font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-300'
              >
                Login
              </button>

              <button
                onClick={() => navigate('/signup')}
                className='cursor-pointer hidden md:inline-block bg-gradient-to-r from-purple-600 to-purple-500 text-white px-6 py-2 rounded-full font-bold text-sm hover:shadow-lg hover:shadow-purple-500/40 transition-all focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2'
              >
                Sign Up
              </button>
            </>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-label={
              isOpen ? 'Close menu' : 'Open menu'
            }
            aria-expanded={isOpen}
            className='cursor-pointer md:hidden text-gray-700 p-1 hover:text-purple-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-300 rounded'
          >
            {isOpen ? (
              <X size={24} />
            ) : (
              <Menu size={24} />
            )}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className='md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200'
          >
            <div className='px-4 py-4 space-y-3'>
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`cursor-pointer block transition-colors font-medium py-1 ${location.pathname === item.href
                      ? 'text-purple-600'
                      : 'text-gray-700 hover:text-purple-600'
                    }`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              <div className='pt-3 border-t border-gray-200'>
                {user ? (
                  <button
                    onClick={handleLogout}
                    className='cursor-pointer w-full flex items-center justify-center gap-2 text-red-500 border-2 border-red-200 px-4 py-2 rounded-full font-medium hover:bg-red-50 transition-colors'
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                ) : (
                  <div className='flex gap-2'>
                    <button
                      onClick={() => {
                        navigate('/login')
                        setIsOpen(false)
                      }}
                      className='cursor-pointer flex-1 text-purple-600 border-2 border-purple-600 py-2 rounded-full font-bold text-sm hover:bg-purple-50 transition-colors'
                    >
                      Login
                    </button>

                    <button
                      onClick={() => {
                        navigate('/signup')
                        setIsOpen(false)
                      }}
                      className='cursor-pointer flex-1 bg-purple-600 text-white py-2 rounded-full font-bold text-sm hover:bg-purple-700 transition-colors'
                    >
                      Sign Up
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}