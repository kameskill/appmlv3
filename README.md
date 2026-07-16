# Timmy Tails — Dog Grooming Appointment System

AI-powered pet grooming appointment booking platform with dataset-trained grooming recommendations and machine-learning sales forecasting.

## 🚀 Features

### Frontend (React + Tailwind)
- ✅ Home page with hero section and trust badges
- ✅ Services showcase
- ✅ About & Contact pages (submits to backend)
- ✅ User authentication (Login/Signup → JWT)
- ✅ OTP-based signup and password reset via mobile number (TextBee)
- ✅ Auth-aware header (shows logged-in user, logout)
- ✅ Booking system with real ML recommendations
- ✅ Real-time time slot availability from backend
- ✅ Dedicated user dashboard (bookings, notifications, settings)
- ✅ Admin dashboard with live data from backend
- ✅ Admin-to-user notifications
- ✅ Toast notifications replacing all browser alerts
- ✅ Loading states throughout

### Backend (Express.js + MongoDB Atlas)
- ✅ JWT authentication (register / login / me)
- ✅ Appointments CRUD (create, availability check, cancel)
- ✅ Admin APIs (stats, appointments, analytics, contacts)
- ✅ Contact message storage
- ✅ CORS-protected API
- ✅ Rate limiting (auth: 20/15 min · booking: 10/hr · contact: 5/hr · general: 200/15 min)

### AI/ML Service (Python Flask + scikit-learn)
- ✅ Random Forest grooming compatibility model trained from breed, haircut, and season datasets
- ✅ Live popularity adjustment from confirmed/completed Timmy Tails bookings
- ✅ Double-coat clipping safeguards and recommendation warnings
- ✅ Philippine rainy/dry season features based on PAGASA season mapping
- ✅ Sales forecasting from real appointment history using Ridge, Random Forest, and Gradient Boosting candidates
- ✅ TimeSeriesSplit validation, MAE/sMAPE, confidence range, and feature importance
- ✅ Transparent statistical fallback until enough real sales data exists
- ✅ `/recommend`, `/forecast/sales`, `/model-info`, `/breeds`, `/season`, and `/health` endpoints

## 📋 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router v7, Tailwind CSS v4, Framer Motion, Lucide Icons |
| Backend | Node.js, Express.js, Mongoose, JWT, bcryptjs |
| Database | MongoDB Atlas |
| AI/ML Service | Python 3.11+, Flask 3, scikit-learn, pandas, NumPy |

## 📁 Project Structure

```
appointmentml/
├── appml/                     # React Frontend
│   ├── src/
│   │   ├── context/           # AuthContext (JWT + user state)
│   │   ├── utils/api.js       # Axios API helpers
│   │   ├── pages/             # All page components
│   │   ├── components/        # Reusable components
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
│
├── backend-express/           # REST API
│   ├── config/db.js           # MongoDB Atlas connection
│   ├── middleware/auth.js     # JWT protect + adminOnly
│   ├── models/                # User, Appointment, Contact
│   ├── routes/                # auth, appointments, admin, contact
│   ├── server.js
│   └── .env.example
│
└── ml-service-flask/          # AI/ML Service
    ├── app.py                 # Flask routes
    ├── recommendation_engine.py
    ├── sales_forecasting.py
    ├── data/
    │   ├── breed_grooming_dataset.csv
    │   ├── haircut_catalog.csv
    │   ├── recommendation_training.csv
    │   └── sample_sales_history.csv
    └── requirements.txt
```

## 🔧 Setup & Installation

### 1. MongoDB Atlas
1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Get your connection string — it looks like:
   `mongodb+srv://<user>:<password>@cluster0.mongodb.net/timmytails`
3. Add `0.0.0.0/0` to your IP Allowlist (or your server IP)

### 2. Backend (Express.js)

```bash
cd backend-express
npm install

# Create .env from example
cp .env.example .env
# Edit .env and fill in MONGODB_URI and JWT_SECRET

npm run dev   # development (nodemon)
# or
npm start     # production
```

Environment variables (`.env`):
```
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/timmytails
JWT_SECRET=<random_long_secret>
JWT_EXPIRE=7d
ML_SERVICE_URL=http://localhost:5001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
TEXTBEE_API_KEY=<your_textbee_api_key>
TEXTBEE_DEVICE_ID=<your_textbee_device_id>
# optional for local dev logging fallback only
# TEXTBEE_LOG_ONLY=true
```

### 3. ML Service (Flask)

```bash
cd ml-service-flask

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
python app.py   # runs on port 5001
```

### 4. Frontend (React)

```bash
cd appml
npm install

cp .env.example .env
# .env contents:
# VITE_API_URL=http://localhost:5000/api
# VITE_ML_URL=http://localhost:5001

npm run dev   # runs on port 5173
```

## 🔑 Create Admin Account

After starting the backend, register a normal user, then update the role in MongoDB Atlas:
```
db.users.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } })
```
Then login with that account — the header will show "Admin" link.

## 📡 API Reference

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register/send-otp` | Send OTP for signup |
| POST | `/api/auth/register` | Verify OTP and create user |
| POST | `/api/auth/login` | Login and get JWT |
| POST | `/api/auth/password/send-otp` | Send OTP for password reset |
| POST | `/api/auth/password/reset` | Reset password with OTP |
| GET | `/api/auth/me` | Get current user (requires JWT) |

### Appointments
| Method | Path | Description |
|---|---|---|
| POST | `/api/appointments` | Create appointment |
| GET | `/api/appointments/availability?date=YYYY-MM-DD` | Get booked slots |
| GET | `/api/appointments/my` | User's appointments (JWT) |
| DELETE | `/api/appointments/:id` | Cancel appointment (JWT) |

### ML Service
| Method | Path | Description |
|---|---|---|
| GET/POST | `/recommend?breed=Poodle&season=rainy` | Get dataset-trained recommendations |
| POST | `/forecast/sales` | Train/evaluate and forecast next-month sales |
| GET | `/model-info` | Get model, feature, and dataset metadata |
| GET | `/season` | Current season |
| GET | `/breeds` | List all breeds |

### Contact
| Method | Path | Description |
|---|---|---|
| POST | `/api/contact` | Submit contact message |

### Admin (requires admin JWT)
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/stats` | Dashboard stats |
| GET | `/api/admin/appointments?status=&date=&page=&limit=` | All appointments (paginated, max 100/page) |
| PATCH | `/api/admin/appointments/:id/status` | Update status |
| GET | `/api/admin/analytics` | Revenue + trends |
| GET | `/api/admin/contacts` | All contact messages |
| GET | `/api/admin/notifications` | List user notifications |
| POST | `/api/admin/notifications` | Send notification to users |

### Notifications (requires user JWT)
| Method | Path | Description |
|---|---|---|
| GET | `/api/notifications` | Get user notifications |
| PATCH | `/api/notifications/:id/read` | Mark notification as read |

## 📧 Contact

For issues or questions, reach out to admin@timmytails.com

## 📄 License

MIT License


## AI/ML Upgrade Details

See [`AI_ML_UPGRADE.md`](./AI_ML_UPGRADE.md) for datasets, model logic, validation, fallback behavior, endpoints, and deployment notes.
