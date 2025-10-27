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
    assigned_technician_id: Optional[str] = None
    checklist: Optional[dict] = None
    incident_reports: Optional[List[dict]] = None
    customer_signature: Optional[str] = None
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

@api_router.put("/addresses/{address_id}", response_model=Address)
async def update_address(address_id: str, address_data: AddressCreate, user_id: str = Depends(get_current_user)):
    # Verify address belongs to user
    existing = await db.addresses.find_one({"id": address_id, "user_id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Address not found")
    
    # Update address
    update_dict = address_data.model_dump()
    await db.addresses.update_one(
        {"id": address_id, "user_id": user_id},
        {"$set": update_dict}
    )
    
    # Return updated address
    updated_address = await db.addresses.find_one({"id": address_id}, {"_id": 0})
    if isinstance(updated_address.get('created_at'), str):
        updated_address['created_at'] = datetime.fromisoformat(updated_address['created_at'])
    
    return updated_address

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

# Field Team Models
class FieldTeamRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str
    employee_id: str

class FieldTeamLogin(BaseModel):
    email: EmailStr
    password: str

class FieldTeam(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    phone: str
    employee_id: str
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChecklistUpdate(BaseModel):
    step_name: str
    status: str  # completed/pending/na/escalate
    notes: Optional[str] = None
    photo_url: Optional[str] = None
    timestamp: Optional[str] = None

class IncidentReport(BaseModel):
    description: str
    severity: str  # low/medium/high/critical
    photo_urls: Optional[List[str]] = None
    unable_to_proceed: bool = False

class JobCompletion(BaseModel):
    before_photo_urls: List[str]
    after_photo_urls: List[str]
    customer_signature: str
    notes: Optional[str] = None

# Field Team Routes
@api_router.post("/field/register")
async def register_field_team(team_data: FieldTeamRegister):
    # Check if team member exists
    existing = await db.field_teams.find_one({"email": team_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create field team member
    team_member = FieldTeam(
        email=team_data.email,
        name=team_data.name,
        phone=team_data.phone,
        employee_id=team_data.employee_id
    )
    
    team_dict = team_member.model_dump()
    team_dict['password'] = hash_password(team_data.password)
    team_dict['created_at'] = team_dict['created_at'].isoformat()
    
    await db.field_teams.insert_one(team_dict)
    
    return {"message": "Field team member registered successfully"}

@api_router.post("/field/login")
async def field_login(credentials: FieldTeamLogin):
    team_member = await db.field_teams.find_one({"email": credentials.email})
    if not team_member or not verify_password(credentials.password, team_member['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not team_member.get('active', True):
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    token = create_jwt_token(team_member['id'])
    
    return {
        "token": token,
        "user": {
            "id": team_member['id'],
            "email": team_member['email'],
            "name": team_member['name'],
            "phone": team_member['phone'],
            "employee_id": team_member['employee_id'],
            "role": "field_team"
        }
    }

async def get_current_field_team(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        team_id = payload.get("user_id")
        if not team_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return team_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@api_router.get("/field/me")
async def get_field_me(team_id: str = Depends(get_current_field_team)):
    team_member = await db.field_teams.find_one({"id": team_id}, {"_id": 0, "password": 0})
    if not team_member:
        raise HTTPException(status_code=404, detail="Team member not found")
    return team_member

@api_router.get("/field/jobs")
async def get_field_jobs(team_id: str = Depends(get_current_field_team)):
    # Get jobs assigned to this technician
    jobs = await db.bookings.find({
        "assigned_technician_id": team_id,
        "status": {"$in": ["confirmed", "in-progress"]}
    }, {"_id": 0}).sort("service_date", 1).to_list(100)
    
    # Convert datetime strings
    for job in jobs:
        if isinstance(job.get('created_at'), str):
            job['created_at'] = datetime.fromisoformat(job['created_at'])
    
    return jobs

@api_router.get("/field/jobs/{job_id}")
async def get_field_job(job_id: str, team_id: str = Depends(get_current_field_team)):
    job = await db.bookings.find_one({
        "id": job_id,
        "assigned_technician_id": team_id
    }, {"_id": 0})
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get address details
    address = await db.addresses.find_one({"id": job['address_id']}, {"_id": 0})
    
    # Get customer details
    customer = await db.users.find_one({"id": job['user_id']}, {"_id": 0, "password": 0})
    
    if isinstance(job.get('created_at'), str):
        job['created_at'] = datetime.fromisoformat(job['created_at'])
    
    return {
        "job": job,
        "address": address,
        "customer": customer
    }

@api_router.post("/field/jobs/{job_id}/start")
async def start_job(job_id: str, team_id: str = Depends(get_current_field_team)):
    job = await db.bookings.find_one({"id": job_id, "assigned_technician_id": team_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Initialize checklist
    checklist = {
        "started_at": datetime.now(timezone.utc).isoformat(),
        "steps": {
            "arrival": {"status": "pending", "timestamp": None, "photos": [], "notes": ""},
            "customer_verification": {"status": "pending", "timestamp": None, "photos": [], "notes": ""},
            "pre_inspection": {"status": "pending", "timestamp": None, "photos": [], "notes": ""},
            "drain": {"status": "pending", "timestamp": None, "photos": [], "notes": ""},
            "scrub": {"status": "pending", "timestamp": None, "photos": [], "notes": ""},
            "high_pressure_clean": {"status": "pending", "timestamp": None, "photos": [], "notes": ""},
            "disinfection": {"status": "pending", "timestamp": None, "photos": [], "notes": ""},
            "final_rinse": {"status": "pending", "timestamp": None, "photos": [], "notes": ""}
        },
        "chemicals_used": [],
        "water_usage": 0
    }
    
    await db.bookings.update_one(
        {"id": job_id},
        {"$set": {
            "status": "in-progress",
            "checklist": checklist,
            "started_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Job started successfully", "checklist": checklist}

@api_router.put("/field/jobs/{job_id}/checklist")
async def update_checklist(
    job_id: str,
    update: ChecklistUpdate,
    team_id: str = Depends(get_current_field_team)
):
    job = await db.bookings.find_one({"id": job_id, "assigned_technician_id": team_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Update checklist step
    update_data = {
        f"checklist.steps.{update.step_name}.status": update.status,
        f"checklist.steps.{update.step_name}.timestamp": update.timestamp or datetime.now(timezone.utc).isoformat()
    }
    
    if update.notes:
        update_data[f"checklist.steps.{update.step_name}.notes"] = update.notes
    
    if update.photo_url:
        # Add photo to array
        await db.bookings.update_one(
            {"id": job_id},
            {"$push": {f"checklist.steps.{update.step_name}.photos": update.photo_url}}
        )
    
    await db.bookings.update_one(
        {"id": job_id},
        {"$set": update_data}
    )
    
    return {"message": "Checklist updated successfully"}

@api_router.post("/field/jobs/{job_id}/incident")
async def report_incident(
    job_id: str,
    incident: IncidentReport,
    team_id: str = Depends(get_current_field_team)
):
    job = await db.bookings.find_one({"id": job_id, "assigned_technician_id": team_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    incident_data = {
        "id": str(uuid.uuid4()),
        "description": incident.description,
        "severity": incident.severity,
        "photo_urls": incident.photo_urls or [],
        "unable_to_proceed": incident.unable_to_proceed,
        "reported_at": datetime.now(timezone.utc).isoformat(),
        "reported_by": team_id
    }
    
    await db.bookings.update_one(
        {"id": job_id},
        {"$push": {"incident_reports": incident_data}}
    )
    
    # If unable to proceed, mark job status
    if incident.unable_to_proceed:
        await db.bookings.update_one(
            {"id": job_id},
            {"$set": {"status": "escalated"}}
        )
    
    return {"message": "Incident reported successfully", "incident_id": incident_data["id"]}

@api_router.post("/field/jobs/{job_id}/complete")
async def complete_job(
    job_id: str,
    completion: JobCompletion,
    team_id: str = Depends(get_current_field_team)
):
    job = await db.bookings.find_one({"id": job_id, "assigned_technician_id": team_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    await db.bookings.update_one(
        {"id": job_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "before_photos": completion.before_photo_urls,
            "after_photos": completion.after_photo_urls,
            "customer_signature": completion.customer_signature,
            "completion_notes": completion.notes or ""
        }}
    )
    
    return {"message": "Job completed successfully"}

@api_router.get("/field/stats")
async def get_field_stats(team_id: str = Depends(get_current_field_team)):
    # Get today's date
    today = datetime.now(timezone.utc).date().isoformat()
    
    # Count jobs
    total_jobs = await db.bookings.count_documents({"assigned_technician_id": team_id})
    today_jobs = await db.bookings.count_documents({
        "assigned_technician_id": team_id,
        "service_date": today
    })
    completed_today = await db.bookings.count_documents({
        "assigned_technician_id": team_id,
        "service_date": today,
        "status": "completed"
    })
    in_progress = await db.bookings.count_documents({
        "assigned_technician_id": team_id,
        "status": "in-progress"
    })
    
    return {
        "total_jobs": total_jobs,
        "today_jobs": today_jobs,
        "completed_today": completed_today,
        "in_progress": in_progress
    }

# Admin Models
class AdminRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "admin"

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class Admin(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    role: str = "admin"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AssignTechnician(BaseModel):
    technician_id: str

class UpdateBookingStatus(BaseModel):
    status: str

# Admin Routes
@api_router.post("/admin/register")
async def register_admin(admin_data: AdminRegister):
    # Check if admin exists
    existing = await db.admins.find_one({"email": admin_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    admin = Admin(
        email=admin_data.email,
        name=admin_data.name,
        role=admin_data.role
    )
    
    admin_dict = admin.model_dump()
    admin_dict['password'] = hash_password(admin_data.password)
    admin_dict['created_at'] = admin_dict['created_at'].isoformat()
    
    await db.admins.insert_one(admin_dict)
    
    return {"message": "Admin registered successfully"}

@api_router.post("/admin/login")
async def admin_login(credentials: AdminLogin):
    admin = await db.admins.find_one({"email": credentials.email})
    if not admin or not verify_password(credentials.password, admin['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(admin['id'])
    
    return {
        "token": token,
        "user": {
            "id": admin['id'],
            "email": admin['email'],
            "name": admin['name'],
            "role": admin.get('role', 'admin')
        }
    }

async def get_current_admin(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        admin_id = payload.get("user_id")
        if not admin_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Verify admin exists
        admin = await db.admins.find_one({"id": admin_id})
        if not admin:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        return admin_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@api_router.get("/admin/me")
async def get_admin_me(admin_id: str = Depends(get_current_admin)):
    admin = await db.admins.find_one({"id": admin_id}, {"_id": 0, "password": 0})
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    return admin

@api_router.get("/admin/dashboard-stats")
async def get_admin_dashboard_stats(admin_id: str = Depends(get_current_admin)):
    # Get overall statistics
    total_customers = await db.users.count_documents({})
    total_technicians = await db.field_teams.count_documents({})
    total_bookings = await db.bookings.count_documents({})
    
    # Today's stats
    today = datetime.now(timezone.utc).date().isoformat()
    today_bookings = await db.bookings.count_documents({"service_date": today})
    
    # Status breakdown
    pending_bookings = await db.bookings.count_documents({"status": "pending"})
    confirmed_bookings = await db.bookings.count_documents({"status": "confirmed"})
    in_progress_bookings = await db.bookings.count_documents({"status": "in-progress"})
    completed_bookings = await db.bookings.count_documents({"status": "completed"})
    
    # Revenue calculation (completed bookings)
    completed_jobs = await db.bookings.find({"payment_status": "completed"}, {"_id": 0, "amount": 1}).to_list(10000)
    total_revenue = sum(job.get("amount", 0) for job in completed_jobs)
    
    # Recent bookings
    recent_bookings = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    for booking in recent_bookings:
        if isinstance(booking.get('created_at'), str):
            booking['created_at'] = datetime.fromisoformat(booking['created_at'])
    
    return {
        "total_customers": total_customers,
        "total_technicians": total_technicians,
        "total_bookings": total_bookings,
        "today_bookings": today_bookings,
        "pending_bookings": pending_bookings,
        "confirmed_bookings": confirmed_bookings,
        "in_progress_bookings": in_progress_bookings,
        "completed_bookings": completed_bookings,
        "total_revenue": total_revenue,
        "recent_bookings": recent_bookings
    }

@api_router.get("/admin/bookings")
async def get_all_bookings(
    status: Optional[str] = None,
    admin_id: str = Depends(get_current_admin)
):
    # Build filter
    filter_query = {}
    if status:
        filter_query["status"] = status
    
    bookings = await db.bookings.find(filter_query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Enrich with customer and technician info
    for booking in bookings:
        if isinstance(booking.get('created_at'), str):
            booking['created_at'] = datetime.fromisoformat(booking['created_at'])
        
        # Get customer info
        customer = await db.users.find_one({"id": booking['user_id']}, {"_id": 0, "password": 0})
        booking['customer'] = customer
        
        # Get technician info if assigned
        if booking.get('assigned_technician_id'):
            technician = await db.field_teams.find_one(
                {"id": booking['assigned_technician_id']}, 
                {"_id": 0, "password": 0}
            )
            booking['technician'] = technician
        
        # Get address info
        address = await db.addresses.find_one({"id": booking['address_id']}, {"_id": 0})
        booking['address'] = address
    
    return bookings

@api_router.put("/admin/bookings/{booking_id}/assign")
async def assign_technician_to_booking(
    booking_id: str,
    data: AssignTechnician,
    admin_id: str = Depends(get_current_admin)
):
    # Verify technician exists
    technician = await db.field_teams.find_one({"id": data.technician_id})
    if not technician:
        raise HTTPException(status_code=404, detail="Technician not found")
    
    # Verify booking exists
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Assign technician
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"assigned_technician_id": data.technician_id}}
    )
    
    return {"message": "Technician assigned successfully"}

@api_router.put("/admin/bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    data: UpdateBookingStatus,
    admin_id: str = Depends(get_current_admin)
):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": data.status}}
    )
    
    return {"message": "Booking status updated successfully"}

@api_router.put("/admin/bookings/{booking_id}/reschedule")
async def reschedule_booking(
    booking_id: str,
    service_date: str,
    service_time: str,
    admin_id: str = Depends(get_current_admin)
):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "service_date": service_date,
            "service_time": service_time
        }}
    )
    
    return {"message": "Booking rescheduled successfully"}

@api_router.post("/admin/bookings/create")
async def create_booking_admin(
    booking_data: BookingCreate,
    user_id: str,
    admin_id: str = Depends(get_current_admin)
):
    """Admin can create booking for any customer"""
    # Verify customer exists
    customer = await db.users.find_one({"id": user_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Verify address belongs to customer
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

@api_router.delete("/admin/bookings/{booking_id}")
async def cancel_booking_admin(
    booking_id: str,
    admin_id: str = Depends(get_current_admin)
):
    """Admin can cancel any booking"""
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": "cancelled"}}
    )
    
    return {"message": "Booking cancelled successfully"}

@api_router.get("/admin/customers")
async def get_all_customers(admin_id: str = Depends(get_current_admin)):
    customers = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    
    for customer in customers:
        if isinstance(customer.get('created_at'), str):
            customer['created_at'] = datetime.fromisoformat(customer['created_at'])
        
        # Get booking count for each customer
        booking_count = await db.bookings.count_documents({"user_id": customer['id']})
        customer['total_bookings'] = booking_count
    
    return customers

@api_router.get("/admin/field-teams")
async def get_all_field_teams(admin_id: str = Depends(get_current_admin)):
    teams = await db.field_teams.find({}, {"_id": 0, "password": 0}).to_list(1000)
    
    for team in teams:
        if isinstance(team.get('created_at'), str):
            team['created_at'] = datetime.fromisoformat(team['created_at'])
        
        # Get job counts
        total_jobs = await db.bookings.count_documents({"assigned_technician_id": team['id']})
        completed_jobs = await db.bookings.count_documents({
            "assigned_technician_id": team['id'],
            "status": "completed"
        })
        team['total_jobs'] = total_jobs
        team['completed_jobs'] = completed_jobs
    
    return teams

@api_router.get("/admin/incidents")
async def get_all_incidents(admin_id: str = Depends(get_current_admin)):
    # Get all bookings with incidents
    bookings_with_incidents = await db.bookings.find(
        {"incident_reports": {"$exists": True, "$ne": []}},
        {"_id": 0}
    ).to_list(1000)
    
    incidents = []
    for booking in bookings_with_incidents:
        for incident in booking.get('incident_reports', []):
            incidents.append({
                "booking_id": booking['id'],
                "service_date": booking['service_date'],
                "tank_type": booking['tank_type'],
                "incident": incident
            })
    
    return incidents

@api_router.get("/admin/analytics")
async def get_analytics(admin_id: str = Depends(get_current_admin)):
    # Revenue by month (last 6 months)
    from datetime import timedelta
    six_months_ago = (datetime.now(timezone.utc) - timedelta(days=180)).date().isoformat()
    
    recent_bookings = await db.bookings.find(
        {"created_at": {"$gte": six_months_ago}},
        {"_id": 0, "amount": 1, "payment_status": 1, "service_date": 1, "package_type": 1}
    ).to_list(10000)
    
    # Calculate metrics
    revenue_by_package = {}
    for booking in recent_bookings:
        if booking.get('payment_status') == 'completed':
            pkg = booking.get('package_type', 'unknown')
            revenue_by_package[pkg] = revenue_by_package.get(pkg, 0) + booking.get('amount', 0)
    
    # Average booking value
    completed_amounts = [b.get('amount', 0) for b in recent_bookings if b.get('payment_status') == 'completed']
    avg_booking_value = sum(completed_amounts) / len(completed_amounts) if completed_amounts else 0
    
    return {
        "revenue_by_package": revenue_by_package,
        "average_booking_value": avg_booking_value,
        "total_bookings_6months": len(recent_bookings),
        "completed_bookings_6months": len([b for b in recent_bookings if b.get('payment_status') == 'completed'])
    }

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