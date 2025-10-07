from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import hashlib
import httpx
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION = timedelta(days=7)

# LLM configuration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    personality_profile: Dict = Field(default_factory=dict)
    preferences: Dict = Field(default_factory=dict)

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: User

class PersonalityQuiz(BaseModel):
    question_id: str
    question: str
    answer: str
    weight: float = 1.0

class PersonalityUpdate(BaseModel):
    answers: List[PersonalityQuiz]

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: str = ""
    due_date: Optional[datetime] = None
    priority: str = "medium"  # low, medium, high
    completed: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reminder_sent: bool = False

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    due_date: Optional[datetime] = None
    priority: str = "medium"

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[str] = None
    completed: Optional[bool] = None

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    content: str
    is_ai: bool = False
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    session_id: str

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    message: str
    session_id: str
    suggested_tasks: List[str] = Field(default_factory=list)

# WhatsApp Models
class WhatsAppMessage(BaseModel):
    phone_number: str
    message: str
    message_id: str
    timestamp: int

class WhatsAppResponse(BaseModel):
    reply: Optional[str] = None
    success: bool = True

class WelfareCheckSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    phone_number: str
    enabled: bool = True
    daily_morning_message: bool = True
    morning_time: str = "09:00"  # HH:MM format
    welfare_check_days: int = 3  # Days of inactivity before welfare check
    custom_morning_message: Optional[str] = None
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_welfare_check: Optional[datetime] = None

class WelfareCheckCreate(BaseModel):
    phone_number: str
    daily_morning_message: bool = True
    morning_time: str = "09:00"
    welfare_check_days: int = 3
    custom_morning_message: Optional[str] = None

# Helper Functions
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + JWT_EXPIRATION
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def prepare_for_mongo(data):
    """Convert datetime objects to ISO strings for MongoDB storage"""
    if isinstance(data, dict):
        return {k: prepare_for_mongo(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [prepare_for_mongo(item) for item in data]
    elif isinstance(data, datetime):
        return data.isoformat()
    return data

def parse_from_mongo(item):
    """Convert ISO strings back to datetime objects from MongoDB and handle ObjectIds"""
    from bson import ObjectId
    
    if isinstance(item, ObjectId):
        return str(item)
    elif isinstance(item, dict):
        # Remove MongoDB's _id field if present, as it causes serialization issues
        parsed = {k: parse_from_mongo(v) for k, v in item.items() if k != '_id'}
        # Convert timestamp fields
        for field in ['created_at', 'due_date', 'timestamp']:
            if field in parsed and isinstance(parsed[field], str):
                try:
                    parsed[field] = datetime.fromisoformat(parsed[field].replace('Z', '+00:00'))
                except:
                    pass
        return parsed
    elif isinstance(item, list):
        return [parse_from_mongo(i) for i in item]
    return item

# AI Personality System
def build_personality_prompt(personality_profile: Dict, user_context: str = "") -> str:
    """Build a system prompt based on user's personality profile"""
    
    base_prompt = """
You are an AI companion and life assistant. You adapt your personality and communication style based on the user's profile.
You help with:
- Friendly conversations and emotional support
- Task management and reminders
- Life advice and guidance
- Problem-solving and decision making

Always be:
- Supportive and empathetic
- Helpful but not pushy
- Genuine and warm in your responses
- Proactive in suggesting tasks when relevant
"""
    
    if personality_profile:
        personality_text = "\n\nUser's Personality Profile:\n"
        for key, value in personality_profile.items():
            personality_text += f"- {key}: {value}\n"
        base_prompt += personality_text
    
    if user_context:
        base_prompt += f"\n\nContext: {user_context}"
    
    base_prompt += """

Important: If you notice the user mentioning tasks they need to do, or if they seem overwhelmed, 
subtly suggest they add these as tasks to their to-do list. Be natural about it - don't force it.

End your responses with encouragement when appropriate.
"""
    
    return base_prompt

# Routes

# Authentication Routes
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create new user
    user = User(
        username=user_data.username,
        email=user_data.email
    )
    
    user_dict = user.dict()
    user_dict["password_hash"] = hash_password(user_data.password)
    user_dict = prepare_for_mongo(user_dict)
    
    await db.users.insert_one(user_dict)
    
    # Create token
    token = create_access_token({"sub": user.id})
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user_doc = await db.users.find_one({"username": user_data.username})
    if not user_doc or not verify_password(user_data.password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_doc = parse_from_mongo(user_doc)
    user = User(**{k: v for k, v in user_doc.items() if k != "password_hash"})
    
    token = create_access_token({"sub": user.id})
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user
    )

# Personality Routes
@api_router.get("/personality/quiz")
async def get_personality_quiz():
    """Get personality quiz questions"""
    questions = [
        {"id": "communication", "question": "How do you prefer to communicate?", "options": ["Direct and concise", "Friendly and detailed", "Casual and fun", "Formal and structured"]},
        {"id": "motivation", "question": "What motivates you most?", "options": ["Achievement and success", "Learning and growth", "Helping others", "Creative expression"]},
        {"id": "stress", "question": "How do you handle stress?", "options": ["Take action immediately", "Think it through carefully", "Talk to someone", "Take time alone to process"]},
        {"id": "work_style", "question": "What's your ideal work style?", "options": ["Structured with clear deadlines", "Flexible with creative freedom", "Collaborative with others", "Independent with minimal supervision"]},
        {"id": "goals", "question": "How do you approach goals?", "options": ["Break them into small steps", "Focus on the big picture", "Set ambitious targets", "Keep them flexible and adaptable"]}
    ]
    return {"questions": questions}

@api_router.post("/personality/update")
async def update_personality(personality_data: PersonalityUpdate, user_id: str = Depends(get_current_user_id)):
    """Update user's personality profile"""
    
    # Build personality profile from answers
    profile = {}
    for answer in personality_data.answers:
        profile[answer.question_id] = answer.answer
    
    # Update user document
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"personality_profile": profile}}
    )
    
    return {"message": "Personality profile updated successfully"}

# Chat Routes
@api_router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(chat_request: ChatRequest, user_id: str = Depends(get_current_user_id)):
    """Chat with the AI companion"""
    
    # Get user profile
    user_doc = await db.users.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_doc = parse_from_mongo(user_doc)
    personality_profile = user_doc.get("personality_profile", {})
    
    # Generate session ID if not provided
    session_id = chat_request.session_id or str(uuid.uuid4())
    
    # Get recent chat history for context
    recent_messages = await db.chat_messages.find(
        {"user_id": user_id, "session_id": session_id}
    ).sort("timestamp", -1).limit(10).to_list(10)
    
    # Build context from recent messages
    context = ""
    if recent_messages:
        context = "Recent conversation:\n"
        for msg in reversed(recent_messages):  # Reverse to get chronological order
            sender = "User" if not msg.get("is_ai") else "Assistant"
            context += f"{sender}: {msg.get('content', '')}\n"
    
    # Save user message
    user_message = ChatMessage(
        user_id=user_id,
        content=chat_request.message,
        is_ai=False,
        session_id=session_id
    )
    user_msg_dict = prepare_for_mongo(user_message.dict())
    await db.chat_messages.insert_one(user_msg_dict)
    
    try:
        # Initialize Claude chat
        system_prompt = build_personality_prompt(personality_profile, context)
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_prompt
        ).with_model("anthropic", "claude-4-sonnet-20250514")
        
        # Send message to Claude
        user_msg = UserMessage(text=chat_request.message)
        ai_response = await chat.send_message(user_msg)
        
        # Save AI response
        ai_message = ChatMessage(
            user_id=user_id,
            content=ai_response,
            is_ai=True,
            session_id=session_id
        )
        ai_msg_dict = prepare_for_mongo(ai_message.dict())
        await db.chat_messages.insert_one(ai_msg_dict)
        
        # Extract potential task suggestions (basic keyword detection)
        suggested_tasks = []
        message_lower = chat_request.message.lower()
        task_keywords = ["need to", "have to", "should", "must", "remind me", "don't forget"]
        if any(keyword in message_lower for keyword in task_keywords):
            # This is a simple implementation - in a real app, you'd use more sophisticated NLP
            potential_tasks = ["Follow up on this conversation", "Review mentioned items"]
            suggested_tasks = potential_tasks
        
        return ChatResponse(
            message=ai_response,
            session_id=session_id,
            suggested_tasks=suggested_tasks
        )
        
    except Exception as e:
        logging.error(f"Error in AI chat: {e}")
        # Fallback response
        fallback_response = "I'm having trouble connecting right now, but I'm here to help! Could you please try again in a moment?"
        
        ai_message = ChatMessage(
            user_id=user_id,
            content=fallback_response,
            is_ai=True,
            session_id=session_id
        )
        ai_msg_dict = prepare_for_mongo(ai_message.dict())
        await db.chat_messages.insert_one(ai_msg_dict)
        
        return ChatResponse(
            message=fallback_response,
            session_id=session_id
        )

@api_router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str, user_id: str = Depends(get_current_user_id)):
    """Get chat history for a session"""
    try:
        messages = await db.chat_messages.find(
            {"user_id": user_id, "session_id": session_id}
        ).sort("timestamp", 1).to_list(100)
        
        parsed_messages = []
        for msg in messages:
            try:
                parsed_msg = parse_from_mongo(msg)
                parsed_messages.append(parsed_msg)
            except Exception as e:
                logging.error(f"Error parsing message {msg.get('id', 'unknown')}: {e}")
                # Skip malformed messages but continue processing others
                continue
        
        return {"messages": parsed_messages}
    except Exception as e:
        logging.error(f"Error fetching chat history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch chat history")

# Task Management Routes
@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(user_id: str = Depends(get_current_user_id)):
    """Get all tasks for the current user"""
    tasks = await db.tasks.find({"user_id": user_id}).sort("created_at", -1).to_list(100)
    return [Task(**parse_from_mongo(task)) for task in tasks]

@api_router.post("/tasks", response_model=Task)
async def create_task(task_data: TaskCreate, user_id: str = Depends(get_current_user_id)):
    """Create a new task"""
    task = Task(
        user_id=user_id,
        **task_data.dict()
    )
    
    task_dict = prepare_for_mongo(task.dict())
    await db.tasks.insert_one(task_dict)
    
    return task

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_data: TaskUpdate, user_id: str = Depends(get_current_user_id)):
    """Update a task"""
    # Check if task exists and belongs to user
    existing_task = await db.tasks.find_one({"id": task_id, "user_id": user_id})
    if not existing_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update task
    update_data = {k: v for k, v in task_data.dict().items() if v is not None}
    update_data = prepare_for_mongo(update_data)
    
    await db.tasks.update_one(
        {"id": task_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    # Get updated task
    updated_task = await db.tasks.find_one({"id": task_id, "user_id": user_id})
    return Task(**parse_from_mongo(updated_task))

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user_id: str = Depends(get_current_user_id)):
    """Delete a task"""
    result = await db.tasks.delete_one({"id": task_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task deleted successfully"}

# User profile route
@api_router.get("/profile", response_model=User)
async def get_profile(user_id: str = Depends(get_current_user_id)):
    """Get current user profile"""
    user_doc = await db.users.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_doc = parse_from_mongo(user_doc)
    return User(**{k: v for k, v in user_doc.items() if k != "password_hash"})

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router
app.include_router(api_router)

# CORS middleware
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
