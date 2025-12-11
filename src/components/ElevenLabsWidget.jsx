import { useEffect, useRef, useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Mic, MicOff, Radio, AlertCircle, FileText, X } from 'lucide-react';

export const ElevenLabsWidget = ({ squatState }) => {
    const [agentId, setAgentId] = useState('agent_4301kc7ahcppehja25tz70qd92e3');
    const [lastMessage, setLastMessage] = useState('');
    const [connectionError, setConnectionError] = useState(null);
    const [showSummary, setShowSummary] = useState(false);
    const [sessionSummary, setSessionSummary] = useState(null);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [waitingForSummary, setWaitingForSummary] = useState(false);
    
    const squatRef = useRef(squatState);
    const lastErrorRef = useRef('');
    const lastErrorTimeRef = useRef(0);
    const waitingForSummaryRef = useRef(false);

    // Session tracking
    const sessionDataRef = useRef({
        startTime: null,
        totalReps: 0,
        errors: {
            back: 0,
            knees: 0,
            tooLow: 0,
            other: 0
        },
        goodFormReps: 0,
        badFormReps: 0,
        minAngle: 180,
        maxDepthReached: 180
    });

    // Minimum 4 seconds between error messages
    const MIN_ERROR_INTERVAL = 4000;

    // Keep ref synced with latest state
    useEffect(() => {
        squatRef.current = squatState;
    }, [squatState]);

    const conversation = useConversation({
        onConnect: () => {
            console.log('✅ Connected to ElevenLabs');
            setConnectionError(null);
            setLastMessage('Ready');
            // Reset session data on connect
            sessionDataRef.current = {
                startTime: Date.now(),
                totalReps: 0,
                errors: { back: 0, knees: 0, tooLow: 0, other: 0 },
                goodFormReps: 0,
                badFormReps: 0,
                minAngle: 180,
                maxDepthReached: 180
            };
        },
        onDisconnect: () => {
            console.log('❌ Disconnected');
            setLastMessage('Disconnected');
        },
        onMessage: (message) => console.log('📨', message),
        onError: (error) => {
            console.error('🚨 Error:', error);
            setConnectionError(error?.message || 'Error');
        },
    });

    const { status, isSpeaking } = conversation;

    // Track session data
    useEffect(() => {
        if (status !== 'connected') return;

        // Track minimum angle (best depth)
        if (squatState.angle < sessionDataRef.current.minAngle) {
            sessionDataRef.current.minAngle = squatState.angle;
        }
    }, [squatState.angle, status]);

    // Track rep completions
    const prevCountRef = useRef(0);
    useEffect(() => {
        if (status !== 'connected') return;
        
        if (squatState.count > prevCountRef.current) {
            prevCountRef.current = squatState.count;
            sessionDataRef.current.totalReps = squatState.count;
            
            if (squatState.isGoodForm) {
                sessionDataRef.current.goodFormReps++;
            } else {
                sessionDataRef.current.badFormReps++;
            }
        }
    }, [squatState.count, squatState.isGoodForm, status]);

    // Track form errors and send corrections
    useEffect(() => {
        if (status !== 'connected' || isSpeaking) return;
        
        if (squatState.isGoodForm) {
            lastErrorRef.current = '';
            return;
        }

        // Extract and count error type
        let errorType = 'OTHER';
        if (squatState.feedback.includes('BACK')) {
            errorType = 'BACK';
            sessionDataRef.current.errors.back++;
        } else if (squatState.feedback.includes('KNEES')) {
            errorType = 'KNEES';
            sessionDataRef.current.errors.knees++;
        } else if (squatState.feedback.includes('TOO LOW') || squatState.feedback.includes('Too deep')) {
            errorType = 'LOW';
            sessionDataRef.current.errors.tooLow++;
        } else {
            sessionDataRef.current.errors.other++;
        }

        const now = Date.now();
        const timeSinceLastError = now - lastErrorTimeRef.current;

        if (errorType !== lastErrorRef.current || timeSinceLastError > MIN_ERROR_INTERVAL) {
            lastErrorRef.current = errorType;
            lastErrorTimeRef.current = now;

            const message = errorType === 'BACK' ? "Back leaning forward, chest up!"
                : errorType === 'KNEES' ? "Knees too far forward, sit back!"
                : errorType === 'LOW' ? "Too deep, come up!"
                : squatState.feedback;

            console.log('📤 Error:', message);
            setLastMessage(message);
            conversation.sendUserMessage(message);
        }
    }, [squatState.isGoodForm, squatState.feedback, status, isSpeaking, conversation]);

    // Generate session summary
    const generateSummary = () => {
        const data = sessionDataRef.current;
        const duration = data.startTime ? Math.round((Date.now() - data.startTime) / 1000) : 0;
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;

        const totalErrors = data.errors.back + data.errors.knees + data.errors.tooLow + data.errors.other;
        const formScore = data.totalReps > 0 
            ? Math.round((data.goodFormReps / data.totalReps) * 100) 
            : 0;

        // Find main issue
        let mainIssue = 'None';
        const maxError = Math.max(data.errors.back, data.errors.knees, data.errors.tooLow);
        if (maxError > 0) {
            if (data.errors.back === maxError) mainIssue = 'Forward lean (back)';
            else if (data.errors.knees === maxError) mainIssue = 'Knees over toes';
            else if (data.errors.tooLow === maxError) mainIssue = 'Going too deep';
        }

        return {
            duration: `${minutes}m ${seconds}s`,
            totalReps: data.totalReps,
            goodFormReps: data.goodFormReps,
            badFormReps: data.badFormReps,
            formScore,
            bestDepth: data.minAngle,
            totalErrors,
            mainIssue,
            errors: data.errors
        };
    };

    const startConversation = async () => {
        if (!agentId) {
            alert("Please enter an Agent ID first");
            return;
        }

        setShowSummary(false);
        setSessionSummary(null);
        prevCountRef.current = 0;

        try {
            await conversation.startSession({
                agentId: agentId,
                clientTools: {
                    get_squat_analysis: {
                        description: "Get the current squat count, knee angle, and form feedback.",
                        parameters: {},
                        handler: async () => {
                            const { count, angle, feedback, isGoodForm, stage } = squatRef.current;
                            return {
                                squat_count: count,
                                current_knee_angle: angle,
                                feedback_string: feedback,
                                is_form_good: isGoodForm,
                                movement_stage: stage
                            };
                        }
                    },
                    get_session_summary: {
                        description: "Get the complete session summary with all stats.",
                        parameters: {},
                        handler: async () => {
                            return generateSummary();
                        }
                    }
                }
            });
        } catch (error) {
            console.error("Failed to start conversation:", error);
        }
    };

    // Watch for agent to finish speaking after summary request
    useEffect(() => {
        // Only trigger when agent STOPS speaking while we're waiting for summary
        if (waitingForSummary && !isSpeaking && sessionSummary) {
            // Agent finished speaking the summary - wait a bit then end
            const timer = setTimeout(async () => {
                console.log('Agent finished summary, ending session...');
                waitingForSummaryRef.current = false;
                setWaitingForSummary(false);
                setShowSummary(true);
                setIsGeneratingSummary(false);
                try {
                    await conversation.endSession();
                } catch (e) {
                    console.log('Session ended');
                }
            }, 2000); // 2 second delay after speaking ends to ensure completion
            
            return () => clearTimeout(timer);
        }
    }, [waitingForSummary, isSpeaking, sessionSummary, conversation]);

    const stopConversation = async () => {
        setIsGeneratingSummary(true);
        
        // Generate summary
        const summary = generateSummary();
        setSessionSummary(summary);

        // Ask agent to give vocal summary before disconnecting
        const summaryMessage = `Session complete! Give a vocal summary: ${summary.totalReps} squats in ${summary.duration}, form score ${summary.formScore}%, best depth ${summary.bestDepth}°, main issue: ${summary.mainIssue}. Give an encouraging summary in English!`;
        
        try {
            conversation.sendUserMessage(summaryMessage);
            setWaitingForSummary(true);
            waitingForSummaryRef.current = true;
            
            // Fallback timeout in case something goes wrong (60 seconds max)
            setTimeout(() => {
                if (waitingForSummaryRef.current) {
                    waitingForSummaryRef.current = false;
                    setWaitingForSummary(false);
                    setShowSummary(true);
                    setIsGeneratingSummary(false);
                    conversation.endSession().catch(() => {});
                }
            }, 60000);
        } catch (error) {
            console.error("Error generating summary:", error);
            setShowSummary(true);
            setIsGeneratingSummary(false);
            await conversation.endSession();
        }
    };

    const isConnected = status === 'connected';

    return (
        <>
            <div className="p-5 w-full">
                <div className="flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Radio className={`w-5 h-5 ${isConnected ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
                            AI Coach
                        </h2>
                        <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            isConnected 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-500'
                        }`}>
                            {isConnected ? '● Connected' : 'Offline'}
                        </div>
                    </div>

                    {/* Connection Error Display */}
                    {connectionError && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {connectionError}
                        </div>
                    )}

                    {/* Agent ID Input */}
                    {!isConnected && !showSummary && (
                        <input
                            type="text"
                            placeholder="Enter Agent ID"
                            value={agentId}
                            onChange={(e) => setAgentId(e.target.value)}
                            className="bg-gray-50 border border-gray-200 text-gray-800 px-4 py-2.5 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    )}

                    {/* Main Action Button */}
                    <div className="flex gap-3">
                        {isConnected ? (
                            <button
                                onClick={stopConversation}
                                disabled={isGeneratingSummary}
                                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-red-300 disabled:to-red-400 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-red-500/25 flex items-center justify-center gap-2"
                            >
                                {isGeneratingSummary ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <MicOff className="w-5 h-5" />
                                        End Session
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={startConversation}
                                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                            >
                                <Mic className="w-5 h-5" />
                                Start Session
                            </button>
                        )}
                    </div>

                    {/* Speaking Indicator */}
                    {isSpeaking && (
                        <div className="flex items-center justify-center gap-3 bg-blue-50 text-blue-600 py-3 rounded-xl">
                            <div className="flex gap-1 h-4 items-end">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="w-1 bg-blue-500 rounded-full animate-[bounce_0.6s_infinite]" style={{ animationDelay: `${i * 0.1}s`, height: `${60 + i * 10}%` }}></div>
                                ))}
                            </div>
                            <span className="text-sm font-medium">Coach is speaking...</span>
                        </div>
                    )}

                    {/* Status Message */}
                    {isConnected && lastMessage && !isSpeaking && (
                        <div className="text-xs text-gray-500 text-center truncate bg-gray-50 py-2 px-3 rounded-lg">
                            {lastMessage}
                        </div>
                    )}

                    {/* View Summary Button */}
                    {!isConnected && sessionSummary && (
                        <button
                            onClick={() => setShowSummary(true)}
                            className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 px-4 rounded-xl text-sm font-medium transition-all"
                        >
                            <FileText className="w-4 h-4" />
                            View Session Summary
                        </button>
                    )}
                </div>
            </div>

            {/* Session Summary Modal */}
            {showSummary && sessionSummary && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <FileText className="w-6 h-6 text-blue-500" />
                                Session Summary
                            </h2>
                            <button
                                onClick={() => setShowSummary(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Stats Grid */}
                        <div className="p-6 space-y-5">
                            {/* Main Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 text-center">
                                    <div className="text-4xl font-bold text-blue-600">{sessionSummary.totalReps}</div>
                                    <div className="text-xs text-blue-600/70 uppercase font-semibold mt-1">Squats</div>
                                </div>
                                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 text-center">
                                    <div className="text-3xl font-bold text-gray-700">{sessionSummary.duration}</div>
                                    <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Duration</div>
                                </div>
                            </div>

                            {/* Form Score */}
                            <div className="bg-gray-50 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-gray-600">Form Score</span>
                                    <span className={`text-2xl font-bold ${
                                        sessionSummary.formScore >= 80 ? 'text-green-600' :
                                        sessionSummary.formScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>{sessionSummary.formScore}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div 
                                        className={`h-3 rounded-full transition-all ${
                                            sessionSummary.formScore >= 80 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                                            sessionSummary.formScore >= 50 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 'bg-gradient-to-r from-red-400 to-red-500'
                                        }`}
                                        style={{ width: `${sessionSummary.formScore}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between mt-3 text-xs text-gray-500">
                                    <span>✅ {sessionSummary.goodFormReps} good reps</span>
                                    <span>❌ {sessionSummary.badFormReps} to improve</span>
                                </div>
                            </div>

                            {/* Best Depth */}
                            <div className="bg-gray-50 rounded-2xl p-5 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-medium text-gray-600">Best Depth</div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        {sessionSummary.bestDepth <= 90 ? '🏆 Excellent!' : 
                                         sessionSummary.bestDepth <= 100 ? '👍 Good' : '📉 Needs work'}
                                    </div>
                                </div>
                                <div className="text-3xl font-mono font-bold text-gray-800">{sessionSummary.bestDepth}°</div>
                            </div>

                            {/* Errors Breakdown */}
                            {sessionSummary.totalErrors > 0 && (
                                <div className="bg-red-50 rounded-2xl p-5">
                                    <div className="text-sm font-medium text-red-700 mb-3">Errors Detected</div>
                                    <div className="space-y-2">
                                        {sessionSummary.errors.back > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-700">🔴 Forward lean (back)</span>
                                                <span className="text-red-600 font-semibold">{sessionSummary.errors.back}x</span>
                                            </div>
                                        )}
                                        {sessionSummary.errors.knees > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-700">🔴 Knees over toes</span>
                                                <span className="text-red-600 font-semibold">{sessionSummary.errors.knees}x</span>
                                            </div>
                                        )}
                                        {sessionSummary.errors.tooLow > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-700">🔴 Too deep</span>
                                                <span className="text-red-600 font-semibold">{sessionSummary.errors.tooLow}x</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Main Issue */}
                            {sessionSummary.mainIssue !== 'None' && (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                                    <div className="text-sm text-amber-700 font-semibold">💡 Focus Area</div>
                                    <div className="text-gray-800 mt-1">{sessionSummary.mainIssue}</div>
                                </div>
                            )}

                            {/* Perfect Session */}
                            {sessionSummary.totalErrors === 0 && sessionSummary.totalReps > 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
                                    <div className="text-3xl mb-2">🎉</div>
                                    <div className="text-green-700 font-bold text-lg">Perfect Session!</div>
                                    <div className="text-sm text-green-600">No form errors detected</div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-100">
                            <button
                                onClick={() => setShowSummary(false)}
                                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/25"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
