// app/api/symptoms/route.ts
import { NextRequest } from 'next/server';

// In-memory storage - in a production app, you'd use a database
const symptomsStorage: Record<string, SymptomRecord[]> = {};

interface SymptomRecord {
  symptom: string;
  severity?: number;
  duration?: string;
  location?: string;
  triggers?: string;
  timestamp: string;
  sessionId: string;
}

// Helper to create a session ID if it doesn't exist
function getOrCreateSessionId(sessionId?: string): string {
  if (sessionId) return sessionId;
  // Generate a random session ID
  return Math.random().toString(36).substring(2, 15);
}

// GET endpoint to retrieve symptoms for a session
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  
  if (!sessionId) {
    return Response.json(
      { error: 'Session ID is required' },
      { status: 400 }
    );
  }
  
  const symptoms = symptomsStorage[sessionId] || [];
  return Response.json({ symptoms, sessionId });
}

// POST endpoint to store a new symptom
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      symptom, 
      severity, 
      duration, 
      location, 
      triggers, 
      sessionId: requestSessionId 
    } = body;
    
    if (!symptom) {
      return Response.json(
        { error: 'Symptom is required' },
        { status: 400 }
      );
    }
    
    const sessionId = getOrCreateSessionId(requestSessionId);
    
    // Create symptom record
    const symptomRecord: SymptomRecord = {
      symptom,
      severity,
      duration,
      location,
      triggers,
      timestamp: new Date().toISOString(),
      sessionId
    };
    
    // Initialize array if it doesn't exist
    if (!symptomsStorage[sessionId]) {
      symptomsStorage[sessionId] = [];
    }
    
    // Add symptom to storage
    symptomsStorage[sessionId].push(symptomRecord);
    
    return Response.json({ 
      success: true, 
      message: 'Symptom recorded successfully', 
      sessionId,
      symptomRecord
    });
  } catch (error) {
    console.error('Error recording symptom:', error);
    return Response.json(
      { error: 'Failed to record symptom' },
      { status: 500 }
    );
  }
}