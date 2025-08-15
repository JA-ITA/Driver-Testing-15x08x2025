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

# Question Bank Models
class TestCategory(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class QuestionOption(BaseModel):
    text: str
    is_correct: bool = False

class QuestionCreate(BaseModel):
    category_id: str
    question_type: str  # "multiple_choice", "true_false", "video_embedded"
    question_text: str
    options: Optional[List[QuestionOption]] = None  # For multiple choice
    correct_answer: Optional[bool] = None  # For true/false
    video_url: Optional[str] = None  # For video-embedded questions
    explanation: Optional[str] = None
    difficulty: str = "medium"  # "easy", "medium", "hard"

class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    options: Optional[List[QuestionOption]] = None
    correct_answer: Optional[bool] = None
    video_url: Optional[str] = None
    explanation: Optional[str] = None
    difficulty: Optional[str] = None

class QuestionApproval(BaseModel):
    question_id: str
    action: str  # "approve" or "reject"
    notes: Optional[str] = None

# =============================================================================
# PHASE 5: APPOINTMENT & VERIFICATION SYSTEM MODELS
# =============================================================================

# Appointment System Models
class TimeSlotConfig(BaseModel):
    start_time: str  # "09:00"
    end_time: str    # "10:00"
    max_capacity: int = 5
    is_active: bool = True

class ScheduleConfig(BaseModel):
    day_of_week: int  # 0=Monday, 6=Sunday
    time_slots: List[TimeSlotConfig]
    is_active: bool = True

class Holiday(BaseModel):
    date: str  # "2024-12-25"
    name: str
    description: Optional[str] = None

class AppointmentCreate(BaseModel):
    test_config_id: str
    appointment_date: str  # "2024-07-15"
    time_slot: str         # "09:00-10:00"
    test_type: str = "single_stage"  # "single_stage" or "multi_stage"
    notes: Optional[str] = None

class AppointmentUpdate(BaseModel):
    appointment_date: Optional[str] = None
    time_slot: Optional[str] = None
    status: Optional[str] = None  # "scheduled", "confirmed", "cancelled", "completed"
    notes: Optional[str] = None

class AppointmentReschedule(BaseModel):
    appointment_id: str
    new_date: str
    new_time_slot: str
    reason: Optional[str] = None

# Identity Verification Models
class VerificationPhoto(BaseModel):
    photo_data: str  # Base64 encoded image
    photo_type: str  # "id_document", "live_capture", "uploaded"
    notes: Optional[str] = None

class IdentityVerification(BaseModel):
    candidate_id: str
    appointment_id: str
    id_document_type: str  # "national_id", "passport", "drivers_license"
    id_document_number: str
    verification_photos: List[VerificationPhoto]
    photo_match_confirmed: bool
    id_document_match_confirmed: bool
    verification_notes: Optional[str] = None

class VerificationUpdate(BaseModel):
    id_document_type: Optional[str] = None
    id_document_number: Optional[str] = None
    photo_match_confirmed: Optional[bool] = None
    id_document_match_confirmed: Optional[bool] = None
    verification_notes: Optional[str] = None
    status: Optional[str] = None  # "pending", "verified", "failed"

# Enhanced Admin Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str
    is_active: bool = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class CandidateAdminCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    date_of_birth: str
    home_address: str
    trn: str
    photograph: Optional[str] = None
    status: str = "pending"  # "pending", "approved", "rejected"

class CandidateAdminUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    home_address: Optional[str] = None
    trn: Optional[str] = None
    photograph: Optional[str] = None
    status: Optional[str] = None
    is_deleted: Optional[bool] = None

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
    
    return serialize_doc(candidate)

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

# Test Categories routes
@api_router.post("/categories")
async def create_category(category_data: TestCategory, current_user: dict = Depends(get_current_user)):
    # Only Administrators can create categories
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create test categories"
        )
    
    category_doc = {
        "id": str(uuid.uuid4()),
        "name": category_data.name,
        "description": category_data.description,
        "is_active": category_data.is_active,
        "created_by": current_user["email"],
        "created_at": datetime.utcnow()
    }
    
    await db.test_categories.insert_one(category_doc)
    return {"message": "Category created successfully", "category_id": category_doc["id"]}

@api_router.get("/categories")
async def get_categories(current_user: dict = Depends(get_current_user)):
    # All authenticated users can view categories
    categories = await db.test_categories.find({"is_active": True}).to_list(1000)
    return serialize_doc(categories)

@api_router.put("/categories/{category_id}")
async def update_category(category_id: str, category_data: TestCategory, current_user: dict = Depends(get_current_user)):
    # Only Administrators can update categories
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update test categories"
        )
    
    update_data = {
        "name": category_data.name,
        "description": category_data.description,
        "is_active": category_data.is_active,
        "updated_by": current_user["email"],
        "updated_at": datetime.utcnow()
    }
    
    result = await db.test_categories.update_one(
        {"id": category_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    return {"message": "Category updated successfully"}

# Questions routes
@api_router.post("/questions")
async def create_question(question_data: QuestionCreate, current_user: dict = Depends(get_current_user)):
    # Only Officers, Managers, and Administrators can create questions
    if current_user["role"] not in ["Driver Assessment Officer", "Manager", "Administrator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create questions"
        )
    
    # Validate question type
    if question_data.question_type not in ["multiple_choice", "true_false", "video_embedded"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid question type"
        )
    
    # Validate category exists
    category = await db.test_categories.find_one({"id": question_data.category_id, "is_active": True})
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found or inactive"
        )
    
    # Validate question format
    if question_data.question_type == "multiple_choice":
        if not question_data.options or len(question_data.options) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Multiple choice questions must have at least 2 options"
            )
        correct_count = sum(1 for opt in question_data.options if opt.is_correct)
        if correct_count != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Multiple choice questions must have exactly one correct answer"
            )
    elif question_data.question_type == "true_false":
        if question_data.correct_answer is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="True/false questions must have a correct answer"
            )
    
    question_doc = {
        "id": str(uuid.uuid4()),
        "category_id": question_data.category_id,
        "category_name": category["name"],
        "question_type": question_data.question_type,
        "question_text": question_data.question_text,
        "options": [opt.dict() for opt in question_data.options] if question_data.options else None,
        "correct_answer": question_data.correct_answer,
        "video_url": question_data.video_url,
        "explanation": question_data.explanation,
        "difficulty": question_data.difficulty,
        "status": "pending",  # pending, approved, rejected
        "created_by": current_user["email"],
        "created_by_name": current_user["full_name"],
        "created_at": datetime.utcnow(),
        "approved_by": None,
        "approved_at": None,
        "approval_notes": None
    }
    
    await db.questions.insert_one(question_doc)
    return {"message": "Question created successfully", "question_id": question_doc["id"]}

@api_router.get("/questions")
async def get_questions(
    category_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # Build query filter
    query_filter = {}
    if category_id:
        query_filter["category_id"] = category_id
    if status:
        query_filter["status"] = status
    
    # Role-based filtering
    if current_user["role"] == "Candidate":
        # Candidates can only see approved questions
        query_filter["status"] = "approved"
    elif current_user["role"] in ["Driver Assessment Officer", "Manager"]:
        # Officers and Managers can see their own questions and approved ones
        if not status:  # If no status filter, show their own + approved
            questions = await db.questions.find({
                "$or": [
                    {"created_by": current_user["email"]},
                    {"status": "approved"}
                ],
                **query_filter
            }).to_list(1000)
            return serialize_doc(questions)
    
    questions = await db.questions.find(query_filter).to_list(1000)
    return serialize_doc(questions)

@api_router.get("/questions/pending")
async def get_pending_questions(current_user: dict = Depends(get_current_user)):
    # Only Regional Directors and Administrators can view pending questions for approval
    if current_user["role"] not in ["Regional Director", "Administrator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view pending questions"
        )
    
    questions = await db.questions.find({"status": "pending"}).to_list(1000)
    return serialize_doc(questions)

@api_router.put("/questions/{question_id}")
async def update_question(
    question_id: str,
    question_data: QuestionUpdate,
    current_user: dict = Depends(get_current_user)
):
    # Check if question exists and user can edit it
    question = await db.questions.find_one({"id": question_id})
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    # Only the creator or administrators can edit questions
    if question["created_by"] != current_user["email"] and current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to edit this question"
        )
    
    # Can only edit pending or rejected questions
    if question["status"] == "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot edit approved questions"
        )
    
    # Build update document
    update_data = {}
    if question_data.question_text is not None:
        update_data["question_text"] = question_data.question_text
    if question_data.options is not None:
        update_data["options"] = [opt.dict() for opt in question_data.options]
    if question_data.correct_answer is not None:
        update_data["correct_answer"] = question_data.correct_answer
    if question_data.video_url is not None:
        update_data["video_url"] = question_data.video_url
    if question_data.explanation is not None:
        update_data["explanation"] = question_data.explanation
    if question_data.difficulty is not None:
        update_data["difficulty"] = question_data.difficulty
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        update_data["status"] = "pending"  # Reset to pending after edit
        
        await db.questions.update_one(
            {"id": question_id},
            {"$set": update_data}
        )
    
    return {"message": "Question updated successfully"}

@api_router.post("/questions/approve")
async def approve_reject_question(
    approval_data: QuestionApproval,
    current_user: dict = Depends(get_current_user)
):
    # Only Regional Directors and Administrators can approve questions
    if current_user["role"] not in ["Regional Director", "Administrator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to approve questions"
        )
    
    if approval_data.action not in ["approve", "reject"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action must be 'approve' or 'reject'"
        )
    
    question = await db.questions.find_one({"id": approval_data.question_id})
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    update_data = {
        "status": "approved" if approval_data.action == "approve" else "rejected",
        "approved_by": current_user["email"],
        "approved_by_name": current_user["full_name"],
        "approved_at": datetime.utcnow(),
        "approval_notes": approval_data.notes
    }
    
    await db.questions.update_one(
        {"id": approval_data.question_id},
        {"$set": update_data}
    )
    
    return {"message": f"Question {approval_data.action}d successfully"}

@api_router.post("/questions/bulk-upload")
async def bulk_upload_questions(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # Only Officers, Managers, and Administrators can bulk upload
    if current_user["role"] not in ["Driver Assessment Officer", "Manager", "Administrator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to bulk upload questions"
        )
    
    if not file.filename.endswith(('.json', '.csv')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be JSON or CSV format"
        )
    
    try:
        content = await file.read()
        
        if file.filename.endswith('.json'):
            import json
            questions_data = json.loads(content.decode('utf-8'))
        else:
            # Handle CSV format
            import csv
            import io
            csv_content = content.decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(csv_content))
            questions_data = list(csv_reader)
        
        created_count = 0
        errors = []
        
        for idx, question_data in enumerate(questions_data):
            try:
                # Validate required fields
                required_fields = ['category_id', 'question_type', 'question_text']
                for field in required_fields:
                    if field not in question_data:
                        errors.append(f"Row {idx + 1}: Missing required field '{field}'")
                        continue
                
                # Create question document
                question_doc = {
                    "id": str(uuid.uuid4()),
                    "category_id": question_data['category_id'],
                    "question_type": question_data['question_type'],
                    "question_text": question_data['question_text'],
                    "options": question_data.get('options'),
                    "correct_answer": question_data.get('correct_answer'),
                    "video_url": question_data.get('video_url'),
                    "explanation": question_data.get('explanation'),
                    "difficulty": question_data.get('difficulty', 'medium'),
                    "status": "pending",
                    "created_by": current_user["email"],
                    "created_by_name": current_user["full_name"],
                    "created_at": datetime.utcnow(),
                    "approved_by": None,
                    "approved_at": None,
                    "approval_notes": None
                }
                
                await db.questions.insert_one(question_doc)
                created_count += 1
                
            except Exception as e:
                errors.append(f"Row {idx + 1}: {str(e)}")
        
        return {
            "message": f"Bulk upload completed. {created_count} questions created.",
            "created_count": created_count,
            "errors": errors
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error processing file: {str(e)}"
        )

# Question Bank Statistics
@api_router.get("/questions/stats")
async def get_question_stats(current_user: dict = Depends(get_current_user)):
    # Get question statistics
    total_questions = await db.questions.count_documents({})
    pending_questions = await db.questions.count_documents({"status": "pending"})
    approved_questions = await db.questions.count_documents({"status": "approved"})
    rejected_questions = await db.questions.count_documents({"status": "rejected"})
    
    # Get category breakdown
    pipeline = [
        {"$group": {"_id": "$category_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    category_stats = await db.questions.aggregate(pipeline).to_list(100)
    
    # Get questions by type
    type_pipeline = [
        {"$group": {"_id": "$question_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    type_stats = await db.questions.aggregate(type_pipeline).to_list(100)
    
    return {
        "total_questions": total_questions,
        "pending_questions": pending_questions,
        "approved_questions": approved_questions,
        "rejected_questions": rejected_questions,
        "by_category": serialize_doc(category_stats),
        "by_type": serialize_doc(type_stats)
    }

# =============================================================================
# TEST MANAGEMENT SYSTEM
# =============================================================================

# Test Configuration Models
class TestConfiguration(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: str
    total_questions: int = 20
    pass_mark_percentage: int = 75
    time_limit_minutes: int = 25
    is_active: bool = True
    difficulty_distribution: Optional[dict] = {"easy": 30, "medium": 50, "hard": 20}  # percentages

class TestConfigurationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    total_questions: Optional[int] = None
    pass_mark_percentage: Optional[int] = None
    time_limit_minutes: Optional[int] = None
    is_active: Optional[bool] = None
    difficulty_distribution: Optional[dict] = None

class TestSession(BaseModel):
    test_config_id: str
    candidate_id: str

class TestAnswer(BaseModel):
    question_id: str
    selected_option: Optional[str] = None  # For multiple choice (A, B, C, D)
    boolean_answer: Optional[bool] = None  # For true/false
    is_bookmarked: bool = False

class TestSubmission(BaseModel):
    session_id: str
    answers: List[TestAnswer]
    is_final_submission: bool = True

class TimeExtension(BaseModel):
    session_id: str
    additional_minutes: int
    reason: Optional[str] = None

# =============================================================================
# PHASE 6: MULTI-STAGE TESTING SYSTEM MODELS
# =============================================================================

# Multi-Stage Test Configuration Models
class MultiStageTestConfiguration(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: str
    # Stage 1: Written Test
    written_total_questions: int = 20
    written_pass_mark_percentage: int = 75
    written_time_limit_minutes: int = 25
    written_difficulty_distribution: Optional[dict] = {"easy": 30, "medium": 50, "hard": 20}
    # Stage 2: Yard Test (Practical)
    yard_pass_mark_percentage: int = 75
    # Stage 3: Road Test (Practical)
    road_pass_mark_percentage: int = 75
    is_active: bool = True
    requires_officer_assignment: bool = True

class MultiStageTestConfigurationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    written_total_questions: Optional[int] = None
    written_pass_mark_percentage: Optional[int] = None
    written_time_limit_minutes: Optional[int] = None
    written_difficulty_distribution: Optional[dict] = None
    yard_pass_mark_percentage: Optional[int] = None
    road_pass_mark_percentage: Optional[int] = None
    is_active: Optional[bool] = None
    requires_officer_assignment: Optional[bool] = None

# Evaluation Criteria Models
class EvaluationCriterion(BaseModel):
    name: str
    description: Optional[str] = None
    stage: str  # "yard" or "road"
    max_score: int = 10
    is_critical: bool = False  # If true, must pass this criterion to pass stage
    is_active: bool = True

class EvaluationCriterionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    max_score: Optional[int] = None
    is_critical: Optional[bool] = None
    is_active: Optional[bool] = None

# Multi-Stage Test Session Models
class MultiStageTestSession(BaseModel):
    test_config_id: str
    candidate_id: str
    appointment_id: Optional[str] = None

class StageEvaluation(BaseModel):
    criterion_id: str
    score: int
    notes: Optional[str] = None

class StageResult(BaseModel):
    session_id: str
    stage: str  # "written", "yard", "road"
    evaluations: List[StageEvaluation] = []  # Empty for written test
    passed: Optional[bool] = None
    evaluated_by: Optional[str] = None  # Officer email
    evaluation_notes: Optional[str] = None

# Officer Assignment Models
class OfficerAssignment(BaseModel):
    session_id: str
    officer_email: str
    stage: str  # "yard" or "road"
    assigned_by: str
    notes: Optional[str] = None

class OfficerAssignmentUpdate(BaseModel):
    officer_email: Optional[str] = None
    notes: Optional[str] = None

# Test Configuration routes
@api_router.post("/test-configs")
async def create_test_config(config_data: TestConfiguration, current_user: dict = Depends(get_current_user)):
    # Only Administrators can create test configurations
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create test configurations"
        )
    
    # Validate category exists
    category = await db.test_categories.find_one({"id": config_data.category_id, "is_active": True})
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found or inactive"
        )
    
    # Validate difficulty distribution adds up to 100
    if config_data.difficulty_distribution:
        total_percentage = sum(config_data.difficulty_distribution.values())
        if total_percentage != 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Difficulty distribution must add up to 100%"
            )
    
    config_doc = {
        "id": str(uuid.uuid4()),
        "name": config_data.name,
        "description": config_data.description,
        "category_id": config_data.category_id,
        "category_name": category["name"],
        "total_questions": config_data.total_questions,
        "pass_mark_percentage": config_data.pass_mark_percentage,
        "time_limit_minutes": config_data.time_limit_minutes,
        "is_active": config_data.is_active,
        "difficulty_distribution": config_data.difficulty_distribution,
        "created_by": current_user["email"],
        "created_by_name": current_user["full_name"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.test_configurations.insert_one(config_doc)
    return {"message": "Test configuration created successfully", "config_id": config_doc["id"]}

@api_router.get("/test-configs")
async def get_test_configs(current_user: dict = Depends(get_current_user)):
    # All authenticated users can view active test configurations
    configs = await db.test_configurations.find({"is_active": True}).to_list(1000)
    return serialize_doc(configs)

@api_router.get("/test-configs/{config_id}")
async def get_test_config(config_id: str, current_user: dict = Depends(get_current_user)):
    config = await db.test_configurations.find_one({"id": config_id})
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test configuration not found"
        )
    return serialize_doc(config)

@api_router.put("/test-configs/{config_id}")
async def update_test_config(
    config_id: str, 
    config_data: TestConfigurationUpdate, 
    current_user: dict = Depends(get_current_user)
):
    # Only Administrators can update test configurations
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update test configurations"
        )
    
    config = await db.test_configurations.find_one({"id": config_id})
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test configuration not found"
        )
    
    # Build update document
    update_data = {}
    for field, value in config_data.dict(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.test_configurations.update_one(
            {"id": config_id},
            {"$set": update_data}
        )
    
    return {"message": "Test configuration updated successfully"}

# Test Session Management
@api_router.post("/tests/start")
async def start_test_session(test_data: TestSession, current_user: dict = Depends(get_current_user)):
    # Only approved candidates can start tests
    if current_user["role"] == "Candidate":
        candidate = await db.candidates.find_one({"email": current_user["email"], "status": "approved"})
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only approved candidates can start tests"
            )
        test_data.candidate_id = candidate["id"]
        
        # PHASE 5: Check identity verification requirement
        access_check = await check_test_access(test_data.test_config_id, current_user)
        if not access_check["access_granted"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=access_check["message"]
            )
    else:
        # Staff members can start tests for testing purposes
        candidate = await db.candidates.find_one({"id": test_data.candidate_id})
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate not found"
            )
    
    # Get test configuration
    test_config = await db.test_configurations.find_one({"id": test_data.test_config_id, "is_active": True})
    if not test_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test configuration not found or inactive"
        )
    
    # Check if candidate has an active session
    active_session = await db.test_sessions.find_one({
        "candidate_id": test_data.candidate_id,
        "test_config_id": test_data.test_config_id,
        "status": "active"
    })
    if active_session:
        return serialize_doc(active_session)
    
    # Get randomized questions based on configuration
    questions = await get_randomized_questions(test_config)
    if len(questions) < test_config["total_questions"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Not enough approved questions available. Need {test_config['total_questions']}, found {len(questions)}"
        )
    
    # Create test session
    session_doc = {
        "id": str(uuid.uuid4()),
        "test_config_id": test_data.test_config_id,
        "candidate_id": test_data.candidate_id,
        "candidate_email": candidate["email"],
        "candidate_name": candidate["full_name"],
        "test_name": test_config["name"],
        "questions": [q["id"] for q in questions[:test_config["total_questions"]]],
        "question_details": serialize_doc(questions[:test_config["total_questions"]]),
        "start_time": datetime.utcnow(),
        "end_time": datetime.utcnow() + timedelta(minutes=test_config["time_limit_minutes"]),
        "time_limit_minutes": test_config["time_limit_minutes"],
        "time_extensions": [],
        "status": "active",  # active, completed, expired, cancelled
        "current_question_index": 0,
        "answers": {},
        "bookmarked_questions": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.test_sessions.insert_one(session_doc)
    
    # Return session without question details (for security)
    session_response = serialize_doc(session_doc)
    del session_response["question_details"]
    
    return session_response

async def get_randomized_questions(test_config: dict) -> List[dict]:
    """Get randomized questions based on difficulty distribution"""
    category_id = test_config["category_id"]
    total_questions = test_config["total_questions"]
    difficulty_dist = test_config.get("difficulty_distribution", {"easy": 30, "medium": 50, "hard": 20})
    
    questions = []
    
    for difficulty, percentage in difficulty_dist.items():
        questions_needed = int((percentage / 100) * total_questions)
        if questions_needed > 0:
            difficulty_questions = await db.questions.find({
                "category_id": category_id,
                "difficulty": difficulty,
                "status": "approved"
            }).to_list(questions_needed * 2)  # Get more than needed for randomization
            
            # Randomize and take required amount
            import random
            random.shuffle(difficulty_questions)
            questions.extend(difficulty_questions[:questions_needed])
    
    # If we don't have enough questions with specific difficulties, fill with any approved questions
    if len(questions) < total_questions:
        remaining_needed = total_questions - len(questions)
        question_ids = [q["id"] for q in questions]
        
        additional_questions = await db.questions.find({
            "category_id": category_id,
            "status": "approved",
            "id": {"$nin": question_ids}
        }).to_list(remaining_needed)
        
        questions.extend(additional_questions)
    
    # Final randomization
    import random
    random.shuffle(questions)
    return questions

@api_router.get("/tests/session/{session_id}")
async def get_test_session(session_id: str, current_user: dict = Depends(get_current_user)):
    session = await db.test_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test session not found"
        )
    
    # Check access permissions
    if current_user["role"] == "Candidate":
        candidate = await db.candidates.find_one({"email": current_user["email"]})
        if not candidate or session["candidate_id"] != candidate["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this test session"
            )
    
    # Check if session is expired
    if session["status"] == "active" and datetime.utcnow() > session["end_time"]:
        # Auto-expire the session
        await db.test_sessions.update_one(
            {"id": session_id},
            {"$set": {"status": "expired", "updated_at": datetime.utcnow()}}
        )
        session["status"] = "expired"
    
    return serialize_doc(session)

@api_router.get("/tests/session/{session_id}/question/{question_index}")
async def get_question_by_index(session_id: str, question_index: int, current_user: dict = Depends(get_current_user)):
    session = await db.test_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test session not found"
        )
    
    # Check access permissions
    if current_user["role"] == "Candidate":
        candidate = await db.candidates.find_one({"email": current_user["email"]})
        if not candidate or session["candidate_id"] != candidate["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this test session"
            )
    
    # Check session status and time
    if session["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Test session is not active"
        )
    
    if datetime.utcnow() > session["end_time"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Test session has expired"
        )
    
    # Validate question index
    if question_index < 0 or question_index >= len(session["question_details"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    question = session["question_details"][question_index]
    
    # Remove correct answers from response for security
    if "options" in question and question["options"]:
        question_copy = question.copy()
        question_copy["options"] = [{"text": opt["text"]} for opt in question["options"]]
        question = question_copy
    
    # Remove correct_answer field
    if "correct_answer" in question:
        question = {k: v for k, v in question.items() if k != "correct_answer"}
    
    # Add current answer and bookmark status
    question["current_answer"] = session["answers"].get(question["id"])
    question["is_bookmarked"] = question["id"] in session.get("bookmarked_questions", [])
    question["question_number"] = question_index + 1
    question["total_questions"] = len(session["question_details"])
    
    return serialize_doc(question)

@api_router.post("/tests/session/{session_id}/answer")
async def save_test_answer(session_id: str, answer_data: TestAnswer, current_user: dict = Depends(get_current_user)):
    session = await db.test_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test session not found"
        )
    
    # Check access permissions
    if current_user["role"] == "Candidate":
        candidate = await db.candidates.find_one({"email": current_user["email"]})
        if not candidate or session["candidate_id"] != candidate["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this test session"
            )
    
    # Check session status
    if session["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot save answers to inactive test session"
        )
    
    if datetime.utcnow() > session["end_time"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Test session has expired"
        )
    
    # Save answer
    update_data = {}
    if answer_data.selected_option is not None or answer_data.boolean_answer is not None:
        update_data[f"answers.{answer_data.question_id}"] = {
            "selected_option": answer_data.selected_option,
            "boolean_answer": answer_data.boolean_answer,
            "answered_at": datetime.utcnow()
        }
    
    # Handle bookmarking
    if answer_data.is_bookmarked:
        update_data["$addToSet"] = {"bookmarked_questions": answer_data.question_id}
    else:
        update_data["$pull"] = {"bookmarked_questions": answer_data.question_id}
    
    update_data["updated_at"] = datetime.utcnow()
    
    await db.test_sessions.update_one(
        {"id": session_id},
        {"$set": update_data} if "$addToSet" not in update_data and "$pull" not in update_data 
        else {**{k: v for k, v in update_data.items() if not k.startswith("$")}, **{k: v for k, v in update_data.items() if k.startswith("$")}}
    )
    
    return {"message": "Answer saved successfully"}

@api_router.post("/tests/session/{session_id}/submit")
async def submit_test(session_id: str, submission_data: TestSubmission, current_user: dict = Depends(get_current_user)):
    session = await db.test_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test session not found"
        )
    
    # Check access permissions
    if current_user["role"] == "Candidate":
        candidate = await db.candidates.find_one({"email": current_user["email"]})
        if not candidate or session["candidate_id"] != candidate["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this test session"
            )
    
    if session["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Test session is not active"
        )
    
    # Calculate score
    score_result = await calculate_test_score(session, submission_data.answers)
    
    # Create test result
    test_config = await db.test_configurations.find_one({"id": session["test_config_id"]})
    
    result_doc = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "candidate_id": session["candidate_id"],
        "candidate_email": session["candidate_email"],
        "candidate_name": session["candidate_name"],
        "test_config_id": session["test_config_id"],
        "test_name": session["test_name"],
        "total_questions": len(session["question_details"]),
        "answered_questions": score_result["answered_questions"],
        "correct_answers": score_result["correct_answers"],
        "score_percentage": score_result["score_percentage"],
        "pass_mark": test_config["pass_mark_percentage"],
        "passed": score_result["score_percentage"] >= test_config["pass_mark_percentage"],
        "time_taken_minutes": (datetime.utcnow() - session["start_time"]).total_seconds() / 60,
        "time_extensions": session.get("time_extensions", []),
        "submitted_at": datetime.utcnow(),
        "question_results": score_result["question_results"],
        "created_at": datetime.utcnow()
    }
    
    # Update session status
    await db.test_sessions.update_one(
        {"id": session_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }}
    )
    
    await db.test_results.insert_one(result_doc)
    
    return serialize_doc(result_doc)

async def calculate_test_score(session: dict, answers: List[TestAnswer]) -> dict:
    """Calculate the test score based on answers"""
    correct_answers = 0
    answered_questions = 0
    question_results = []
    
    # Convert answers list to dict for easy lookup
    answers_dict = {}
    for answer in answers:
        answers_dict[answer.question_id] = answer
    
    for question in session["question_details"]:
        question_id = question["id"]
        user_answer = answers_dict.get(question_id)
        
        result = {
            "question_id": question_id,
            "question_text": question["question_text"],
            "question_type": question["question_type"],
            "user_answer": None,
            "correct_answer": None,
            "is_correct": False,
            "answered": False
        }
        
        if user_answer:
            answered_questions += 1
            result["answered"] = True
            
            if question["question_type"] == "multiple_choice" and question["options"]:
                # Find correct option
                correct_option = None
                for i, option in enumerate(question["options"]):
                    if option["is_correct"]:
                        correct_option = chr(65 + i)  # Convert to A, B, C, D
                        break
                
                result["correct_answer"] = correct_option
                result["user_answer"] = user_answer.selected_option
                
                if user_answer.selected_option == correct_option:
                    correct_answers += 1
                    result["is_correct"] = True
            
            elif question["question_type"] == "true_false":
                result["correct_answer"] = question["correct_answer"]
                result["user_answer"] = user_answer.boolean_answer
                
                if user_answer.boolean_answer == question["correct_answer"]:
                    correct_answers += 1
                    result["is_correct"] = True
        
        question_results.append(result)
    
    score_percentage = (correct_answers / len(session["question_details"])) * 100 if len(session["question_details"]) > 0 else 0
    
    return {
        "correct_answers": correct_answers,
        "answered_questions": answered_questions,
        "score_percentage": round(score_percentage, 2),
        "question_results": question_results
    }

# Time Extension Management
@api_router.post("/tests/session/{session_id}/extend-time")
async def extend_test_time(session_id: str, extension_data: TimeExtension, current_user: dict = Depends(get_current_user)):
    # Only Managers and Assessment Officers can extend time
    if current_user["role"] not in ["Manager", "Driver Assessment Officer", "Administrator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and assessment officers can extend test time"
        )
    
    session = await db.test_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test session not found"
        )
    
    if session["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot extend time for inactive test session"
        )
    
    # Add time extension
    extension_record = {
        "extended_by": current_user["email"],
        "extended_by_name": current_user["full_name"],
        "additional_minutes": extension_data.additional_minutes,
        "reason": extension_data.reason,
        "extended_at": datetime.utcnow()
    }
    
    new_end_time = session["end_time"] + timedelta(minutes=extension_data.additional_minutes)
    
    await db.test_sessions.update_one(
        {"id": session_id},
        {
            "$set": {
                "end_time": new_end_time,
                "updated_at": datetime.utcnow()
            },
            "$push": {"time_extensions": extension_record}
        }
    )
    
    return {
        "message": f"Test time extended by {extension_data.additional_minutes} minutes",
        "new_end_time": new_end_time.isoformat()
    }

@api_router.post("/tests/session/{session_id}/reset-time")
async def reset_test_time(session_id: str, current_user: dict = Depends(get_current_user)):
    # Only Managers and Assessment Officers can reset time
    if current_user["role"] not in ["Manager", "Driver Assessment Officer", "Administrator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and assessment officers can reset test time"
        )
    
    session = await db.test_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test session not found"
        )
    
    if session["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reset time for inactive test session"
        )
    
    # Get original time limit
    test_config = await db.test_configurations.find_one({"id": session["test_config_id"]})
    new_end_time = datetime.utcnow() + timedelta(minutes=test_config["time_limit_minutes"])
    
    # Add reset record
    reset_record = {
        "reset_by": current_user["email"],
        "reset_by_name": current_user["full_name"],
        "reset_to_minutes": test_config["time_limit_minutes"],
        "reset_at": datetime.utcnow()
    }
    
    await db.test_sessions.update_one(
        {"id": session_id},
        {
            "$set": {
                "end_time": new_end_time,
                "updated_at": datetime.utcnow()
            },
            "$push": {"time_extensions": reset_record}
        }
    )
    
    return {
        "message": f"Test time reset to {test_config['time_limit_minutes']} minutes",
        "new_end_time": new_end_time.isoformat()
    }

# Test Results and Analytics
@api_router.get("/tests/results")
async def get_test_results(
    candidate_id: Optional[str] = None,
    test_config_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query_filter = {}
    
    if current_user["role"] == "Candidate":
        # Candidates can only see their own results
        candidate = await db.candidates.find_one({"email": current_user["email"]})
        if candidate:
            query_filter["candidate_id"] = candidate["id"]
    else:
        # Staff can filter by candidate_id
        if candidate_id:
            query_filter["candidate_id"] = candidate_id
    
    if test_config_id:
        query_filter["test_config_id"] = test_config_id
    
    results = await db.test_results.find(query_filter).sort("created_at", -1).to_list(1000)
    return serialize_doc(results)

@api_router.get("/tests/results/{result_id}")
async def get_test_result_detail(result_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.test_results.find_one({"id": result_id})
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test result not found"
        )
    
    # Check access permissions
    if current_user["role"] == "Candidate":
        candidate = await db.candidates.find_one({"email": current_user["email"]})
        if not candidate or result["candidate_id"] != candidate["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this test result"
            )
    
    return serialize_doc(result)

# Test Analytics Dashboard
@api_router.get("/tests/analytics")
async def get_test_analytics(current_user: dict = Depends(get_current_user)):
    # Only staff can view analytics
    if current_user["role"] == "Candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to test analytics"
        )
    
    # Get overall statistics
    total_sessions = await db.test_sessions.count_documents({})
    active_sessions = await db.test_sessions.count_documents({"status": "active"})
    completed_sessions = await db.test_sessions.count_documents({"status": "completed"})
    
    # Get test results statistics
    total_results = await db.test_results.count_documents({})
    passed_results = await db.test_results.count_documents({"passed": True})
    
    # Get average score
    pipeline = [{"$group": {"_id": None, "avg_score": {"$avg": "$score_percentage"}}}]
    avg_score_result = await db.test_results.aggregate(pipeline).to_list(1)
    avg_score = avg_score_result[0]["avg_score"] if avg_score_result else 0
    
    # Get results by test configuration
    config_pipeline = [
        {"$group": {"_id": "$test_name", "count": {"$sum": 1}, "avg_score": {"$avg": "$score_percentage"}}},
        {"$sort": {"count": -1}}
    ]
    results_by_config = await db.test_results.aggregate(config_pipeline).to_list(100)
    
    return {
        "total_sessions": total_sessions,
        "active_sessions": active_sessions,
        "completed_sessions": completed_sessions,
        "total_results": total_results,
        "passed_results": passed_results,
        "pass_rate": (passed_results / total_results * 100) if total_results > 0 else 0,
        "average_score": round(avg_score, 2) if avg_score else 0,
        "results_by_test": serialize_doc(results_by_config)
    }

# =============================================================================
# PHASE 6: MULTI-STAGE TESTING SYSTEM APIS
# =============================================================================

# Multi-Stage Test Configuration APIs
@api_router.post("/multi-stage-test-configs")
async def create_multi_stage_test_config(config_data: MultiStageTestConfiguration, current_user: dict = Depends(get_current_user)):
    # Only Administrators can create multi-stage test configurations
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create multi-stage test configurations"
        )
    
    # Validate category exists
    category = await db.test_categories.find_one({"id": config_data.category_id, "is_active": True})
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found or inactive"
        )
    
    # Validate difficulty distribution adds up to 100
    if config_data.written_difficulty_distribution:
        total_percentage = sum(config_data.written_difficulty_distribution.values())
        if total_percentage != 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Written test difficulty distribution must add up to 100%"
            )
    
    config_doc = {
        "id": str(uuid.uuid4()),
        "name": config_data.name,
        "description": config_data.description,
        "category_id": config_data.category_id,
        "category_name": category["name"],
        "written_total_questions": config_data.written_total_questions,
        "written_pass_mark_percentage": config_data.written_pass_mark_percentage,
        "written_time_limit_minutes": config_data.written_time_limit_minutes,
        "written_difficulty_distribution": config_data.written_difficulty_distribution,
        "yard_pass_mark_percentage": config_data.yard_pass_mark_percentage,
        "road_pass_mark_percentage": config_data.road_pass_mark_percentage,
        "is_active": config_data.is_active,
        "requires_officer_assignment": config_data.requires_officer_assignment,
        "test_type": "multi_stage",
        "created_by": current_user["email"],
        "created_by_name": current_user["full_name"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.multi_stage_test_configurations.insert_one(config_doc)
    return {"message": "Multi-stage test configuration created successfully", "config_id": config_doc["id"]}

@api_router.get("/multi-stage-test-configs")
async def get_multi_stage_test_configs(current_user: dict = Depends(get_current_user)):
    # All authenticated users can view active multi-stage test configurations
    configs = await db.multi_stage_test_configurations.find({"is_active": True}).to_list(1000)
    return serialize_doc(configs)

@api_router.get("/multi-stage-test-configs/{config_id}")
async def get_multi_stage_test_config(config_id: str, current_user: dict = Depends(get_current_user)):
    config = await db.multi_stage_test_configurations.find_one({"id": config_id})
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Multi-stage test configuration not found"
        )
    return serialize_doc(config)

@api_router.put("/multi-stage-test-configs/{config_id}")
async def update_multi_stage_test_config(
    config_id: str, 
    config_data: MultiStageTestConfigurationUpdate, 
    current_user: dict = Depends(get_current_user)
):
    # Only Administrators can update multi-stage test configurations
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update multi-stage test configurations"
        )
    
    config = await db.multi_stage_test_configurations.find_one({"id": config_id})
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Multi-stage test configuration not found"
        )
    
    # Build update document
    update_data = {}
    for field, value in config_data.dict(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.multi_stage_test_configurations.update_one(
            {"id": config_id},
            {"$set": update_data}
        )
    
    return {"message": "Multi-stage test configuration updated successfully"}

# Evaluation Criteria APIs
@api_router.post("/evaluation-criteria")
async def create_evaluation_criterion(criterion_data: EvaluationCriterion, current_user: dict = Depends(get_current_user)):
    # Only Administrators can create evaluation criteria
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create evaluation criteria"
        )
    
    if criterion_data.stage not in ["yard", "road"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stage must be either 'yard' or 'road'"
        )
    
    criterion_doc = {
        "id": str(uuid.uuid4()),
        "name": criterion_data.name,
        "description": criterion_data.description,
        "stage": criterion_data.stage,
        "max_score": criterion_data.max_score,
        "is_critical": criterion_data.is_critical,
        "is_active": criterion_data.is_active,
        "created_by": current_user["email"],
        "created_by_name": current_user["full_name"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.evaluation_criteria.insert_one(criterion_doc)
    return {"message": "Evaluation criterion created successfully", "criterion_id": criterion_doc["id"]}

@api_router.get("/evaluation-criteria")
async def get_evaluation_criteria(
    stage: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # All staff can view evaluation criteria
    if current_user["role"] == "Candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to evaluation criteria"
        )
    
    query_filter = {"is_active": True}
    if stage:
        query_filter["stage"] = stage
    
    criteria = await db.evaluation_criteria.find(query_filter).to_list(1000)
    return serialize_doc(criteria)

@api_router.put("/evaluation-criteria/{criterion_id}")
async def update_evaluation_criterion(
    criterion_id: str,
    criterion_data: EvaluationCriterionUpdate,
    current_user: dict = Depends(get_current_user)
):
    # Only Administrators can update evaluation criteria
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update evaluation criteria"
        )
    
    criterion = await db.evaluation_criteria.find_one({"id": criterion_id})
    if not criterion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation criterion not found"
        )
    
    # Build update document
    update_data = {}
    for field, value in criterion_data.dict(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.evaluation_criteria.update_one(
            {"id": criterion_id},
            {"$set": update_data}
        )
    
    return {"message": "Evaluation criterion updated successfully"}

# Multi-Stage Test Session APIs
@api_router.post("/multi-stage-tests/start")
async def start_multi_stage_test_session(test_data: MultiStageTestSession, current_user: dict = Depends(get_current_user)):
    # Only approved candidates can start multi-stage tests
    if current_user["role"] == "Candidate":
        candidate = await db.candidates.find_one({"email": current_user["email"], "status": "approved"})
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only approved candidates can start tests"
            )
        test_data.candidate_id = candidate["id"]
        
        # Check identity verification requirement (same as single-stage tests)
        if test_data.appointment_id:
            access_check = await check_test_access(test_data.test_config_id, current_user, test_data.appointment_id)
            if not access_check["access_granted"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=access_check["message"]
                )
    else:
        # Staff members can start tests for testing purposes
        candidate = await db.candidates.find_one({"id": test_data.candidate_id})
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate not found"
            )
    
    # Get multi-stage test configuration
    test_config = await db.multi_stage_test_configurations.find_one({"id": test_data.test_config_id, "is_active": True})
    if not test_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Multi-stage test configuration not found or inactive"
        )
    
    # Check if candidate has an active multi-stage session
    active_session = await db.multi_stage_test_sessions.find_one({
        "candidate_id": test_data.candidate_id,
        "test_config_id": test_data.test_config_id,
        "status": {"$in": ["active", "written_passed", "yard_passed"]}
    })
    if active_session:
        return serialize_doc(active_session)
    
    # Create multi-stage test session
    session_doc = {
        "id": str(uuid.uuid4()),
        "test_config_id": test_data.test_config_id,
        "candidate_id": test_data.candidate_id,
        "appointment_id": test_data.appointment_id,
        "candidate_email": candidate["email"],
        "candidate_name": candidate["full_name"],
        "test_name": test_config["name"],
        "status": "active",  # active, written_passed, yard_passed, completed, failed
        "current_stage": "written",  # written, yard, road
        "stage_results": {
            "written": {"completed": False, "passed": None, "session_id": None},
            "yard": {"completed": False, "passed": None, "evaluated_by": None},
            "road": {"completed": False, "passed": None, "evaluated_by": None}
        },
        "officer_assignments": {},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.multi_stage_test_sessions.insert_one(session_doc)
    
    return serialize_doc(session_doc)

@api_router.get("/multi-stage-tests/session/{session_id}")
async def get_multi_stage_test_session(session_id: str, current_user: dict = Depends(get_current_user)):
    session = await db.multi_stage_test_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Multi-stage test session not found"
        )
    
    # Check access permissions
    if current_user["role"] == "Candidate":
        candidate = await db.candidates.find_one({"email": current_user["email"]})
        if not candidate or session["candidate_id"] != candidate["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this test session"
            )
    
    return serialize_doc(session)

# Stage Evaluation APIs
@api_router.post("/multi-stage-tests/evaluate-stage")
async def evaluate_stage(stage_result: StageResult, current_user: dict = Depends(get_current_user)):
    # Only officers can evaluate practical stages
    if current_user["role"] not in ["Driver Assessment Officer", "Manager", "Administrator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only assessment officers can evaluate test stages"
        )
    
    if stage_result.stage not in ["yard", "road"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only evaluate 'yard' or 'road' stages through this endpoint"
        )
    
    # Get the multi-stage session
    session = await db.multi_stage_test_sessions.find_one({"id": stage_result.session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Multi-stage test session not found"
        )
    
    # Validate that the session is at the correct stage
    if session["current_stage"] != stage_result.stage:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot evaluate {stage_result.stage} stage. Current stage is {session['current_stage']}"
        )
    
    # Get test configuration
    test_config = await db.multi_stage_test_configurations.find_one({"id": session["test_config_id"]})
    if not test_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Multi-stage test configuration not found"
        )
    
    # Calculate score and determine pass/fail
    total_score = 0
    max_possible_score = 0
    critical_passed = True
    
    for evaluation in stage_result.evaluations:
        criterion = await db.evaluation_criteria.find_one({"id": evaluation.criterion_id, "stage": stage_result.stage, "is_active": True})
        if criterion:
            total_score += evaluation.score
            max_possible_score += criterion["max_score"]
            
            # Check critical criteria
            if criterion["is_critical"] and evaluation.score < criterion["max_score"]:
                critical_passed = False
    
    # Determine pass/fail based on percentage and critical criteria
    pass_mark_key = f"{stage_result.stage}_pass_mark_percentage"
    pass_percentage = test_config.get(pass_mark_key, 75)
    
    score_percentage = (total_score / max_possible_score * 100) if max_possible_score > 0 else 0
    stage_passed = score_percentage >= pass_percentage and critical_passed
    
    # Create stage result document
    result_doc = {
        "id": str(uuid.uuid4()),
        "session_id": stage_result.session_id,
        "candidate_id": session["candidate_id"],
        "candidate_email": session["candidate_email"],
        "candidate_name": session["candidate_name"],
        "test_config_id": session["test_config_id"],
        "stage": stage_result.stage,
        "evaluations": [eval.dict() for eval in stage_result.evaluations],
        "total_score": total_score,
        "max_possible_score": max_possible_score,
        "score_percentage": round(score_percentage, 2),
        "pass_percentage": pass_percentage,
        "passed": stage_passed,
        "critical_passed": critical_passed,
        "evaluated_by": current_user["email"],
        "evaluated_by_name": current_user["full_name"],
        "evaluation_notes": stage_result.evaluation_notes,
        "evaluated_at": datetime.utcnow(),
        "created_at": datetime.utcnow()
    }
    
    await db.stage_results.insert_one(result_doc)
    
    # Update multi-stage session
    stage_update = {
        f"stage_results.{stage_result.stage}.completed": True,
        f"stage_results.{stage_result.stage}.passed": stage_passed,
        f"stage_results.{stage_result.stage}.evaluated_by": current_user["email"],
        f"stage_results.{stage_result.stage}.result_id": result_doc["id"]
    }
    
    # Determine next stage or completion
    if stage_passed:
        if stage_result.stage == "yard":
            stage_update["current_stage"] = "road"
            stage_update["status"] = "yard_passed"
        elif stage_result.stage == "road":
            stage_update["current_stage"] = "completed"
            stage_update["status"] = "completed"
            stage_update["completed_at"] = datetime.utcnow()
    else:
        stage_update["status"] = "failed"
        stage_update["failed_stage"] = stage_result.stage
        stage_update["failed_at"] = datetime.utcnow()
    
    stage_update["updated_at"] = datetime.utcnow()
    
    await db.multi_stage_test_sessions.update_one(
        {"id": stage_result.session_id},
        {"$set": stage_update}
    )
    
    return serialize_doc(result_doc)

# Officer Assignment APIs
@api_router.post("/multi-stage-tests/assign-officer")
async def assign_officer_to_session(assignment_data: OfficerAssignment, current_user: dict = Depends(get_current_user)):
    # Only Managers and Administrators can assign officers
    if current_user["role"] not in ["Manager", "Administrator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and administrators can assign officers"
        )
    
    # Validate officer exists and has correct role
    officer = await db.users.find_one({"email": assignment_data.officer_email, "role": "Driver Assessment Officer", "is_active": True})
    if not officer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment officer not found or inactive"
        )
    
    # Get session
    session = await db.multi_stage_test_sessions.find_one({"id": assignment_data.session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Multi-stage test session not found"
        )
    
    if assignment_data.stage not in ["yard", "road"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only assign officers to 'yard' or 'road' stages"
        )
    
    assignment_doc = {
        "id": str(uuid.uuid4()),
        "session_id": assignment_data.session_id,
        "officer_email": assignment_data.officer_email,
        "officer_name": officer["full_name"],
        "stage": assignment_data.stage,
        "assigned_by": current_user["email"],
        "assigned_by_name": current_user["full_name"],
        "notes": assignment_data.notes,
        "assigned_at": datetime.utcnow(),
        "created_at": datetime.utcnow()
    }
    
    await db.officer_assignments.insert_one(assignment_doc)
    
    # Update session with officer assignment
    await db.multi_stage_test_sessions.update_one(
        {"id": assignment_data.session_id},
        {"$set": {
            f"officer_assignments.{assignment_data.stage}": {
                "officer_email": assignment_data.officer_email,
                "officer_name": officer["full_name"],
                "assigned_by": current_user["email"],
                "assigned_at": datetime.utcnow()
            },
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {"message": f"Officer assigned to {assignment_data.stage} stage successfully", "assignment_id": assignment_doc["id"]}

@api_router.get("/multi-stage-tests/my-assignments")
async def get_my_officer_assignments(current_user: dict = Depends(get_current_user)):
    # Only assessment officers can view their assignments
    if current_user["role"] != "Driver Assessment Officer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only assessment officers can view assignments"
        )
    
    # Get sessions where this officer is assigned
    sessions = await db.multi_stage_test_sessions.find({
        "$or": [
            {"officer_assignments.yard.officer_email": current_user["email"]},
            {"officer_assignments.road.officer_email": current_user["email"]}
        ],
        "status": {"$in": ["written_passed", "yard_passed"]}
    }).to_list(1000)
    
    return serialize_doc(sessions)

# Multi-Stage Test Results and Analytics
@api_router.get("/multi-stage-tests/results")
async def get_multi_stage_test_results(
    candidate_id: Optional[str] = None,
    test_config_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query_filter = {}
    
    if current_user["role"] == "Candidate":
        # Candidates can only see their own results
        candidate = await db.candidates.find_one({"email": current_user["email"]})
        if candidate:
            query_filter["candidate_id"] = candidate["id"]
    else:
        # Staff can filter by candidate_id
        if candidate_id:
            query_filter["candidate_id"] = candidate_id
    
    if test_config_id:
        query_filter["test_config_id"] = test_config_id
    
    sessions = await db.multi_stage_test_sessions.find(query_filter).sort("created_at", -1).to_list(1000)
    return serialize_doc(sessions)

@api_router.get("/multi-stage-tests/analytics")
async def get_multi_stage_test_analytics(current_user: dict = Depends(get_current_user)):
    # Only staff can view analytics
    if current_user["role"] == "Candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to test analytics"
        )
    
    # Get overall statistics
    total_sessions = await db.multi_stage_test_sessions.count_documents({})
    active_sessions = await db.multi_stage_test_sessions.count_documents({"status": {"$in": ["active", "written_passed", "yard_passed"]}})
    completed_sessions = await db.multi_stage_test_sessions.count_documents({"status": "completed"})
    failed_sessions = await db.multi_stage_test_sessions.count_documents({"status": "failed"})
    
    # Get stage-specific statistics
    written_passed = await db.multi_stage_test_sessions.count_documents({"stage_results.written.passed": True})
    yard_passed = await db.multi_stage_test_sessions.count_documents({"stage_results.yard.passed": True})
    road_passed = await db.multi_stage_test_sessions.count_documents({"stage_results.road.passed": True})
    
    # Get failure stages
    failure_pipeline = [
        {"$match": {"status": "failed"}},
        {"$group": {"_id": "$failed_stage", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    failure_by_stage = await db.multi_stage_test_sessions.aggregate(failure_pipeline).to_list(100)
    
    return {
        "total_sessions": total_sessions,
        "active_sessions": active_sessions,
        "completed_sessions": completed_sessions,
        "failed_sessions": failed_sessions,
        "completion_rate": (completed_sessions / total_sessions * 100) if total_sessions > 0 else 0,
        "stage_pass_rates": {
            "written": (written_passed / total_sessions * 100) if total_sessions > 0 else 0,
            "yard": (yard_passed / written_passed * 100) if written_passed > 0 else 0,
            "road": (road_passed / yard_passed * 100) if yard_passed > 0 else 0
        },
        "failure_by_stage": serialize_doc(failure_by_stage)
    }

# Helper function for test access check (enhanced for multi-stage)
async def check_test_access(test_config_id: str, current_user: dict, appointment_id: str = None) -> dict:
    """Check if candidate can access test - enhanced for multi-stage tests"""
    candidate = await db.candidates.find_one({"email": current_user["email"]})
    if not candidate:
        return {"access_granted": False, "message": "Candidate profile not found"}
    
    # Check identity verification
    verification = await db.identity_verifications.find_one({"candidate_id": candidate["id"], "status": "verified"})
    if not verification:
        return {"access_granted": False, "message": "Identity verification required before taking test"}
    
    # Check appointment if provided
    if appointment_id:
        appointment = await db.appointments.find_one({"id": appointment_id, "candidate_id": candidate["id"]})
        if not appointment:
            return {"access_granted": False, "message": "Valid appointment required"}
        
        if appointment["status"] != "confirmed":
            return {"access_granted": False, "message": "Appointment must be confirmed"}
        
        # Check if appointment date is today
        appointment_date = datetime.strptime(appointment["appointment_date"], "%Y-%m-%d").date()
        today = datetime.utcnow().date()
        if appointment_date != today:
            return {"access_granted": False, "message": "Test can only be taken on appointment date"}
    
    return {"access_granted": True, "message": "Access granted"}

# =============================================================================
# PHASE 5: APPOINTMENT & VERIFICATION SYSTEM APIS
# =============================================================================

# Schedule Configuration APIs
@api_router.post("/admin/schedule-config")
async def create_schedule_config(config_data: ScheduleConfig, current_user: dict = Depends(get_current_user)):
    # Only Administrators can manage schedule
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage schedule configuration"
        )
    
    config_doc = {
        "id": str(uuid.uuid4()),
        "day_of_week": config_data.day_of_week,
        "time_slots": [slot.dict() for slot in config_data.time_slots],
        "is_active": config_data.is_active,
        "created_by": current_user["email"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Remove existing config for this day if any
    await db.schedule_configs.delete_many({"day_of_week": config_data.day_of_week})
    await db.schedule_configs.insert_one(config_doc)
    
    return {"message": "Schedule configuration saved successfully", "config_id": config_doc["id"]}

@api_router.get("/admin/schedule-config")
async def get_schedule_config(current_user: dict = Depends(get_current_user)):
    # Only staff can view schedule configs
    if current_user["role"] not in ["Driver Assessment Officer", "Manager", "Administrator", "Regional Director"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view schedule configuration"
        )
    
    configs = await db.schedule_configs.find({"is_active": True}).sort("day_of_week", 1).to_list(7)
    return serialize_doc(configs)

@api_router.get("/schedule-availability")
async def get_schedule_availability(
    date: str,  # "2024-07-15"
    current_user: dict = Depends(get_current_user)
):
    """Get available time slots for a specific date"""
    try:
        appointment_date = datetime.strptime(date, "%Y-%m-%d")
        day_of_week = appointment_date.weekday()  # 0=Monday, 6=Sunday
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD"
        )
    
    # Check if date is a holiday
    holiday = await db.holidays.find_one({"date": date})
    if holiday:
        return {"available_slots": [], "message": f"No appointments available - {holiday['name']}"}
    
    # Get schedule config for this day of week
    schedule_config = await db.schedule_configs.find_one({"day_of_week": day_of_week, "is_active": True})
    if not schedule_config:
        return {"available_slots": [], "message": "No appointments available on this day"}
    
    # Get existing appointments for this date
    existing_appointments = await db.appointments.find({
        "appointment_date": date,
        "status": {"$in": ["scheduled", "confirmed"]}
    }).to_list(1000)
    
    # Calculate available slots
    available_slots = []
    for time_slot in schedule_config["time_slots"]:
        if not time_slot["is_active"]:
            continue
            
        slot_key = f"{time_slot['start_time']}-{time_slot['end_time']}"
        booked_count = len([apt for apt in existing_appointments if apt["time_slot"] == slot_key])
        available_capacity = time_slot["max_capacity"] - booked_count
        
        if available_capacity > 0:
            available_slots.append({
                "time_slot": slot_key,
                "start_time": time_slot["start_time"],
                "end_time": time_slot["end_time"],
                "available_capacity": available_capacity,
                "max_capacity": time_slot["max_capacity"]
            })
    
    return {"available_slots": available_slots, "date": date}

# Holiday Management APIs
@api_router.post("/admin/holidays")
async def create_holiday(holiday_data: Holiday, current_user: dict = Depends(get_current_user)):
    # Only Administrators can manage holidays
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage holidays"
        )
    
    holiday_doc = {
        "id": str(uuid.uuid4()),
        "date": holiday_data.date,
        "name": holiday_data.name,
        "description": holiday_data.description,
        "created_by": current_user["email"],
        "created_at": datetime.utcnow()
    }
    
    await db.holidays.insert_one(holiday_doc)
    return {"message": "Holiday created successfully", "holiday_id": holiday_doc["id"]}

@api_router.get("/admin/holidays")
async def get_holidays(current_user: dict = Depends(get_current_user)):
    # Only staff can view holidays
    if current_user["role"] not in ["Driver Assessment Officer", "Manager", "Administrator", "Regional Director"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view holidays"
        )
    
    holidays = await db.holidays.find().sort("date", 1).to_list(1000)
    return serialize_doc(holidays)

@api_router.delete("/admin/holidays/{holiday_id}")
async def delete_holiday(holiday_id: str, current_user: dict = Depends(get_current_user)):
    # Only Administrators can delete holidays
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete holidays"
        )
    
    result = await db.holidays.delete_one({"id": holiday_id})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holiday not found"
        )
    
    return {"message": "Holiday deleted successfully"}

# Appointment Management APIs
@api_router.post("/appointments")
async def create_appointment(appointment_data: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    # Only approved candidates can book appointments
    if current_user["role"] == "Candidate":
        candidate = await db.candidates.find_one({"email": current_user["email"], "status": "approved"})
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only approved candidates can book appointments"
            )
        candidate_id = candidate["id"]
    else:
        # Staff members can book for candidates (testing purposes)
        candidate_id = current_user.get("candidate_id", str(uuid.uuid4()))
    
    # Validate test configuration exists (check both single-stage and multi-stage)
    test_config = None
    test_config_name = None
    
    if appointment_data.test_type == "multi_stage":
        test_config = await db.multi_stage_test_configurations.find_one({"id": appointment_data.test_config_id, "is_active": True})
    else:
        test_config = await db.test_configurations.find_one({"id": appointment_data.test_config_id, "is_active": True})
    
    if not test_config:
        config_type = "Multi-stage test" if appointment_data.test_type == "multi_stage" else "Test"
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{config_type} configuration not found"
        )
    
    test_config_name = test_config["name"]
    
    # Check availability
    availability = await get_schedule_availability(appointment_data.appointment_date, current_user)
    available_slot = next(
        (slot for slot in availability["available_slots"] if slot["time_slot"] == appointment_data.time_slot),
        None
    )
    if not available_slot:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected time slot is not available"
        )
    
    appointment_doc = {
        "id": str(uuid.uuid4()),
        "candidate_id": candidate_id,
        "test_config_id": appointment_data.test_config_id,
        "test_config_name": test_config_name,
        "test_type": appointment_data.test_type,
        "appointment_date": appointment_data.appointment_date,
        "time_slot": appointment_data.time_slot,
        "status": "scheduled",  # scheduled, confirmed, cancelled, completed
        "notes": appointment_data.notes,
        "created_by": current_user["email"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "verification_status": "pending"  # pending, verified, failed
    }
    
    await db.appointments.insert_one(appointment_doc)
    return {"message": "Appointment booked successfully", "appointment_id": appointment_doc["id"]}

@api_router.get("/appointments/my-appointments")
async def get_my_appointments(current_user: dict = Depends(get_current_user)):
    # Only candidates can view their appointments
    if current_user["role"] != "Candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only candidates can view their appointments"
        )
    
    candidate = await db.candidates.find_one({"email": current_user["email"]})
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found"
        )
    
    appointments = await db.appointments.find({"candidate_id": candidate["id"]}).sort("appointment_date", 1).to_list(1000)
    return serialize_doc(appointments)

@api_router.get("/appointments")
async def get_appointments(
    date: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # Only staff can view all appointments
    if current_user["role"] not in ["Driver Assessment Officer", "Manager", "Administrator", "Regional Director"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view appointments"
        )
    
    query_filter = {}
    if date:
        query_filter["appointment_date"] = date
    if status:
        query_filter["status"] = status
    
    appointments = await db.appointments.find(query_filter).sort("appointment_date", 1).to_list(1000)
    
    # Enrich with candidate information
    enriched_appointments = []
    for appointment in appointments:
        candidate = await db.candidates.find_one({"id": appointment["candidate_id"]})
        appointment_data = serialize_doc(appointment)
        appointment_data["candidate_info"] = serialize_doc(candidate) if candidate else None
        enriched_appointments.append(appointment_data)
    
    return enriched_appointments

@api_router.put("/appointments/{appointment_id}")
async def update_appointment(
    appointment_id: str,
    appointment_data: AppointmentUpdate,
    current_user: dict = Depends(get_current_user)
):
    # Find appointment
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Check permissions
    candidate = await db.candidates.find_one({"email": current_user["email"]})
    is_owner = candidate and candidate["id"] == appointment["candidate_id"]
    is_staff = current_user["role"] in ["Driver Assessment Officer", "Manager", "Administrator", "Regional Director"]
    
    if not (is_owner or is_staff):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this appointment"
        )
    
    # Build update document
    update_data = {}
    for field, value in appointment_data.dict(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.appointments.update_one(
            {"id": appointment_id},
            {"$set": update_data}
        )
    
    return {"message": "Appointment updated successfully"}

@api_router.post("/appointments/{appointment_id}/reschedule")
async def reschedule_appointment(
    appointment_id: str,
    reschedule_data: AppointmentReschedule,
    current_user: dict = Depends(get_current_user)
):
    # Find appointment
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Check permissions (same as update)
    candidate = await db.candidates.find_one({"email": current_user["email"]})
    is_owner = candidate and candidate["id"] == appointment["candidate_id"]
    is_staff = current_user["role"] in ["Driver Assessment Officer", "Manager", "Administrator", "Regional Director"]
    
    if not (is_owner or is_staff):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to reschedule this appointment"
        )
    
    # Check new slot availability
    availability = await get_schedule_availability(reschedule_data.new_date, current_user)
    available_slot = next(
        (slot for slot in availability["available_slots"] if slot["time_slot"] == reschedule_data.new_time_slot),
        None
    )
    if not available_slot:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected new time slot is not available"
        )
    
    # Update appointment
    update_data = {
        "appointment_date": reschedule_data.new_date,
        "time_slot": reschedule_data.new_time_slot,
        "notes": f"{appointment.get('notes', '')} | Rescheduled: {reschedule_data.reason or 'No reason provided'}",
        "updated_at": datetime.utcnow()
    }
    
    await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": update_data}
    )
    
    return {"message": "Appointment rescheduled successfully"}

# Identity Verification APIs
@api_router.post("/appointments/{appointment_id}/verify-identity")
async def create_identity_verification(
    appointment_id: str,
    verification_data: IdentityVerification,
    current_user: dict = Depends(get_current_user)
):
    # Only Officers, Managers, and Administrators can perform verification
    if current_user["role"] not in ["Driver Assessment Officer", "Manager", "Administrator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform identity verification"
        )
    
    # Validate appointment exists
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Check if verification already exists
    existing_verification = await db.identity_verifications.find_one({"appointment_id": appointment_id})
    if existing_verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Identity verification already exists for this appointment"
        )
    
    verification_doc = {
        "id": str(uuid.uuid4()),
        "candidate_id": verification_data.candidate_id,
        "appointment_id": appointment_id,
        "id_document_type": verification_data.id_document_type,
        "id_document_number": verification_data.id_document_number,
        "verification_photos": [photo.dict() for photo in verification_data.verification_photos],
        "photo_match_confirmed": verification_data.photo_match_confirmed,
        "id_document_match_confirmed": verification_data.id_document_match_confirmed,
        "verification_notes": verification_data.verification_notes,
        "status": "verified" if (verification_data.photo_match_confirmed and verification_data.id_document_match_confirmed) else "failed",
        "verified_by": current_user["email"],
        "verified_by_name": current_user["full_name"],
        "verified_at": datetime.utcnow(),
        "created_at": datetime.utcnow()
    }
    
    await db.identity_verifications.insert_one(verification_doc)
    
    # Update appointment verification status
    verification_status = "verified" if verification_doc["status"] == "verified" else "failed"
    await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": {"verification_status": verification_status, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Identity verification completed", "verification_id": verification_doc["id"], "status": verification_doc["status"]}

@api_router.get("/appointments/{appointment_id}/verification")
async def get_identity_verification(
    appointment_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Staff and appointment owner can view verification
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    candidate = await db.candidates.find_one({"email": current_user["email"]})
    is_owner = candidate and candidate["id"] == appointment["candidate_id"]
    is_staff = current_user["role"] in ["Driver Assessment Officer", "Manager", "Administrator", "Regional Director"]
    
    if not (is_owner or is_staff):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this verification"
        )
    
    verification = await db.identity_verifications.find_one({"appointment_id": appointment_id})
    return serialize_doc(verification) if verification else None

@api_router.put("/verifications/{verification_id}")
async def update_identity_verification(
    verification_id: str,
    verification_data: VerificationUpdate,
    current_user: dict = Depends(get_current_user)
):
    # Only Officers, Managers, and Administrators can update verification
    if current_user["role"] not in ["Driver Assessment Officer", "Manager", "Administrator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update identity verification"
        )
    
    verification = await db.identity_verifications.find_one({"id": verification_id})
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Identity verification not found"
        )
    
    # Build update document
    update_data = {}
    for field, value in verification_data.dict(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        
        # Update status based on confirmation flags
        if "photo_match_confirmed" in update_data or "id_document_match_confirmed" in update_data:
            photo_match = update_data.get("photo_match_confirmed", verification["photo_match_confirmed"])
            id_match = update_data.get("id_document_match_confirmed", verification["id_document_match_confirmed"])
            update_data["status"] = "verified" if (photo_match and id_match) else "failed"
        
        await db.identity_verifications.update_one(
            {"id": verification_id},
            {"$set": update_data}
        )
        
        # Update appointment verification status if needed
        if "status" in update_data:
            await db.appointments.update_one(
                {"id": verification["appointment_id"]},
                {"$set": {"verification_status": update_data["status"], "updated_at": datetime.utcnow()}}
            )
    
    return {"message": "Identity verification updated successfully"}

# Enhanced Admin Management APIs
@api_router.post("/admin/users")
async def create_user_admin(user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    # Only Administrators can create users
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create users"
        )
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user and not existing_user.get("is_deleted", False):
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
    
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "hashed_password": hashed_password,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "is_active": user_data.is_active,
        "is_deleted": False,
        "created_by": current_user["email"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user_doc)
    return {"message": "User created successfully", "user_id": user_doc["id"]}

@api_router.get("/admin/users")
async def get_all_users(
    include_deleted: bool = False,
    current_user: dict = Depends(get_current_user)
):
    # Only Administrators can view all users
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view all users"
        )
    
    query_filter = {}
    if not include_deleted:
        query_filter["is_deleted"] = {"$ne": True}
    
    users = await db.users.find(query_filter).sort("created_at", -1).to_list(1000)
    
    # Remove sensitive data
    for user in users:
        user.pop("hashed_password", None)
    
    return serialize_doc(users)

@api_router.put("/admin/users/{user_id}")
async def update_user_admin(
    user_id: str,
    user_data: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    # Only Administrators can update users
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update users"
        )
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Build update document
    update_data = {}
    for field, value in user_data.dict(exclude_unset=True).items():
        if value is not None:
            if field == "password":
                update_data["hashed_password"] = get_password_hash(value)
            else:
                update_data[field] = value
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.users.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
    
    return {"message": "User updated successfully"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user_admin(user_id: str, current_user: dict = Depends(get_current_user)):
    # Only Administrators can delete users
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete users"
        )
    
    # Don't allow deleting self
    if user_id == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Soft delete
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_deleted": True, "is_active": False, "deleted_at": datetime.utcnow(), "deleted_by": current_user["email"]}}
    )
    
    return {"message": "User deleted successfully"}

@api_router.post("/admin/users/{user_id}/restore")
async def restore_user_admin(user_id: str, current_user: dict = Depends(get_current_user)):
    # Only Administrators can restore users
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can restore users"
        )
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_deleted": False, "is_active": True, "restored_at": datetime.utcnow(), "restored_by": current_user["email"]}}
    )
    
    return {"message": "User restored successfully"}

@api_router.post("/admin/candidates")
async def create_candidate_admin(candidate_data: CandidateAdminCreate, current_user: dict = Depends(get_current_user)):
    # Only Administrators can create candidates
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create candidates"
        )
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": candidate_data.email})
    if existing_user and not existing_user.get("is_deleted", False):
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
        "is_active": True,
        "is_deleted": False,
        "candidate_id": candidate_id,
        "created_by": current_user["email"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
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
        "status": candidate_data.status,
        "is_deleted": False,
        "created_by": current_user["email"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "approved_by": None,
        "approved_at": None,
        "approval_notes": None
    }
    
    await db.users.insert_one(user_doc)
    await db.candidates.insert_one(candidate_doc)
    
    return {"message": "Candidate created successfully", "candidate_id": candidate_id}

@api_router.get("/admin/candidates")
async def get_all_candidates_admin(
    include_deleted: bool = False,
    current_user: dict = Depends(get_current_user)
):
    # Only Administrators can view all candidates
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view all candidates"
        )
    
    query_filter = {}
    if not include_deleted:
        query_filter["is_deleted"] = {"$ne": True}
    
    candidates = await db.candidates.find(query_filter).sort("created_at", -1).to_list(1000)
    return serialize_doc(candidates)

@api_router.put("/admin/candidates/{candidate_id}")
async def update_candidate_admin(
    candidate_id: str,
    candidate_data: CandidateAdminUpdate,
    current_user: dict = Depends(get_current_user)
):
    # Only Administrators can update candidates
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update candidates"
        )
    
    candidate = await db.candidates.find_one({"id": candidate_id})
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )
    
    # Build update document
    update_data = {}
    for field, value in candidate_data.dict(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.candidates.update_one(
            {"id": candidate_id},
            {"$set": update_data}
        )
    
    return {"message": "Candidate updated successfully"}

@api_router.delete("/admin/candidates/{candidate_id}")
async def delete_candidate_admin(candidate_id: str, current_user: dict = Depends(get_current_user)):
    # Only Administrators can delete candidates
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete candidates"
        )
    
    candidate = await db.candidates.find_one({"id": candidate_id})
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )
    
    # Soft delete candidate
    await db.candidates.update_one(
        {"id": candidate_id},
        {"$set": {"is_deleted": True, "deleted_at": datetime.utcnow(), "deleted_by": current_user["email"]}}
    )
    
    # Soft delete associated user
    await db.users.update_one(
        {"candidate_id": candidate_id},
        {"$set": {"is_deleted": True, "is_active": False, "deleted_at": datetime.utcnow(), "deleted_by": current_user["email"]}}
    )
    
    return {"message": "Candidate deleted successfully"}

@api_router.post("/admin/candidates/{candidate_id}/restore")
async def restore_candidate_admin(candidate_id: str, current_user: dict = Depends(get_current_user)):
    # Only Administrators can restore candidates
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can restore candidates"
        )
    
    candidate = await db.candidates.find_one({"id": candidate_id})
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )
    
    # Restore candidate
    await db.candidates.update_one(
        {"id": candidate_id},
        {"$set": {"is_deleted": False, "restored_at": datetime.utcnow(), "restored_by": current_user["email"]}}
    )
    
    # Restore associated user
    await db.users.update_one(
        {"candidate_id": candidate_id},
        {"$set": {"is_deleted": False, "is_active": True, "restored_at": datetime.utcnow(), "restored_by": current_user["email"]}}
    )
    
    return {"message": "Candidate restored successfully"}

# Enhanced Test Access Control
@api_router.get("/tests/access-check/{test_config_id}")
async def check_test_access(test_config_id: str, current_user: dict = Depends(get_current_user)):
    """Check if candidate can access test based on verification status"""
    if current_user["role"] != "Candidate":
        return {"access_granted": True, "message": "Staff access granted"}
    
    candidate = await db.candidates.find_one({"email": current_user["email"], "status": "approved"})
    if not candidate:
        return {"access_granted": False, "message": "Candidate not approved"}
    
    # Find active appointment for this test config
    appointment = await db.appointments.find_one({
        "candidate_id": candidate["id"],
        "test_config_id": test_config_id,
        "status": {"$in": ["scheduled", "confirmed"]},
        "verification_status": "verified"
    })
    
    if not appointment:
        return {
            "access_granted": False,
            "message": "No verified appointment found for this test. Please complete identity verification with an officer."
        }
    
    # Check if appointment is for today
    today = datetime.utcnow().strftime("%Y-%m-%d")
    if appointment["appointment_date"] != today:
        return {
            "access_granted": False,
            "message": f"Test is scheduled for {appointment['appointment_date']}. Access only available on appointment date."
        }
    
    return {"access_granted": True, "message": "Access granted", "appointment_id": appointment["id"]}

# =============================================================================
# PHASE 7: SPECIAL TESTS & RESIT MANAGEMENT SYSTEM
# =============================================================================

# Special Test Category Models
class SpecialTestCategory(BaseModel):
    name: str
    description: Optional[str] = None
    category_code: str  # "PPV", "CDL", "HMT" 
    requirements: Optional[List[str]] = []  # List of requirements/prerequisites
    is_active: bool = True

class SpecialTestCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[List[str]] = None
    is_active: Optional[bool] = None

# Special Test Configuration Models  
class SpecialTestConfiguration(BaseModel):
    category_id: str
    special_category_id: str  # Reference to SpecialTestCategory
    name: str
    description: Optional[str] = None
    # Customizable parameters for special tests
    written_total_questions: int = 25
    written_pass_mark_percentage: int = 80  # Higher pass mark for special tests
    written_time_limit_minutes: int = 40
    written_difficulty_distribution: Optional[dict] = {"easy": 20, "medium": 50, "hard": 30}
    # Enhanced practical requirements
    yard_pass_mark_percentage: int = 80
    road_pass_mark_percentage: int = 80
    # Special test specific parameters
    requires_medical_certificate: bool = False
    requires_background_check: bool = False
    minimum_experience_years: Optional[int] = None
    additional_documents: Optional[List[str]] = []
    is_active: bool = True
    requires_officer_assignment: bool = True
    
class SpecialTestConfigurationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    written_total_questions: Optional[int] = None
    written_pass_mark_percentage: Optional[int] = None
    written_time_limit_minutes: Optional[int] = None
    written_difficulty_distribution: Optional[dict] = None
    yard_pass_mark_percentage: Optional[int] = None
    road_pass_mark_percentage: Optional[int] = None
    requires_medical_certificate: Optional[bool] = None
    requires_background_check: Optional[bool] = None
    minimum_experience_years: Optional[int] = None
    additional_documents: Optional[List[str]] = None
    is_active: Optional[bool] = None
    requires_officer_assignment: Optional[bool] = None

# Resit Management Models
class ResitRequest(BaseModel):
    original_session_id: str
    failed_stages: List[str]  # ["written", "yard", "road"]
    requested_appointment_date: str  # "2024-07-15"
    requested_time_slot: str  # "09:00-10:00"
    reason: Optional[str] = None
    notes: Optional[str] = None

class ResitSession(BaseModel):
    original_session_id: str
    candidate_id: str
    resit_stages: List[str]  # Only failed stages to be retaken
    appointment_id: Optional[str] = None
    status: str = "pending"  # "pending", "scheduled", "in_progress", "completed", "failed"
    resit_attempt_number: int = 1
    photo_recaptured: bool = False
    identity_reverified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ResitSessionUpdate(BaseModel):
    status: Optional[str] = None
    resit_stages: Optional[List[str]] = None
    photo_recaptured: Optional[bool] = None
    identity_reverified: Optional[bool] = None

# Test Rescheduling Models
class RescheduleRequest(BaseModel):
    appointment_id: str
    new_date: str  # "2024-07-15"
    new_time_slot: str  # "09:00-10:00"
    reason: str
    notes: Optional[str] = None

class RescheduleHistory(BaseModel):
    appointment_id: str
    original_date: str
    original_time_slot: str
    new_date: str
    new_time_slot: str
    reason: str
    rescheduled_by: str  # User ID
    rescheduled_at: datetime = Field(default_factory=datetime.utcnow)

# Failed Stage Tracking Models
class FailedStageRecord(BaseModel):
    session_id: str
    candidate_id: str
    stage: str  # "written", "yard", "road"
    failure_date: datetime = Field(default_factory=datetime.utcnow)
    score_achieved: Optional[float] = None
    pass_mark_required: Optional[float] = None
    failure_reason: Optional[str] = None
    can_resit: bool = True
    resit_count: int = 0
    max_resits_allowed: int = 3

# =============================================================================
# PHASE 7: SPECIAL TESTS & RESIT MANAGEMENT APIs
# =============================================================================

# Special Test Category APIs
@api_router.post("/special-test-categories")
async def create_special_test_category(category_data: SpecialTestCategory, current_user: dict = Depends(get_current_user)):
    # Only Administrators can create special test categories
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create special test categories"
        )
    
    # Check if category code already exists
    existing_category = await db.special_test_categories.find_one({"category_code": category_data.category_code})
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Special test category with code '{category_data.category_code}' already exists"
        )
    
    # Create category document
    category_doc = {
        "id": str(uuid.uuid4()),
        **category_data.dict(),
        "created_at": datetime.utcnow(),
        "created_by": current_user["email"]
    }
    
    await db.special_test_categories.insert_one(category_doc)
    return {"message": "Special test category created successfully", "category_id": category_doc["id"]}

@api_router.get("/special-test-categories")
async def get_special_test_categories(current_user: dict = Depends(get_current_user)):
    # All authenticated users can view active special test categories
    categories = await db.special_test_categories.find({"is_active": True}).to_list(1000)
    return serialize_doc(categories)

@api_router.put("/special-test-categories/{category_id}")
async def update_special_test_category(
    category_id: str, 
    category_data: SpecialTestCategoryUpdate, 
    current_user: dict = Depends(get_current_user)
):
    # Only Administrators can update special test categories
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update special test categories"
        )
    
    # Check if category exists
    category = await db.special_test_categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Special test category not found"
        )
    
    # Update category
    update_data = {k: v for k, v in category_data.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        update_data["updated_by"] = current_user["email"]
        await db.special_test_categories.update_one({"id": category_id}, {"$set": update_data})
    
    return {"message": "Special test category updated successfully"}

# Special Test Configuration APIs
@api_router.post("/special-test-configs")
async def create_special_test_config(config_data: SpecialTestConfiguration, current_user: dict = Depends(get_current_user)):
    # Only Administrators can create special test configurations
    if current_user["role"] != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create special test configurations"
        )
    
    # Validate category and special category exist
    category = await db.test_categories.find_one({"id": config_data.category_id, "is_active": True})
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test category not found"
        )
    
    special_category = await db.special_test_categories.find_one({"id": config_data.special_category_id, "is_active": True})
    if not special_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Special test category not found"
        )
    
    # Create configuration document
    config_doc = {
        "id": str(uuid.uuid4()),
        **config_data.dict(),
        "created_at": datetime.utcnow(),
        "created_by": current_user["email"]
    }
    
    await db.special_test_configurations.insert_one(config_doc)
    return {"message": "Special test configuration created successfully", "config_id": config_doc["id"]}

@api_router.get("/special-test-configs")
async def get_special_test_configs(current_user: dict = Depends(get_current_user)):
    # All authenticated users can view active special test configurations
    configs = await db.special_test_configurations.find({"is_active": True}).to_list(1000)
    return serialize_doc(configs)

@api_router.get("/special-test-configs/{config_id}")
async def get_special_test_config(config_id: str, current_user: dict = Depends(get_current_user)):
    config = await db.special_test_configurations.find_one({"id": config_id})
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Special test configuration not found"
        )
    return serialize_doc(config)

# Resit Management APIs
@api_router.post("/resits/request")
async def request_resit(resit_data: ResitRequest, current_user: dict = Depends(get_current_user)):
    # Only candidates can request resits for their own sessions
    if current_user["role"] != "Candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only candidates can request resits"
        )
    
    # Verify the original session exists and belongs to the candidate
    original_session = await db.multi_stage_test_sessions.find_one({
        "id": resit_data.original_session_id,
        "candidate_id": current_user["id"]
    })
    
    if not original_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original test session not found or access denied"
        )
    
    # Verify the session has failed stages that can be retaken
    if original_session["status"] == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot request resit for completed session"
        )
    
    # Check which stages actually failed
    valid_failed_stages = []
    if "written" in resit_data.failed_stages and original_session.get("written_score", 0) < 75:
        valid_failed_stages.append("written")
    if "yard" in resit_data.failed_stages and original_session.get("yard_passed", True) == False:
        valid_failed_stages.append("yard")  
    if "road" in resit_data.failed_stages and original_session.get("road_passed", True) == False:
        valid_failed_stages.append("road")
    
    if not valid_failed_stages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid failed stages to resit"
        )
    
    # Check if resit already exists for this session
    existing_resit = await db.resit_sessions.find_one({"original_session_id": resit_data.original_session_id})
    if existing_resit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resit request already exists for this session"
        )
    
    # Create resit session
    resit_doc = {
        "id": str(uuid.uuid4()),
        "original_session_id": resit_data.original_session_id,
        "candidate_id": current_user["id"],
        "resit_stages": valid_failed_stages,
        "status": "pending",
        "resit_attempt_number": 1,
        "photo_recaptured": False,
        "identity_reverified": False,
        "requested_date": resit_data.requested_appointment_date,
        "requested_time_slot": resit_data.requested_time_slot,
        "reason": resit_data.reason,
        "notes": resit_data.notes,
        "created_at": datetime.utcnow()
    }
    
    await db.resit_sessions.insert_one(resit_doc)
    return {"message": "Resit request submitted successfully", "resit_id": resit_doc["id"]}

@api_router.get("/resits/my-resits")
async def get_my_resits(current_user: dict = Depends(get_current_user)):
    # Only candidates can view their own resits
    if current_user["role"] != "Candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only candidates can view their resits"
        )
    
    resits = await db.resit_sessions.find({"candidate_id": current_user["id"]}).to_list(1000)
    return serialize_doc(resits)

@api_router.get("/resits/all")
async def get_all_resits(current_user: dict = Depends(get_current_user)):
    # Only staff can view all resits
    if current_user["role"] == "Candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    resits = await db.resit_sessions.find({}).sort("created_at", -1).to_list(1000)
    return serialize_doc(resits)

@api_router.put("/resits/{resit_id}/approve")
async def approve_resit(resit_id: str, current_user: dict = Depends(get_current_user)):
    # Only Managers and Administrators can approve resits
    if current_user["role"] not in ["Manager", "Administrator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and administrators can approve resits"
        )
    
    # Find the resit session
    resit = await db.resit_sessions.find_one({"id": resit_id})
    if not resit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resit session not found"
        )
    
    # Update resit status to scheduled
    await db.resit_sessions.update_one(
        {"id": resit_id},
        {"$set": {
            "status": "scheduled",
            "approved_by": current_user["email"],
            "approved_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Resit approved successfully"}

# Test Rescheduling APIs
@api_router.post("/appointments/{appointment_id}/reschedule")
async def reschedule_appointment(appointment_id: str, reschedule_data: RescheduleRequest, current_user: dict = Depends(get_current_user)):
    # Verify appointment exists and user has access
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Check access rights
    if current_user["role"] == "Candidate" and appointment["candidate_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied - not your appointment"
        )
    
    # Check if new time slot is available
    new_date = reschedule_data.new_date
    new_time_slot = reschedule_data.new_time_slot
    
    # Get schedule availability
    try:
        appointment_date = datetime.strptime(new_date, "%Y-%m-%d")
        day_of_week = appointment_date.weekday()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD"
        )
    
    # Check if date is a holiday
    holiday = await db.holidays.find_one({"date": new_date})
    if holiday:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reschedule to holiday - {holiday['name']}"
        )
    
    # Get schedule config for this day of week
    schedule_config = await db.schedule_configs.find_one({"day_of_week": day_of_week, "is_active": True})
    if not schedule_config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No appointments available on this day"
        )
    
    # Check slot availability
    existing_appointments = await db.appointments.find({
        "appointment_date": new_date,
        "time_slot": new_time_slot,
        "status": {"$in": ["scheduled", "confirmed"]},
        "id": {"$ne": appointment_id}  # Exclude current appointment
    }).to_list(1000)
    
    # Find the time slot capacity
    slot_capacity = 1  # Default
    for time_slot in schedule_config["time_slots"]:
        if f"{time_slot['start_time']}-{time_slot['end_time']}" == new_time_slot:
            slot_capacity = time_slot["max_capacity"]
            break
    
    if len(existing_appointments) >= slot_capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected time slot is not available"
        )
    
    # Create reschedule history record
    reschedule_history = {
        "id": str(uuid.uuid4()),
        "appointment_id": appointment_id,
        "original_date": appointment["appointment_date"],
        "original_time_slot": appointment["time_slot"],
        "new_date": new_date,
        "new_time_slot": new_time_slot,
        "reason": reschedule_data.reason,
        "notes": reschedule_data.notes,
        "rescheduled_by": current_user["id"],
        "rescheduled_at": datetime.utcnow()
    }
    
    await db.reschedule_history.insert_one(reschedule_history)
    
    # Update the appointment
    await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": {
            "appointment_date": new_date,
            "time_slot": new_time_slot,
            "updated_at": datetime.utcnow(),
            "updated_by": current_user["id"]
        }}
    )
    
    return {"message": "Appointment rescheduled successfully"}

@api_router.get("/appointments/{appointment_id}/reschedule-history")
async def get_reschedule_history(appointment_id: str, current_user: dict = Depends(get_current_user)):
    # Verify appointment access
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Check access rights
    if current_user["role"] == "Candidate" and appointment["candidate_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    history = await db.reschedule_history.find({"appointment_id": appointment_id}).sort("rescheduled_at", -1).to_list(1000)
    return serialize_doc(history)

# Failed Stage Tracking APIs
@api_router.post("/failed-stages/record")
async def record_failed_stage(stage_data: FailedStageRecord, current_user: dict = Depends(get_current_user)):
    # Only officers can record failed stages
    if current_user["role"] not in ["Driver Assessment Officer", "Manager", "Administrator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only assessment officers can record failed stages"
        )
    
    # Create failed stage record
    stage_doc = {
        "id": str(uuid.uuid4()),
        **stage_data.dict(),
        "recorded_by": current_user["email"],
        "recorded_at": datetime.utcnow()
    }
    
    await db.failed_stage_records.insert_one(stage_doc)
    return {"message": "Failed stage recorded successfully", "record_id": stage_doc["id"]}

@api_router.get("/failed-stages/candidate/{candidate_id}")
async def get_candidate_failed_stages(candidate_id: str, current_user: dict = Depends(get_current_user)):
    # Candidates can only view their own failed stages, staff can view any
    if current_user["role"] == "Candidate" and current_user["id"] != candidate_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    failed_stages = await db.failed_stage_records.find({"candidate_id": candidate_id}).sort("failure_date", -1).to_list(1000)
    return serialize_doc(failed_stages)

@api_router.get("/failed-stages/analytics")
async def get_failed_stages_analytics(current_user: dict = Depends(get_current_user)):
    # Only staff can view analytics
    if current_user["role"] == "Candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to analytics"
        )
    
    # Get failure statistics by stage
    pipeline = [
        {"$group": {
            "_id": "$stage",
            "total_failures": {"$sum": 1},
            "avg_score": {"$avg": "$score_achieved"},
            "candidates_affected": {"$addToSet": "$candidate_id"}
        }},
        {"$addFields": {
            "unique_candidates": {"$size": "$candidates_affected"}
        }},
        {"$project": {
            "candidates_affected": 0  # Remove the array, keep only count
        }}
    ]
    
    stage_stats = await db.failed_stage_records.aggregate(pipeline).to_list(10)
    
    # Get resit success rates
    total_resits = await db.resit_sessions.count_documents({})
    successful_resits = await db.resit_sessions.count_documents({"status": "completed"})
    
    return {
        "stage_failure_stats": serialize_doc(stage_stats),
        "total_resit_requests": total_resits,
        "successful_resits": successful_resits,
        "resit_success_rate": (successful_resits / total_resits * 100) if total_resits > 0 else 0
    }

# ==========================================
# PHASE 8: CERTIFICATION & ADVANCED ADMIN FEATURES
# ==========================================

# Certificate Models
class CertificateType(BaseModel):
    name: str
    code: str  # e.g., "PDL", "COC", "PPV", "COMM"
    description: str
    is_active: bool = True

class CertificateCreate(BaseModel):
    candidate_id: str
    test_session_id: str
    certificate_type: str  # "provisional_license", "certificate_competency", "ppv_license", etc.
    certificate_number: Optional[str] = None  # Auto-generated if not provided
    issued_by: str  # Officer/Administrator ID
    valid_from: datetime = Field(default_factory=datetime.utcnow)
    valid_until: Optional[datetime] = None
    restrictions: Optional[List[str]] = []
    notes: Optional[str] = None

class CertificateUpdate(BaseModel):
    status: Optional[str] = None  # "active", "suspended", "revoked", "expired"
    valid_until: Optional[datetime] = None
    restrictions: Optional[List[str]] = None
    notes: Optional[str] = None

class BulkOperation(BaseModel):
    operation_type: str  # "create_users", "update_configs", "import_questions", etc.
    data: dict
    filters: Optional[dict] = {}
    options: Optional[dict] = {}

class SystemConfig(BaseModel):
    category: str  # "general", "certificates", "notifications", "security"
    key: str
    value: str
    description: Optional[str] = None
    is_active: bool = True

class SystemConfigUpdate(BaseModel):
    value: str
    description: Optional[str] = None
    is_active: Optional[bool] = None

# Certificate Generation System APIs
@api_router.post("/certificates")
async def create_certificate(certificate_data: CertificateCreate, current_user: dict = Depends(get_current_user)):
    """Create a new certificate for a candidate"""
    # Check permissions
    if current_user["role"] not in ["Administrator", "Manager", "Driver Assessment Officer"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify test session exists and is completed
    test_session = await db.multi_stage_sessions.find_one({"session_id": certificate_data.test_session_id})
    if not test_session:
        # Try regular test sessions
        test_session = await db.test_sessions.find_one({"session_id": certificate_data.test_session_id})
    
    if not test_session:
        raise HTTPException(status_code=404, detail="Test session not found")
    
    # Check if session is completed successfully
    if test_session.get("status") not in ["completed", "passed"]:
        raise HTTPException(status_code=400, detail="Test session not completed successfully")
    
    # Generate unique certificate number if not provided
    if not certificate_data.certificate_number:
        cert_prefix = {
            "provisional_license": "PDL",
            "certificate_competency": "COC", 
            "ppv_license": "PPV",
            "commercial_license": "COMM",
            "hazmat_license": "HAZ"
        }.get(certificate_data.certificate_type, "CERT")
        
        # Get next number in sequence
        last_cert = await db.certificates.find_one(
            {"certificate_number": {"$regex": f"^{cert_prefix}"}}, 
            sort=[("certificate_number", -1)]
        )
        
        if last_cert and last_cert.get("certificate_number"):
            try:
                last_num = int(last_cert["certificate_number"].replace(cert_prefix, "").replace("-", ""))
                next_num = last_num + 1
            except:
                next_num = 1000
        else:
            next_num = 1000
            
        certificate_data.certificate_number = f"{cert_prefix}-{next_num:06d}"
    
    # Set validity period based on certificate type
    if not certificate_data.valid_until:
        if certificate_data.certificate_type == "provisional_license":
            certificate_data.valid_until = certificate_data.valid_from + timedelta(days=365)  # 1 year
        else:
            certificate_data.valid_until = certificate_data.valid_from + timedelta(days=365*5)  # 5 years
    
    cert_doc = {
        "certificate_id": str(uuid.uuid4()),
        "candidate_id": certificate_data.candidate_id,
        "test_session_id": certificate_data.test_session_id,
        "certificate_type": certificate_data.certificate_type,
        "certificate_number": certificate_data.certificate_number,
        "issued_by": certificate_data.issued_by,
        "valid_from": certificate_data.valid_from,
        "valid_until": certificate_data.valid_until,
        "restrictions": certificate_data.restrictions or [],
        "notes": certificate_data.notes,
        "status": "active",
        "created_at": datetime.utcnow(),
        "created_by": current_user["id"]
    }
    
    await db.certificates.insert_one(cert_doc)
    
    # Log certificate generation
    await db.audit_logs.insert_one({
        "audit_id": str(uuid.uuid4()),
        "action": "certificate_generated",
        "entity_type": "certificate",
        "entity_id": cert_doc["certificate_id"],
        "user_id": current_user["user_id"],
        "details": {
            "certificate_number": certificate_data.certificate_number,
            "certificate_type": certificate_data.certificate_type,
            "candidate_id": certificate_data.candidate_id
        },
        "timestamp": datetime.utcnow()
    })
    
    return {"message": "Certificate created successfully", "certificate_id": cert_doc["certificate_id"], "certificate_number": certificate_data.certificate_number}

@api_router.get("/certificates")
async def get_certificates(
    candidate_id: Optional[str] = None,
    certificate_type: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get certificates with optional filtering"""
    # Build query based on user role
    query = {}
    
    if current_user["role"] == "Candidate":
        # Candidates can only see their own certificates
        query["candidate_id"] = current_user["user_id"]
    else:
        # Staff can filter by candidate
        if candidate_id:
            query["candidate_id"] = candidate_id
    
    if certificate_type:
        query["certificate_type"] = certificate_type
    if status:
        query["status"] = status
    
    certificates = []
    async for cert in db.certificates.find(query).sort("created_at", -1):
        # Get candidate info
        candidate = await db.candidates.find_one({"candidate_id": cert["candidate_id"]})
        cert["candidate_name"] = f"{candidate['first_name']} {candidate['last_name']}" if candidate else "Unknown"
        
        # Get issuer info
        issuer = await db.users.find_one({"user_id": cert["issued_by"]})
        cert["issued_by_name"] = f"{issuer['first_name']} {issuer['last_name']}" if issuer else "Unknown"
        
        certificates.append(serialize_doc(cert))
    
    return certificates

@api_router.get("/certificates/{certificate_id}")
async def get_certificate_details(certificate_id: str, current_user: dict = Depends(get_current_user)):
    """Get detailed certificate information"""
    cert = await db.certificates.find_one({"certificate_id": certificate_id})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    # Check permissions
    if current_user["role"] == "Candidate" and cert["candidate_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get additional details
    candidate = await db.candidates.find_one({"candidate_id": cert["candidate_id"]})
    test_session = await db.multi_stage_sessions.find_one({"session_id": cert["test_session_id"]})
    if not test_session:
        test_session = await db.test_sessions.find_one({"session_id": cert["test_session_id"]})
    
    cert["candidate_details"] = serialize_doc(candidate) if candidate else None
    cert["test_session_details"] = serialize_doc(test_session) if test_session else None
    
    return serialize_doc(cert)

@api_router.put("/certificates/{certificate_id}")
async def update_certificate(certificate_id: str, update_data: CertificateUpdate, current_user: dict = Depends(get_current_user)):
    """Update certificate status or details"""
    # Check permissions
    if current_user["role"] not in ["Administrator", "Manager"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    cert = await db.certificates.find_one({"certificate_id": certificate_id})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    update_doc = {"updated_at": datetime.utcnow(), "updated_by": current_user["id"]}
    
    if update_data.status:
        update_doc["status"] = update_data.status
    if update_data.valid_until:
        update_doc["valid_until"] = update_data.valid_until
    if update_data.restrictions is not None:
        update_doc["restrictions"] = update_data.restrictions
    if update_data.notes is not None:
        update_doc["notes"] = update_data.notes
    
    await db.certificates.update_one({"certificate_id": certificate_id}, {"$set": update_doc})
    
    # Log certificate update
    await db.audit_logs.insert_one({
        "audit_id": str(uuid.uuid4()),
        "action": "certificate_updated",
        "entity_type": "certificate",
        "entity_id": certificate_id,
        "user_id": current_user["user_id"],
        "details": update_doc,
        "timestamp": datetime.utcnow()
    })
    
    return {"message": "Certificate updated successfully"}

@api_router.post("/certificates/verify/{certificate_number}")
async def verify_certificate(certificate_number: str):
    """Verify certificate by certificate number (public endpoint)"""
    cert = await db.certificates.find_one({"certificate_number": certificate_number})
    if not cert:
        return {"valid": False, "message": "Certificate not found"}
    
    # Check if certificate is active and not expired
    now = datetime.utcnow()
    if cert["status"] != "active":
        return {"valid": False, "message": f"Certificate status: {cert['status']}"}
    
    if cert.get("valid_until") and cert["valid_until"] < now:
        return {"valid": False, "message": "Certificate expired"}
    
    # Get candidate name for verification
    candidate = await db.candidates.find_one({"candidate_id": cert["candidate_id"]})
    
    return {
        "valid": True,
        "certificate_number": cert["certificate_number"],
        "certificate_type": cert["certificate_type"],
        "candidate_name": f"{candidate['first_name']} {candidate['last_name']}" if candidate else "Unknown",
        "valid_from": cert["valid_from"],
        "valid_until": cert["valid_until"],
        "restrictions": cert.get("restrictions", [])
    }

# Advanced Reporting Dashboard APIs
@api_router.get("/reports/system-overview")
async def get_system_overview_report(current_user: dict = Depends(get_current_user)):
    """Get comprehensive system overview statistics"""
    if current_user["role"] not in ["Administrator", "Manager", "Regional Director"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get various statistics
    total_users = await db.users.count_documents({"is_active": True})
    total_candidates = await db.candidates.count_documents({"status": "approved"})
    total_sessions = await db.test_sessions.count_documents({})
    total_multi_sessions = await db.multi_stage_sessions.count_documents({})
    total_certificates = await db.certificates.count_documents({"status": "active"})
    
    # Recent activity (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_sessions = await db.test_sessions.count_documents({"created_at": {"$gte": thirty_days_ago}})
    recent_certificates = await db.certificates.count_documents({"created_at": {"$gte": thirty_days_ago}})
    
    # Pass rates
    passed_sessions = await db.test_sessions.count_documents({"status": "passed"})
    passed_multi_sessions = await db.multi_stage_sessions.count_documents({"status": "completed"})
    
    total_test_sessions = total_sessions + total_multi_sessions
    total_passed = passed_sessions + passed_multi_sessions
    overall_pass_rate = (total_passed / total_test_sessions * 100) if total_test_sessions > 0 else 0
    
    return {
        "summary": {
            "total_users": total_users,
            "total_candidates": total_candidates,
            "total_test_sessions": total_test_sessions,
            "total_certificates": total_certificates,
            "overall_pass_rate": round(overall_pass_rate, 2)
        },
        "recent_activity": {
            "sessions_last_30_days": recent_sessions,
            "certificates_last_30_days": recent_certificates
        }
    }

@api_router.get("/reports/test-performance")
async def get_test_performance_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    test_category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed test performance analytics"""
    if current_user["role"] not in ["Administrator", "Manager", "Regional Director"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Build date filter
    date_filter = {}
    if start_date:
        date_filter["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    if end_date:
        date_filter["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    query = {}
    if date_filter:
        query["created_at"] = date_filter
    if test_category:
        query["test_category"] = test_category
    
    # Performance by test type
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$test_category",
            "total_attempts": {"$sum": 1},
            "passed": {"$sum": {"$cond": [{"$eq": ["$status", "passed"]}, 1, 0]}},
            "avg_score": {"$avg": "$final_score"}
        }},
        {"$project": {
            "test_category": "$_id",
            "total_attempts": 1,
            "passed": 1,
            "pass_rate": {"$multiply": [{"$divide": ["$passed", "$total_attempts"]}, 100]},
            "avg_score": {"$round": ["$avg_score", 2]}
        }}
    ]
    
    performance_stats = []
    async for stat in db.test_sessions.aggregate(pipeline):
        performance_stats.append(serialize_doc(stat))
    
    return {
        "performance_by_category": performance_stats,
        "date_range": {"start": start_date, "end": end_date}
    }

@api_router.get("/reports/officer-performance")
async def get_officer_performance_report(current_user: dict = Depends(get_current_user)):
    """Get officer performance statistics"""
    if current_user["role"] not in ["Administrator", "Manager"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get officer assignments and evaluations
    pipeline = [
        {"$lookup": {
            "from": "users",
            "localField": "officer_id",
            "foreignField": "user_id",
            "as": "officer_info"
        }},
        {"$unwind": "$officer_info"},
        {"$group": {
            "_id": "$officer_id",
            "officer_name": {"$first": {"$concat": ["$officer_info.first_name", " ", "$officer_info.last_name"]}},
            "total_assignments": {"$sum": 1},
            "evaluations_completed": {"$sum": {"$cond": [{"$ne": ["$evaluation", None]}, 1, 0]}}
        }},
        {"$project": {
            "officer_id": "$_id",
            "officer_name": 1,
            "total_assignments": 1,
            "evaluations_completed": 1,
            "completion_rate": {"$multiply": [{"$divide": ["$evaluations_completed", "$total_assignments"]}, 100]}
        }}
    ]
    
    officer_stats = []
    async for stat in db.officer_assignments.aggregate(pipeline):
        officer_stats.append(serialize_doc(stat))
    
    return {"officer_performance": officer_stats}

@api_router.get("/reports/certificate-analytics")
async def get_certificate_analytics(current_user: dict = Depends(get_current_user)):
    """Get certificate generation and status analytics"""
    if current_user["role"] not in ["Administrator", "Manager", "Regional Director"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Certificates by type
    type_pipeline = [
        {"$group": {
            "_id": "$certificate_type",
            "count": {"$sum": 1},
            "active": {"$sum": {"$cond": [{"$eq": ["$status", "active"]}, 1, 0]}},
            "expired": {"$sum": {"$cond": [{"$eq": ["$status", "expired"]}, 1, 0]}},
            "revoked": {"$sum": {"$cond": [{"$eq": ["$status", "revoked"]}, 1, 0]}}
        }}
    ]
    
    cert_by_type = []
    async for stat in db.certificates.aggregate(type_pipeline):
        cert_by_type.append(serialize_doc(stat))
    
    # Monthly generation trends
    monthly_pipeline = [
        {"$group": {
            "_id": {
                "year": {"$year": "$created_at"},
                "month": {"$month": "$created_at"}
            },
            "certificates_generated": {"$sum": 1}
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1}},
        {"$limit": 12}  # Last 12 months
    ]
    
    monthly_trends = []
    async for stat in db.certificates.aggregate(monthly_pipeline):
        monthly_trends.append(serialize_doc(stat))
    
    return {
        "certificates_by_type": cert_by_type,
        "monthly_generation_trends": monthly_trends
    }

# Bulk Operations APIs
@api_router.post("/bulk/users")
async def bulk_create_users(operation: BulkOperation, current_user: dict = Depends(get_current_user)):
    """Bulk create users"""
    if current_user["role"] != "Administrator":
        raise HTTPException(status_code=403, detail="Access denied")
    
    if operation.operation_type != "create_users":
        raise HTTPException(status_code=400, detail="Invalid operation type")
    
    users_data = operation.data.get("users", [])
    results = {"created": 0, "errors": []}
    
    for user_data in users_data:
        try:
            # Validate required fields
            if not all(k in user_data for k in ["email", "first_name", "last_name", "role"]):
                results["errors"].append({"email": user_data.get("email", "unknown"), "error": "Missing required fields"})
                continue
            
            # Check if user exists
            existing = await db.users.find_one({"email": user_data["email"]})
            if existing:
                results["errors"].append({"email": user_data["email"], "error": "User already exists"})
                continue
            
            # Create user
            user_doc = {
                "user_id": str(uuid.uuid4()),
                "email": user_data["email"],
                "first_name": user_data["first_name"],
                "last_name": user_data["last_name"],
                "role": user_data["role"],
                "password": get_password_hash(user_data.get("password", "TempPass123!")),
                "is_active": True,
                "created_at": datetime.utcnow(),
                "created_by": current_user["id"]
            }
            
            await db.users.insert_one(user_doc)
            results["created"] += 1
            
        except Exception as e:
            results["errors"].append({"email": user_data.get("email", "unknown"), "error": str(e)})
    
    return results

@api_router.post("/bulk/questions")
async def bulk_import_questions(operation: BulkOperation, current_user: dict = Depends(get_current_user)):
    """Bulk import questions"""
    if current_user["role"] not in ["Administrator", "Regional Director"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if operation.operation_type != "import_questions":
        raise HTTPException(status_code=400, detail="Invalid operation type")
    
    questions_data = operation.data.get("questions", [])
    results = {"imported": 0, "errors": []}
    
    for question_data in questions_data:
        try:
            # Validate question
            if not all(k in question_data for k in ["question_text", "question_type", "category_id"]):
                results["errors"].append({"question": question_data.get("question_text", "unknown")[:50], "error": "Missing required fields"})
                continue
            
            # Create question
            question_doc = {
                "question_id": str(uuid.uuid4()),
                "question_text": question_data["question_text"],
                "question_type": question_data["question_type"],
                "category_id": question_data["category_id"],
                "difficulty": question_data.get("difficulty", "medium"),
                "options": question_data.get("options", []),
                "correct_answer": question_data.get("correct_answer"),
                "explanation": question_data.get("explanation"),
                "status": "approved",  # Auto-approve bulk imports
                "created_at": datetime.utcnow(),
                "created_by": current_user["id"]
            }
            
            await db.questions.insert_one(question_doc)
            results["imported"] += 1
            
        except Exception as e:
            results["errors"].append({"question": question_data.get("question_text", "unknown")[:50], "error": str(e)})
    
    return results

@api_router.get("/bulk/export/questions")
async def export_questions(category_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Export questions in bulk"""
    if current_user["role"] not in ["Administrator", "Regional Director"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {"status": "approved"}
    if category_id:
        query["category_id"] = category_id
    
    questions = []
    async for question in db.questions.find(query):
        questions.append({
            "question_text": question["question_text"],
            "question_type": question["question_type"],
            "category_id": question["category_id"],
            "difficulty": question.get("difficulty"),
            "options": question.get("options", []),
            "correct_answer": question.get("correct_answer"),
            "explanation": question.get("explanation")
        })
    
    return {"questions": questions, "total": len(questions)}

# System Configuration APIs
@api_router.post("/system/config")
async def create_system_config(config: SystemConfig, current_user: dict = Depends(get_current_user)):
    """Create or update system configuration"""
    if current_user["role"] != "Administrator":
        raise HTTPException(status_code=403, detail="Access denied")
    
    config_doc = {
        "config_id": str(uuid.uuid4()),
        "category": config.category,
        "key": config.key,
        "value": config.value,
        "description": config.description,
        "is_active": config.is_active,
        "created_at": datetime.utcnow(),
        "created_by": current_user["id"]
    }
    
    # Check if config already exists
    existing = await db.system_config.find_one({"category": config.category, "key": config.key})
    if existing:
        # Update existing
        await db.system_config.update_one(
            {"category": config.category, "key": config.key},
            {"$set": {
                "value": config.value,
                "description": config.description,
                "is_active": config.is_active,
                "updated_at": datetime.utcnow(),
                "updated_by": current_user["id"]
            }}
        )
        return {"message": "Configuration updated successfully"}
    else:
        # Create new
        await db.system_config.insert_one(config_doc)
        return {"message": "Configuration created successfully", "config_id": config_doc["config_id"]}

@api_router.get("/system/config")
async def get_system_configs(category: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get system configurations"""
    if current_user["role"] not in ["Administrator", "Manager"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {"is_active": True}
    if category:
        query["category"] = category
    
    configs = []
    async for config in db.system_config.find(query).sort("category", 1):
        configs.append(serialize_doc(config))
    
    return configs

@api_router.put("/system/config/{category}/{key}")
async def update_system_config(category: str, key: str, update_data: SystemConfigUpdate, current_user: dict = Depends(get_current_user)):
    """Update specific system configuration"""
    if current_user["role"] != "Administrator":
        raise HTTPException(status_code=403, detail="Access denied")
    
    config = await db.system_config.find_one({"category": category, "key": key})
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    update_doc = {
        "value": update_data.value,
        "updated_at": datetime.utcnow(),
        "updated_by": current_user["user_id"]
    }
    
    if update_data.description is not None:
        update_doc["description"] = update_data.description
    if update_data.is_active is not None:
        update_doc["is_active"] = update_data.is_active
    
    await db.system_config.update_one(
        {"category": category, "key": key},
        {"$set": update_doc}
    )
    
    return {"message": "Configuration updated successfully"}

@api_router.get("/system/config/categories")
async def get_config_categories(current_user: dict = Depends(get_current_user)):
    """Get all configuration categories"""
    if current_user["role"] not in ["Administrator", "Manager"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    categories = await db.system_config.distinct("category")
    return {"categories": categories}

# Initialize default system configurations
async def create_default_configs():
    """Create default system configurations"""
    default_configs = [
        {
            "category": "general",
            "key": "system_name",
            "value": "Island Traffic Authority Driver's License Testing System",
            "description": "Official system name"
        },
        {
            "category": "certificates",
            "key": "provisional_license_validity_days",
            "value": "365",
            "description": "Validity period for provisional licenses in days"
        },
        {
            "category": "certificates",
            "key": "full_license_validity_years",
            "value": "5",
            "description": "Validity period for full licenses in years"
        },
        {
            "category": "notifications",
            "key": "enable_email_notifications",
            "value": "true",
            "description": "Enable email notifications for important events"
        },
        {
            "category": "security",
            "key": "session_timeout_minutes",
            "value": "30",
            "description": "User session timeout in minutes"
        }
    ]
    
    for config in default_configs:
        existing = await db.system_config.find_one({
            "category": config["category"],
            "key": config["key"]
        })
        
        if not existing:
            config_doc = {
                "config_id": str(uuid.uuid4()),
                "category": config["category"],
                "key": config["key"],
                "value": config["value"],
                "description": config["description"],
                "is_active": True,
                "created_at": datetime.utcnow(),
                "created_by": "system"
            }
            await db.system_config.insert_one(config_doc)

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

# =============================================================================
# STARTUP AND SHUTDOWN HANDLERS
# =============================================================================

logger = logging.getLogger(__name__)

async def create_default_admin():
    """Create default admin account if it doesn't exist"""
    admin_email = "admin@ita.gov"
    admin_password = "admin123"
    
    # Check if admin already exists
    existing_admin = await db.users.find_one({"email": admin_email})
    if existing_admin:
        logger.info("Default admin account already exists")
        return
    
    # Create default admin account
    hashed_password = get_password_hash(admin_password)
    admin_doc = {
        "id": str(uuid.uuid4()),
        "email": admin_email,
        "hashed_password": hashed_password,
        "full_name": "System Administrator",
        "role": "Administrator",
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    await db.users.insert_one(admin_doc)
    logger.info(f"✅ Default admin account created: {admin_email}")
    logger.info(f"🔑 Admin password: {admin_password}")

@app.on_event("startup")
async def startup_event():
    """Run startup tasks"""
    await create_default_admin()
    await create_default_configs()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()