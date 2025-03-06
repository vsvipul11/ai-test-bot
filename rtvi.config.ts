// Simplified rtvi.config.tsx

export const BOT_READY_TIMEOUT = 15 * 1000; // 15 seconds
export const defaultBotProfile = "voice_2024_10";
export const defaultMaxDuration = 600;

// Default services configuration based on your weather demo
export const defaultServices = {
  llm: "anthropic", // Using Anthropic like your weather demo
  tts: "cartesia",
};

// Define tools for physiotherapist - following Anthropic's format
export const defaultConfig = [
  {
    service: "tts",
    options: [
      {
        name: "voice",
        value: "79a125e8-cd45-4c13-8a67-188112f4dd22" // Or your preferred voice ID
      },
      {
        name: "language",
        value: "en"
      },
    ]
  },
  {
    service: "llm",
    options: [
      {
        name: "model",
        value: "claude-3-5-sonnet-20240620" // Using Claude like your weather demo
      },
      {
        name: "initial_messages",
        value: [
          {
            role: "system", // For Anthropic, system message is used for instructions
            content: `You are Dr. Riya, a physiotherapist at Physiotattva. Your job is to understand patients' symptoms, provide advice, and help them book appointments.

Start by greeting the patient and asking how you can help them today. Listen for their symptoms or if they want to book an appointment.

When the patient describes symptoms, ask follow-up questions to understand their condition better. Use the record_symptom function silently to track this information.

When helping with appointments, ask if they prefer online or in-person consultation, which day works best, and help them choose a time slot. Then collect their name and phone number.

Keep your responses natural and focused on helping the patient. Do not mention any technical details about functions, parameters, or recording information.

Remember to be professional, helpful, and compassionate in your interactions.`
          },
        ]
      },
      { 
        name: "run_on_config", 
        value: true 
      },
      // Anthropic tools format like your weather demo
      {
        name: "tools",
        value: [
          {
            name: "record_symptom",
            description: "Record a symptom reported by the patient",
            input_schema: {
              type: "object",
              properties: {
                symptom: {
                  type: "string",
                  description: "The symptom reported by the patient"
                },
                severity: {
                  type: "integer",
                  description: "Severity of the symptom on a scale of 1-10 (if provided)",
                  minimum: 1,
                  maximum: 10
                },
                duration: {
                  type: "string",
                  description: "How long the patient has been experiencing this symptom"
                },
                location: {
                  type: "string",
                  description: "The body part or area where the symptom is experienced"
                },
                triggers: {
                  type: "string",
                  description: "Activities or situations that trigger or worsen the symptom"
                }
              },
              required: ["symptom"]
            }
          },
          {
            name: "check_appointment",
            description: "Check upcoming appointments for a patient",
            input_schema: {
              type: "object",
              properties: {
                phone_number: {
                  type: "string",
                  description: "The patient's phone number to look up appointments"
                }
              },
              required: ["phone_number"]
            }
          },
          {
            name: "fetch_slots",
            description: "Fetch available appointment slots based on day and location preferences",
            input_schema: {
              type: "object",
              properties: {
                week_selection: {
                  type: "string",
                  description: "Which week to check",
                  enum: ["this week", "next week"]
                },
                selected_day: {
                  type: "string",
                  description: "Day of the week",
                  enum: ["mon", "tue", "wed", "thu", "fri", "sat"]
                },
                consultation_type: {
                  type: "string",
                  description: "Type of consultation",
                  enum: ["Online", "In-Person"]
                },
                campus_id: {
                  type: "string",
                  description: "Campus location (required for In-Person consultations)",
                  enum: ["Indiranagar", "Koramangala", "Whitefield", "Hyderabad"]
                }
              },
              required: ["selected_day", "consultation_type"]
            }
          },
          {
            name: "book_appointment",
            description: "Book an appointment for a patient",
            input_schema: {
              type: "object",
              properties: {
                week_selection: {
                  type: "string",
                  description: "Which week to book",
                  enum: ["this week", "next week"]
                },
                selected_day: {
                  type: "string",
                  description: "Day of the week",
                  enum: ["mon", "tue", "wed", "thu", "fri", "sat"]
                },
                start_time: {
                  type: "string",
                  description: "Start time of the appointment",
                  pattern: "^[0-9]{1,2}:[0-9]{2} (AM|PM)$"
                },
                consultation_type: {
                  type: "string",
                  description: "Type of consultation",
                  enum: ["Online", "In-Person"]
                },
                campus_id: {
                  type: "string",
                  description: "Campus location (required for In-Person consultations)",
                  enum: ["Indiranagar", "Koramangala", "Whitefield", "Hyderabad"]
                },
                speciality_id: {
                  type: "string",
                  description: "Speciality required",
                  default: "Physiotherapist"
                },
                patient_name: {
                  type: "string",
                  description: "Name of the patient"
                },
                mobile_number: {
                  type: "string",
                  description: "Mobile number of the patient"
                },
                payment_mode: {
                  type: "string",
                  description: "Payment mode",
                  enum: ["pay now", "pay later"],
                  default: "pay now"
                }
              },
              required: ["selected_day", "start_time", "consultation_type", "patient_name", "mobile_number"]
            }
          }
        ]
      }
    ]
  },
  {
    service: "stt",
    options: [
      { 
        name: "model", 
        value: "nova-2-general" 
      },
      { 
        name: "language", 
        value: "en" 
      }
    ]
  }
];

// API endpoints
export const endpoints = {
  connect: "/connect",
  actions: "/actions",
};
