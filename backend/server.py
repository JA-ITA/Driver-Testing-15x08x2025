from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import base64
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Island Traffic Authority Driver's License Testing System")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security settings
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# User roles
USER_ROLES = [
    "Candidate",
    "Driver Assessment Officer", 
    "Manager",
    "Administrator",
    "Regional Director"
]

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def serialize_doc(doc):
    """Convert MongoDB document to JSON serializable format"""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == '_id':
                continue  # Skip MongoDB _id field
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, dict):
                result[key] = serialize_doc(value)
            elif isinstance(value, list):
                result[key] = serialize_doc(value)
            else:
                result[key] = value
        return result
    return doc

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return user

# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class CandidateProfile(BaseModel):
    full_name: str
    date_of_birth: str
    home_address: str
    trn: str
    photograph: Optional[str] = None  # Base64 encoded image

class CandidateCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    date_of_birth: str
    home_address: str
    trn: str
    photograph: Optional[str] = None

class CandidateUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    home_address: Optional[str] = None
    trn: Optional[str] = None
    photograph: Optional[str] = None

class ApprovalAction(BaseModel):
    candidate_id: str
    action: str  # "approve" or "reject"
    notes: Optional[str] = None

# Authentication routes
@api_router.post("/auth/register", response_model=dict)
async def register_user(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    if user_data.role not in USER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role"
        )
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user document
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "hashed_password": hashed_password,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    await db.users.insert_one(user_doc)
    
    return {"message": "User registered successfully", "user_id": user_doc["id"]}

@api_router.post("/auth/login", response_model=Token)
async def login_user(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    
    user_data = {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"]
    }
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_data
    }

@api_router.get("/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "role": current_user["role"]
    }

# Candidate routes
@api_router.post("/candidates/register")
async def register_candidate(candidate_data: CandidateCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": candidate_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_password = get_password_hash(candidate_data.password)
    
    candidate_id = str(uuid.uuid4())
    
    # Create user document
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": candidate_data.email,
        "hashed_password": hashed_password,
        "full_name": candidate_data.full_name,
        "role": "Candidate",
        "created_at": datetime.utcnow(),
        "is_active": True,
        "candidate_id": candidate_id
    }
    
    # Create candidate profile document
    candidate_doc = {
        "id": candidate_id,
        "user_id": user_doc["id"],
        "email": candidate_data.email,
        "full_name": candidate_data.full_name,
        "date_of_birth": candidate_data.date_of_birth,
        "home_address": candidate_data.home_address,
        "trn": candidate_data.trn,
        "photograph": candidate_data.photograph,
        "status": "pending",  # pending, approved, rejected
        "created_at": datetime.utcnow(),
        "approved_by": None,
        "approved_at": None,
        "approval_notes": None
    }
    
    await db.users.insert_one(user_doc)
    await db.candidates.insert_one(candidate_doc)
    
    return {"message": "Candidate registered successfully", "candidate_id": candidate_id}

@api_router.get("/candidates")
async def get_candidates(current_user: dict = Depends(get_current_user)):
    # Only Officers, Managers, Administrators, and Regional Directors can view candidates
    if current_user["role"] not in ["Driver Assessment Officer", "Manager", "Administrator", "Regional Director"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view candidates"
        )
    
    candidates = await db.candidates.find().to_list(1000)
    return serialize_doc(candidates)

@api_router.get("/candidates/pending")
async def get_pending_candidates(current_user: dict = Depends(get_current_user)):
    # Only Officers, Managers, Administrators, and Regional Directors can view pending candidates
    if current_user["role"] not in ["Driver Assessment Officer", "Manager", "Administrator", "Regional Director"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view pending candidates"
        )
    
    candidates = await db.candidates.find({"status": "pending"}).to_list(1000)
    return serialize_doc(candidates)

@api_router.get("/candidates/my-profile")
async def get_my_candidate_profile(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only candidates can access this endpoint"
        )
    
    candidate = await db.candidates.find_one({"email": current_user["email"]})
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found"
        )
    
    return candidate

@api_router.put("/candidates/my-profile")
async def update_my_candidate_profile(
    profile_data: CandidateUpdate,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "Candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only candidates can update their profile"
        )
    
    # Build update document
    update_data = {}
    if profile_data.full_name is not None:
        update_data["full_name"] = profile_data.full_name
    if profile_data.date_of_birth is not None:
        update_data["date_of_birth"] = profile_data.date_of_birth
    if profile_data.home_address is not None:
        update_data["home_address"] = profile_data.home_address
    if profile_data.trn is not None:
        update_data["trn"] = profile_data.trn
    if profile_data.photograph is not None:
        update_data["photograph"] = profile_data.photograph
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.candidates.update_one(
            {"email": current_user["email"]},
            {"$set": update_data}
        )
    
    return {"message": "Profile updated successfully"}

@api_router.post("/candidates/approve")
async def approve_reject_candidate(
    approval_data: ApprovalAction,
    current_user: dict = Depends(get_current_user)
):
    # Only Officers, Managers, Administrators, and Regional Directors can approve candidates
    if current_user["role"] not in ["Driver Assessment Officer", "Manager", "Administrator", "Regional Director"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to approve candidates"
        )
    
    if approval_data.action not in ["approve", "reject"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action must be 'approve' or 'reject'"
        )
    
    candidate = await db.candidates.find_one({"id": approval_data.candidate_id})
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )
    
    update_data = {
        "status": "approved" if approval_data.action == "approve" else "rejected",
        "approved_by": current_user["email"],
        "approved_at": datetime.utcnow(),
        "approval_notes": approval_data.notes
    }
    
    await db.candidates.update_one(
        {"id": approval_data.candidate_id},
        {"$set": update_data}
    )
    
    return {"message": f"Candidate {approval_data.action}d successfully"}

# Dashboard stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    stats = {}
    
    if current_user["role"] == "Candidate":
        candidate = await db.candidates.find_one({"email": current_user["email"]})
        stats = {
            "profile_status": candidate["status"] if candidate else "not_found"
        }
    else:
        # For staff roles, show system stats
        total_candidates = await db.candidates.count_documents({})
        pending_candidates = await db.candidates.count_documents({"status": "pending"})
        approved_candidates = await db.candidates.count_documents({"status": "approved"})
        rejected_candidates = await db.candidates.count_documents({"status": "rejected"})
        
        stats = {
            "total_candidates": total_candidates,
            "pending_candidates": pending_candidates,
            "approved_candidates": approved_candidates,
            "rejected_candidates": rejected_candidates
        }
    
    return stats

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()