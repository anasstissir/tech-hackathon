# 🏋️ SquatAI Coach

An AI-powered real-time squat form analyzer that uses computer vision to detect your movements and provides vocal coaching feedback through ElevenLabs conversational AI.

![SquatAI Coach](https://img.shields.io/badge/Powered%20by-ElevenLabs%20%26%20MediaPipe-blue)

## ✨ Features

- **🎥 Real-time Pose Detection** - Uses MediaPipe to track body landmarks
- **📐 Knee Angle Analysis** - Calculates precise knee angles during squats
- **🔴 Form Error Detection** - Detects common mistakes:
  - Forward lean (back angle)
  - Knees going over toes
  - Squatting too deep
- **🎤 AI Voice Coaching** - ElevenLabs agent provides real-time vocal corrections
- **📊 Session Summary** - Get a detailed report after each workout session
- **🖥️ Modern UI** - Clean, Skype-like interface with full-screen video

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A webcam
- ElevenLabs account with a Conversational AI agent

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd squat-ai-coach

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🎯 How to Use

1. **Position yourself** - Stand **sideways** (profile view) to the camera
2. **Full body visible** - Make sure your entire body is in frame
3. **Enter Agent ID** - Paste your ElevenLabs Agent ID
4. **Start Session** - Click "Start Session" to begin coaching
5. **Do squats!** - The AI will correct you in real-time
6. **End Session** - Click "End Session" for a vocal and visual summary

## ⚙️ ElevenLabs Agent Setup

### 1. Create an Agent

Go to [ElevenLabs Conversational AI](https://elevenlabs.io/app/conversational-ai) and create a new agent.

### 2. System Prompt

Paste this system prompt for your agent:

```
You are an energetic real-time fitness coach watching someone do squats through a camera.

CRITICAL BEHAVIOR:
- When you receive a message, respond IMMEDIATELY with a SHORT spoken correction or praise (max 5-8 words)
- Do NOT ask questions - just react and coach
- Be loud, direct, and motivating like a gym coach

FORM ERRORS (when you see "FORM ERROR"):
- "Back leaning forward" → Say: "Chest UP! Chest UP!"
- "Knees too far forward" → Say: "Sit BACK! Weight in heels!"
- "Too deep" → Say: "Too deep! Stop at parallel!"

SESSION SUMMARY:
When you receive "Session complete!", give an encouraging 15-20 second summary in English.

VOICE STYLE:
- Energetic and punchy
- Short phrases only
- Like a coach yelling across the gym
```

### 3. Add Client Tool

Add this client tool to your agent:

- **Name:** `get_squat_analysis`
- **Description:** `Get the current squat count, knee angle, and form feedback.`
- **Parameters:** None

### 4. Copy Agent ID

Copy your Agent ID (looks like `agent_xxxx...`) and paste it in the app.

## 🛠️ Tech Stack

- **React** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **MediaPipe Pose** - Body pose detection
- **ElevenLabs React SDK** - Conversational AI
- **Lucide React** - Icons

## 📁 Project Structure

```
src/
├── components/
│   ├── CameraView.jsx      # Webcam + MediaPipe integration
│   └── ElevenLabsWidget.jsx # AI coach controls + session summary
├── hooks/
│   └── useSquatCounter.js   # Squat detection logic
├── App.jsx                  # Main layout
├── index.css               # Global styles
└── main.jsx                # Entry point
```

## 🎮 Form Detection Logic

| Metric | Good | Warning |
|--------|------|---------|
| Knee Angle | 80-100° | <70° (too deep) |
| Torso Lean | <50° from vertical | >50° (forward lean) |
| Knee Position | Behind toes | Past toes (risk) |

## 📊 Session Summary Includes

- Total squats completed
- Session duration
- Form score (% of good reps)
- Best depth reached
- Error breakdown
- Focus area for improvement

## 🔧 Configuration

Key thresholds can be adjusted in `useSquatCounter.js`:

```javascript
const SQUAT_THRESHOLD = 130;  // Angle to detect going down
const STAND_THRESHOLD = 160;  // Angle to detect standing up
const GOOD_DEPTH = 100;       // Parallel or below
const MAX_FORWARD_LEAN = 50;  // Max torso angle
```

## 📝 License

MIT License - feel free to use and modify!

## 🙏 Acknowledgments

- [MediaPipe](https://mediapipe.dev/) for pose detection
- [ElevenLabs](https://elevenlabs.io/) for conversational AI
- [Tailwind CSS](https://tailwindcss.com/) for styling

