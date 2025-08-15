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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()