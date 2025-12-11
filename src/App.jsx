import { CameraView } from './components/CameraView';
import { ElevenLabsWidget } from './components/ElevenLabsWidget';
import { useSquatCounter } from './hooks/useSquatCounter';
import { Activity, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

function App() {
    const { count, angle, stage, feedback, isGoodForm, processLandmarks } = useSquatCounter();
    const [showPanel, setShowPanel] = useState(true);

    // Create a combined state object for the widget
    const squatState = { count, angle, stage, feedback, isGoodForm };

    return (
        <div className="h-screen w-screen skype-bg flex flex-col overflow-hidden">
            
            {/* Top Bar - Minimal */}
            <header className="flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-lg border-b border-gray-200/50 z-20">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
                        <Dumbbell className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-800">SquatAI Coach</h1>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className={`w-2 h-2 rounded-full ${isGoodForm ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                        <span>Live</span>
                    </div>
                </div>
            </header>

            {/* Main Content - Full Screen Video */}
            <div className="flex-1 relative">
                
                {/* Full Screen Camera View */}
                <div className="absolute inset-0 bg-gray-900">
                    <CameraView onPoseDetected={processLandmarks} />
                </div>

                {/* Floating Stats - Top Left */}
                <div className="absolute top-6 left-6 z-10">
                    <div className="glass-dark rounded-2xl p-4 shadow-2xl">
                        <div className="flex items-center gap-6">
                            {/* Squat Count */}
                            <div className="text-center">
                                <div className="text-5xl font-bold text-white tabular-nums">{count}</div>
                                <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Squats</div>
                            </div>
                            <div className="w-px h-12 bg-white/20"></div>
                            {/* Knee Angle */}
                            <div className="text-center">
                                <div className="text-3xl font-bold text-blue-400 tabular-nums">{angle}°</div>
                                <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Angle</div>
                            </div>
                            <div className="w-px h-12 bg-white/20"></div>
                            {/* Phase */}
                            <div className="text-center">
                                <div className={`text-2xl font-bold ${stage === 'DOWN' ? 'text-orange-400' : 'text-green-400'}`}>
                                    {stage === 'DOWN' ? <ChevronDown className="w-8 h-8" /> : <ChevronUp className="w-8 h-8" />}
                                </div>
                                <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">{stage}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feedback Banner - Top Center */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
                    <div className={`px-6 py-3 rounded-full shadow-2xl transition-all duration-300 ${
                        isGoodForm 
                            ? 'bg-green-500/90 text-white' 
                            : 'bg-red-500/90 text-white animate-pulse'
                    }`}>
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5" />
                            <span className="font-semibold text-sm">{feedback}</span>
                        </div>
                    </div>
                </div>

                {/* Side Panel - Collapsible */}
                <div className={`absolute top-6 right-6 bottom-6 z-10 transition-all duration-300 ${showPanel ? 'w-80' : 'w-12'}`}>
                    
                    {/* Toggle Button */}
                    <button 
                        onClick={() => setShowPanel(!showPanel)}
                        className="absolute -left-4 top-4 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors z-20"
                    >
                        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showPanel ? 'rotate-90' : '-rotate-90'}`} />
                    </button>

                    {/* Panel Content */}
                    {showPanel && (
                        <div className="h-full glass rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                            {/* AI Widget */}
                            <div className="flex-1 overflow-y-auto">
                                <ElevenLabsWidget squatState={squatState} />
                            </div>

                            {/* Instructions - Compact */}
                            <div className="p-4 border-t border-gray-200/50 bg-gray-50/50">
                                <div className="text-xs text-gray-500 space-y-1">
                                    <p>📷 Stand <strong>sideways</strong> to the camera</p>
                                    <p>👤 Full body must be visible</p>
                                    <p>🎤 Click Start to begin coaching</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Center - Profile Warning */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
                    <div className="glass-dark px-5 py-2.5 rounded-full text-sm text-white/90 flex items-center gap-2">
                        <span>⚠️</span>
                        <span>Stand <strong>SIDEWAYS</strong> for best detection</span>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default App;
