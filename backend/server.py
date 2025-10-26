from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import random
import razorpay

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 720  # 30 days

# Razorpay client
razorpay_client = razorpay.Client(
    auth=(os.environ.get('RAZORPAY_KEY_ID', ''), os.environ.get('RAZORPAY_KEY_SECRET', ''))
)

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class SendOTP(BaseModel):
    email: EmailStr

class VerifyOTP(BaseModel):
    email: EmailStr
    otp: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    phone: str
    verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Address(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str  # e.g., "Home", "Office"
    address_line: str
    landmark: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AddressCreate(BaseModel):
    name: str
    address_line: str
    landmark: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class BookingCreate(BaseModel):
    address_id: str
    tank_type: str  # overhead/underground/other
    tank_capacity: str
    tank_photo_url: Optional[str] = None
    service_date: str
    service_time: str
    package_type: str  # manual/automated
    add_disinfection: bool = False
    add_maintenance: bool = False
    add_repair: bool = False
    payment_method: str  # upi/card/wallet/cod

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    address_id: str
    tank_type: str
    tank_capacity: str
    tank_photo_url: Optional[str] = None
    service_date: str
    service_time: str
    package_type: str
    add_disinfection: bool = False
    add_maintenance: bool = False
    add_repair: bool = False
    payment_method: str
    status: str = "pending"  # pending/confirmed/in-progress/completed/cancelled
    amount: int  # in paise
    razorpay_order_id: Optional[str] = None
    payment_status: str = "pending"  # pending/completed/failed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentOrder(BaseModel):
    booking_id: str

class VerifyPayment(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    booking_id: str

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_jwt_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "user_id": user_id,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def calculate_booking_amount(booking_data: BookingCreate) -> int:
    """Calculate booking amount in paise"""
    base_price = 150000  # Rs 1500
    if booking_data.package_type == "automated":
        base_price = 250000  # Rs 2500
    
    if booking_data.add_disinfection:
        base_price += 50000  # Rs 500
    if booking_data.add_maintenance:
        base_price += 75000  # Rs 750
    if booking_data.add_repair:
        base_price += 100000  # Rs 1000
    
    return base_price

# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        phone=user_data.phone,
        verified=False
    )
    
    user_dict = user.model_dump()
    user_dict['password'] = hash_password(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    return {"message": "User registered successfully", "email": user.email}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user['id'])
    
    return {
        "token": token,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "name": user['name'],
            "phone": user['phone'],
            "verified": user.get('verified', False)
        }
    }

@api_router.post("/auth/send-otp")
async def send_otp(data: SendOTP):
    # Generate OTP
    otp = str(random.randint(100000, 999999))
    expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Store OTP in database
    await db.otps.update_one(
        {"email": data.email},
        {"$set": {
            "otp": otp,
            "expiry": expiry.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # In production, send email here
    logging.info(f"OTP for {data.email}: {otp}")
    
    return {"message": "OTP sent successfully", "otp": otp}  # Remove otp in production

@api_router.post("/auth/verify-otp")
async def verify_otp(data: VerifyOTP):
    otp_record = await db.otps.find_one({"email": data.email})
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="OTP not found")
    
    expiry = datetime.fromisoformat(otp_record['expiry'])
    if datetime.now(timezone.utc) > expiry:
        raise HTTPException(status_code=400, detail="OTP expired")
    
    if otp_record['otp'] != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Update user as verified
    await db.users.update_one(
        {"email": data.email},
        {"$set": {"verified": True}}
    )
    
    # Delete OTP
    await db.otps.delete_one({"email": data.email})
    
    return {"message": "Email verified successfully"}

@api_router.get("/auth/me")
async def get_me(user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Address Routes
@api_router.post("/addresses", response_model=Address)
async def create_address(address_data: AddressCreate, user_id: str = Depends(get_current_user)):
    address = Address(
        user_id=user_id,
        **address_data.model_dump()
    )
    
    address_dict = address.model_dump()
    address_dict['created_at'] = address_dict['created_at'].isoformat()
    
    await db.addresses.insert_one(address_dict)
    return address

@api_router.get("/addresses", response_model=List[Address])
async def get_addresses(user_id: str = Depends(get_current_user)):
    addresses = await db.addresses.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    for addr in addresses:
        if isinstance(addr['created_at'], str):
            addr['created_at'] = datetime.fromisoformat(addr['created_at'])
    
    return addresses

@api_router.delete("/addresses/{address_id}")
async def delete_address(address_id: str, user_id: str = Depends(get_current_user)):
    result = await db.addresses.delete_one({"id": address_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
    return {"message": "Address deleted successfully"}

# Booking Routes
@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate, user_id: str = Depends(get_current_user)):
    # Verify address belongs to user
    address = await db.addresses.find_one({"id": booking_data.address_id, "user_id": user_id})
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    # Calculate amount
    amount = calculate_booking_amount(booking_data)
    
    booking = Booking(
        user_id=user_id,
        amount=amount,
        **booking_data.model_dump()
    )
    
    booking_dict = booking.model_dump()
    booking_dict['created_at'] = booking_dict['created_at'].isoformat()
    
    await db.bookings.insert_one(booking_dict)
    return booking

@api_router.get("/bookings", response_model=List[Booking])
async def get_bookings(user_id: str = Depends(get_current_user)):
    bookings = await db.bookings.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for booking in bookings:
        if isinstance(booking['created_at'], str):
            booking['created_at'] = datetime.fromisoformat(booking['created_at'])
    
    return bookings

@api_router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str, user_id: str = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id, "user_id": user_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if isinstance(booking['created_at'], str):
        booking['created_at'] = datetime.fromisoformat(booking['created_at'])
    
    return booking

# Payment Routes
@api_router.post("/payments/create-order")
async def create_payment_order(data: PaymentOrder, user_id: str = Depends(get_current_user)):
    # Get booking
    booking = await db.bookings.find_one({"id": data.booking_id, "user_id": user_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check if payment is COD
    if booking['payment_method'] == 'cod':
        # For COD, just mark as confirmed
        await db.bookings.update_one(
            {"id": data.booking_id},
            {"$set": {"status": "confirmed", "payment_status": "pending"}}
        )
        return {"payment_method": "cod", "message": "Booking confirmed"}
    
    # Create Razorpay order
    try:
        razorpay_order = razorpay_client.order.create({
            "amount": booking['amount'],
            "currency": "INR",
            "payment_capture": 1
        })
        
        # Update booking with order_id
        await db.bookings.update_one(
            {"id": data.booking_id},
            {"$set": {"razorpay_order_id": razorpay_order['id']}}
        )
        
        return {
            "order_id": razorpay_order['id'],
            "amount": razorpay_order['amount'],
            "currency": razorpay_order['currency'],
            "key_id": os.environ.get('RAZORPAY_KEY_ID', '')
        }
    except Exception as e:
        logging.error(f"Razorpay order creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment order creation failed")

@api_router.post("/payments/verify")
async def verify_payment(data: VerifyPayment, user_id: str = Depends(get_current_user)):
    try:
        # Verify signature
        params_dict = {
            'razorpay_order_id': data.razorpay_order_id,
            'razorpay_payment_id': data.razorpay_payment_id,
            'razorpay_signature': data.razorpay_signature
        }
        
        razorpay_client.utility.verify_payment_signature(params_dict)
        
        # Update booking
        await db.bookings.update_one(
            {"id": data.booking_id, "user_id": user_id},
            {"$set": {
                "payment_status": "completed",
                "status": "confirmed"
            }}
        )
        
        return {"message": "Payment verified successfully"}
    except Exception as e:
        logging.error(f"Payment verification failed: {str(e)}")
        await db.bookings.update_one(
            {"id": data.booking_id, "user_id": user_id},
            {"$set": {"payment_status": "failed"}}
        )
        raise HTTPException(status_code=400, detail="Payment verification failed")

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()