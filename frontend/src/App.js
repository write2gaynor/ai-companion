import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';

// Import shadcn components
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { ScrollArea } from './components/ui/scroll-area';
import { Separator } from './components/ui/separator';
import { Textarea } from './components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Checkbox } from './components/ui/checkbox';
import { Calendar } from './components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';

// Icons
import { MessageCircle, CheckSquare, User, Calendar as CalendarIcon, Plus, Send, Trash2, Edit3, Bot, Clock, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext();

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verify token by getting profile
      getProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const getProfile = async () => {
    try {
      const response = await axios.get(`${API}/profile`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to get profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await axios.post(`${API}/auth/login`, credentials);
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Get the full profile with personality data
      await getProfile();
      
      toast.success('Welcome back!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
      return false;
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API}/auth/register`, userData);
      const { access_token, user: newUser } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(newUser);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      toast.success('Account created successfully!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    toast.info('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Auth Components
const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLogin) {
      await login({ username: formData.username, password: formData.password });
    } else {
      await register(formData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Companion
          </CardTitle>
          <CardDescription>
            Your adaptive AI friend & life assistant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                data-testid="username-input"
                placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                className="transition-all focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {!isLogin && (
              <div>
                <Input
                  data-testid="email-input"
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="transition-all focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            <div>
              <Input
                data-testid="password-input"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="transition-all focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button 
              data-testid="auth-submit-btn"
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              data-testid="toggle-auth-mode"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Personality Quiz Component
const PersonalityQuiz = ({ onComplete }) => {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const response = await axios.get(`${API}/personality/quiz`);
      setQuestions(response.data.questions);
    } catch (error) {
      toast.error('Failed to load personality quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const answerArray = Object.entries(answers).map(([questionId, answer]) => ({
      question_id: questionId,
      question: questions.find(q => q.id === questionId)?.question || '',
      answer
    }));

    try {
      await axios.post(`${API}/personality/update`, { answers: answerArray });
      toast.success('Personality profile updated!');
      onComplete();
    } catch (error) {
      toast.error('Failed to update personality profile');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 flex items-center justify-center">
      <style jsx>{`
        /* Hide the watermark button during quiz */
        [data-testid*="watermark"], 
        .watermark,
        a[href*="emergent"],
        div:has(> a[href*="emergent"]),
        button:contains("Made with Emergent"),
        *[class*="watermark"] {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
          z-index: -1 !important;
        }
      `}</style>
      <div className="w-full max-w-3xl h-[80vh] flex flex-col relative" style={{zIndex: 9999}}>
        <Card className="shadow-xl border-0 bg-white/98 backdrop-blur-sm flex flex-col h-full relative" style={{zIndex: 9999}}>
          <CardHeader className="text-center flex-shrink-0 p-6">
            <CardTitle className="text-2xl font-bold text-blue-600">Let's Get to Know You</CardTitle>
            <CardDescription className="text-gray-600">
              Answer these questions to help your AI companion adapt to your personality
            </CardDescription>
          </CardHeader>
          
          <div className="flex-1 overflow-y-auto px-6 pb-4" style={{maxHeight: 'calc(80vh - 200px)'}}>
            <div className="space-y-6">
              {questions.map((question, questionIndex) => (
                <div key={question.id} className="space-y-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-100">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    Question {questionIndex + 1}: {question.question}
                  </h3>
                  <div className="space-y-3">
                    {question.options.map((option, index) => (
                      <label 
                        key={index} 
                        className={`flex items-center space-x-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                          answers[question.id] === option 
                            ? 'border-blue-500 bg-blue-100 shadow-md ring-2 ring-blue-200' 
                            : 'border-gray-200 hover:border-blue-300 bg-white hover:bg-blue-50'
                        }`}
                        style={{zIndex: 9999, position: 'relative'}}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={answers[question.id] === option}
                          onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                          className="text-blue-600 focus:ring-blue-500 w-5 h-5"
                          style={{zIndex: 9999}}
                        />
                        <span className="text-gray-800 flex-1 font-medium">{option}</span>
                        {answers[question.id] === option && (
                          <div className="text-blue-600 text-lg font-bold">✓</div>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {/* Extra space at bottom */}
              <div className="h-20"></div>
            </div>
          </div>
          
          <div className="flex-shrink-0 p-6 bg-white border-t border-gray-200" style={{zIndex: 9999}}>
            <div className="text-center mb-4">
              <div className="bg-blue-100 rounded-full px-4 py-2 inline-block">
                <span className="text-blue-800 font-medium">
                  Progress: {Object.keys(answers).length} of {questions.length} completed
                </span>
              </div>
            </div>
            <Button
              data-testid="submit-quiz-btn"
              onClick={handleSubmit}
              disabled={Object.keys(answers).length !== questions.length}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 py-4 text-lg font-semibold"
              style={{zIndex: 9999, position: 'relative'}}
            >
              {Object.keys(answers).length === questions.length 
                ? '🎉 Complete Setup & Meet Your AI Companion!' 
                : `Continue Quiz (${Object.keys(answers).length}/${questions.length})`
              }
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

// Chat Component
const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadChatHistory();
    }
  }, [user]);

  const loadChatHistory = async () => {
    try {
      setIsLoadingHistory(true);
      
      // Try to get existing session from localStorage
      const storedSessionId = localStorage.getItem(`chat_session_${user.id}`);
      
      if (storedSessionId) {
        // Load existing chat history
        const response = await axios.get(`${API}/chat/history/${storedSessionId}`);
        if (response.data.messages && response.data.messages.length > 0) {
          setMessages(response.data.messages);
          setSessionId(storedSessionId);
        } else {
          // No messages in this session, start fresh
          initializeNewChat();
        }
      } else {
        // No existing session, start fresh
        initializeNewChat();
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      // If loading fails, start fresh
      initializeNewChat();
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const initializeNewChat = () => {
    const welcomeMessage = {
      id: 'welcome_' + Date.now(),
      content: `Hello ${user?.username}! I'm your AI companion. I'm here to chat, help you manage tasks, and provide life guidance. How are you feeling today?`,
      is_ai: true,
      timestamp: new Date().toISOString()
    };
    setMessages([welcomeMessage]);
    setSessionId(null);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      is_ai: false,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await axios.post(`${API}/chat`, {
        message: inputMessage,
        session_id: sessionId
      });

      const aiMessage = {
        id: Date.now().toString() + '_ai',
        content: response.data.message,
        is_ai: true,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
      setSessionId(response.data.session_id);
      
      // Save session ID to localStorage for persistence
      localStorage.setItem(`chat_session_${user.id}`, response.data.session_id);

      // Show suggested tasks if any
      if (response.data.suggested_tasks?.length > 0) {
        toast.info('I noticed you mentioned some tasks. Consider adding them to your to-do list!');
      }
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Chat error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewConversation = () => {
    // Clear current session
    localStorage.removeItem(`chat_session_${user.id}`);
    setSessionId(null);
    initializeNewChat();
    toast.success('Started new conversation!');
  };

  if (isLoadingHistory) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Loading your conversation history...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">AI Companion</h2>
              <p className="text-sm text-gray-500">
                {messages.length > 1 ? 'Continuing your conversation' : 'Always here to help'}
              </p>
            </div>
          </div>
          <Button
            data-testid="new-conversation-btn"
            variant="outline"
            size="sm"
            onClick={startNewConversation}
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            New Chat
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.is_ai ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.is_ai
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
              }`}>
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.is_ai ? 'text-gray-500' : 'text-blue-100'
                }`}>
                  {format(new Date(message.timestamp), 'HH:mm')}
                </p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-white/80 backdrop-blur-sm p-4">
        <div className="flex space-x-2">
          <Textarea
            data-testid="chat-input"
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 min-h-[60px] resize-none"
            rows={2}
          />
          <Button
            data-testid="send-message-btn"
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isTyping}
            size="icon"
            className="self-end bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Task Management Component
const TaskManager = () => {
  const [tasks, setTasks] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: null,
    priority: 'medium'
  });
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await axios.get(`${API}/tasks`);
      setTasks(response.data);
    } catch (error) {
      toast.error('Failed to load tasks');
    }
  };

  const createTask = async () => {
    try {
      await axios.post(`${API}/tasks`, newTask);
      toast.success('Task created successfully!');
      setNewTask({ title: '', description: '', due_date: null, priority: 'medium' });
      setIsCreating(false);
      loadTasks();
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const updateTask = async (taskId, updates) => {
    try {
      await axios.put(`${API}/tasks/${taskId}`, updates);
      toast.success('Task updated!');
      loadTasks();
      setEditingTask(null);
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await axios.delete(`${API}/tasks/${taskId}`);
      toast.success('Task deleted!');
      loadTasks();
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const toggleComplete = (task) => {
    updateTask(task.id, { completed: !task.completed });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Tasks & Reminders</h2>
        <Button
          data-testid="add-task-btn"
          onClick={() => setIsCreating(true)}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Create Task Form */}
      {isCreating && (
        <Card className="border-2 border-dashed border-blue-300">
          <CardContent className="p-4 space-y-4">
            <Input
              data-testid="task-title-input"
              placeholder="Task title"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
            <Textarea
              data-testid="task-description-input"
              placeholder="Description (optional)"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
            <div className="flex space-x-4">
              <Select value={newTask.priority} onValueChange={(value) => setNewTask({ ...newTask, priority: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newTask.due_date ? format(newTask.due_date, 'PPP') : 'Due date (optional)'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newTask.due_date}
                    onSelect={(date) => setNewTask({ ...newTask, due_date: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex space-x-2">
              <Button
                data-testid="save-task-btn"
                onClick={createTask}
                disabled={!newTask.title.trim()}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              >
                Save Task
              </Button>
              <Button
                data-testid="cancel-task-btn"
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setNewTask({ title: '', description: '', due_date: null, priority: 'medium' });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No tasks yet. Create your first task to get started!</p>
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className={`transition-all hover:shadow-md ${task.completed ? 'opacity-70' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    data-testid={`task-checkbox-${task.id}`}
                    checked={task.completed}
                    onCheckedChange={() => toggleComplete(task)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {task.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        <Button
                          data-testid={`edit-task-${task.id}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTask(task)}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          data-testid={`delete-task-${task.id}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTask(task.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    {task.description && (
                      <p className={`text-sm ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                        {task.description}
                      </p>
                    )}
                    {task.due_date && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        {format(new Date(task.due_date), 'MMM dd, yyyy')}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

// Profile Component
const ProfileSection = () => {
  const { user, logout } = useAuth();
  const [showQuiz, setShowQuiz] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
        <Button
          data-testid="logout-btn"
          variant="outline"
          onClick={logout}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          Logout
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-semibold">
                {user?.username?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{user?.username}</h3>
              <p className="text-gray-500">{user?.email}</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Personality Profile</h4>
            {user?.personality_profile && Object.keys(user.personality_profile).length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(user.personality_profile).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 p-3 rounded-lg">
                    <span className="font-medium text-gray-700 capitalize">{key.replace('_', ' ')}: </span>
                    <span className="text-gray-600">{value}</span>
                  </div>
                ))}
                <Button
                  data-testid="retake-quiz-btn"
                  variant="outline"
                  onClick={() => setShowQuiz(true)}
                  className="w-full mt-2"
                >
                  Retake Personality Quiz
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-4">Complete your personality quiz to help your AI companion adapt to you better.</p>
                <Button
                  data-testid="take-quiz-btn"
                  onClick={() => setShowQuiz(true)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  Take Personality Quiz
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showQuiz && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col relative z-[100]">
            <div className="flex-1 overflow-hidden">
              <PersonalityQuiz onComplete={() => {
                setShowQuiz(false);
                window.location.reload(); // Refresh to show updated profile
              }} />
            </div>
            <div className="p-4 border-t flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setShowQuiz(false)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Dashboard
const Dashboard = () => {
  const { user, loading } = useAuth();
  const [showQuiz, setShowQuiz] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      setProfileLoaded(true);
      // Show personality quiz if user hasn't completed it
      const hasProfile = user.personality_profile && Object.keys(user.personality_profile).length > 0;
      console.log('User profile check:', { hasProfile, profile: user.personality_profile });
      setShowQuiz(!hasProfile);
    }
  }, [user, loading]);

  // Show loading while auth is loading or profile isn't loaded yet
  if (loading || !profileLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (showQuiz) {
    return <PersonalityQuiz onComplete={() => setShowQuiz(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="chat" className="h-screen flex flex-col">
          {/* Header */}
          <div className="border-b bg-white/80 backdrop-blur-sm">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      AI Companion
                    </h1>
                    <p className="text-sm text-gray-500">Welcome back, {user?.username}!</p>
                  </div>
                </div>
                
                <TabsList className="grid grid-cols-3 w-80">
                  <TabsTrigger data-testid="chat-tab" value="chat" className="flex items-center space-x-2">
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat</span>
                  </TabsTrigger>
                  <TabsTrigger data-testid="tasks-tab" value="tasks" className="flex items-center space-x-2">
                    <CheckSquare className="w-4 h-4" />
                    <span>Tasks</span>
                  </TabsTrigger>
                  <TabsTrigger data-testid="profile-tab" value="profile" className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <TabsContent value="chat" className="h-full m-0">
              <div className="h-full">
                <ChatInterface />
              </div>
            </TabsContent>
            
            <TabsContent value="tasks" className="h-full m-0">
              <div className="h-full overflow-y-auto">
                <TaskManager />
              </div>
            </TabsContent>
            
            <TabsContent value="profile" className="h-full m-0">
              <div className="h-full overflow-y-auto">
                <ProfileSection />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<AppContent />} />
          </Routes>
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your AI companion...</p>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <AuthScreen />;
};

export default App;
