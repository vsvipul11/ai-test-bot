// Final Fixed rtvi.config.tsx

export const BOT_READY_TIMEOUT = 15 * 1000; // 15 seconds
export const defaultBotProfile = "voice_2024_10";
export const defaultMaxDuration = 600;

// Languages configuration
export const LANGUAGES = [
  {
    label: "English",
    value: "en",
    tts_model: "sonic-english",
    stt_model: "nova-2-general",
    default_voice: "79a125e8-cd45-4c13-8a67-188112f4dd22",
  },
  // Other languages...
];

// Default services configuration
export const defaultServices = {
  stt: "deepgram",
  tts: "cartesia",
  llm: "together"
};

// Define tools for use in prompt - USING EXACT FORMAT FROM WEATHER EXAMPLE
const recordSymptomTool = {
  name: "record_symptom",
  description: "Record a symptom reported by the patient",
  parameters: {
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
};

const checkAppointmentTool = {
  name: "check_appointment",
  description: "Check upcoming appointments for a patient",
  parameters: {
    type: "object",
    properties: {
      phone_number: {
        type: "string",
        description: "The patient's phone number to look up appointments"
      }
    },
    required: ["phone_number"]
  }
};

const fetchSlotsTool = {
  name: "fetch_slots",
  description: "Fetch available appointment slots based on day and location preferences",
  parameters: {
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
};

const bookAppointmentTool = {
  name: "book_appointment",
  description: "Book an appointment for a patient",
  parameters: {
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
};

// Dr. Riya prompt with EXACT function calling format from weather example
export const physiotherapistPrompt = `# Role: You are Dr. Riya, an exceptional physiotherapist working for Physiotattva. You possess in-depth knowledge and skills in physiotherapy.
# Rule: Strictly only ask one question at a time

# CRITICAL INSTRUCTION - NEVER REVEAL TECHNICAL DETAILS:
# 1. You must NEVER mention any function names to the user (e.g., DO NOT say "record_symptom", "book_appointment", "check_appointment", "fetch_slots", etc.)
# 2. You must NEVER mention parameter names to the user (e.g., DO NOT say "consultation_type", "patient_name", "payment_mode", "mobile_number", "selected_day", etc.)
# 3. You must NEVER say phrases like "I'm calling a function" or "I'm using a function" or "Let me book that with book_appointment"
# 4. Speak ONLY as a human physiotherapist would, in natural language
# 5. Make all function calls silently in the background without any indication to the user
# 6. Think of these functions as your internal thought process - the user should never know they exist
# 7. When booking appointments, simply ask for the information naturally without mentioning parameter names
# 8. NEVER describe symptoms with formats like "symptom: headache" or "location: forehead" - just speak naturally

# FUNCTION CALLING INSTRUCTIONS:

You have access to the following functions:

Use the function 'record_symptom' to 'Record a symptom reported by the patient':
${JSON.stringify(recordSymptomTool)}

Use the function 'check_appointment' to 'Check upcoming appointments for a patient':
${JSON.stringify(checkAppointmentTool)}

Use the function 'fetch_slots' to 'Fetch available appointment slots based on day and location preferences':
${JSON.stringify(fetchSlotsTool)}

Use the function 'book_appointment' to 'Book an appointment for a patient':
${JSON.stringify(bookAppointmentTool)}

If you choose to call a function ONLY reply in the following format with no prefix or suffix:

<function=example_function_name>{"example_name": "example_value"}</function>

Reminder:
- Function calls MUST follow the specified format, start with <function= and end with </function>
- Required parameters MUST be specified
- Only call one function at a time
- Put the entire function call reply on one line
- If there is no function call available, answer the question like normal with your current knowledge and do not tell the user about function calls

# VIOLATION EXAMPLES - NEVER SAY:
# ❌ "I'll use the book_appointment function to schedule that"
# ❌ "Let me check your appointment with the check_appointment function"
# ❌ "I need your consultation_type and patient_name"
# ❌ "I'm recording your symptom in our system"
# ❌ "Let me fetch available slots for you"
# ❌ "Symptom: headache, severity: 8, location: forehead"

# CORRECT APPROACH - SPEAK NATURALLY:
# ✓ "Let me schedule that appointment for you"
# ✓ "Let me check your existing appointments"
# ✓ "Would you prefer an online or in-person consultation?"
# ✓ "I understand your symptoms, thank you for sharing that"
# ✓ "Here are our available time slots"

Stage 1: Initial Greeting & Routing (Dr. Riya)
System Prompt:
"Hi, this is Dr. Riya from Physiotattva. How can I assist you today?"

Routing Logic:
If user mentions booking an appointment, move to Stage 3 (Appointment Booking).
If user describes symptoms, move to Stage 2 (Symptom Checker).
If user asks about existing appointments, check their appointment using the check_appointment function.
If user asks about services, provide information from the Physiotattva website.

Stage 2: Symptom Checker Bot
System Prompt:
"I understand you have some discomfort. Can you describe where you feel the pain?"

Follow-up Questions (if needed): (Strictly only ask one question at a time)
"How long have you had this pain?"
"On a scale of 1 to 10, how severe is it?"
"Is the pain constant or does it come and go?"
"Does it worsen with movement?"

Remember to use the record_symptom function whenever the patient provides new symptom information.
Important: Do NOT say "I'm recording this symptom" or "Let me make a note of that" - simply record it silently using the function and continue the conversation naturally.

Decision:
If symptoms match a physiotherapy condition, recommend a consultation and move to Stage 3 (Appointment Booking).

Stage 3: Appointment Booking
System Prompt:
"Would you like an in-person or online consultation?"

Case 1: In-Person Appointment
"We have centers in Bangalore and Hyderabad. Which city do you prefer?"
"Please choose a center from the available locations (from the list of our centers in bangalore or hyderabad."

After the user selects location and consultation type:
- Call the fetch_slots function to get available slots for the selected day
- Present the available time slots to the user based on the response
- Let the user pick a time slot
- Ask for their name and phone number
- Use book_appointment to book the appointment
- Confirm the booking details

"What day of this or next week would you like? (Available Mon to Sat)"
[Use fetch_slots to get available times]
"Here are the available time slots. Which one works for you?"
"Could I get your name and phone number for the booking?"
[Use book_appointment to book the slot]
"Your appointment is confirmed. You'll receive details shortly. Anything else I can help with?"

Case 2: Online Appointment
"What day of this or next week would you like? (Available Mon to Sat)"
[Use fetch_slots to get available times]
"Here are the available time slots. Which one works for you?"
"Could I get your name and phone number for the booking?"
[Use book_appointment to book the slot]
"Your appointment is confirmed. You'll receive details shortly. Anything else I can help with?"

Stage 4: Appointment Lookup
When a user asks about their appointment, ask for their phone number if they haven't provided it already. Then use the check_appointment function to look up their appointment details.

After getting the appointment details, summarize the appointment information in a friendly way:
"You have an appointment on [Date] at [Time] for a [Online/In-Person] consultation at [Campus] with [Doctor]."`;

// Default LLM prompt
export const defaultLLMPrompt = `You are a assistant called ExampleBot. You can ask me anything.
Keep responses brief and legible.
Your responses will converted to audio. Please do not include any special characters in your response other than '!' or '?'.
Start by briefly introducing yourself.`;

// Default configuration with EXTREMELY aggressive text filtering
export const defaultConfig = [
  {
    service: "vad",
    options: [
      {
        name: "params",
        value: {
          stop_secs: 0.6
        }
      }
    ]
  },
  {
    service: "tts",
    options: [
      {
        name: "voice",
        value: "79a125e8-cd45-4c13-8a67-188112f4dd22"
      },
      {
        name: "language",
        value: "en"
      },
      {
        name: "text_filter",
        value: {
          filter_code: true,
          filter_functions: true,
          filter_references: true,
          filter_meta: true,
          filter_urls: true,
          filter_xml: true,
          filter_custom: [
            // EXTREME FILTERING: Remove anything with function name
            {
              pattern: ".*?(record_symptom|book_appointment|check_appointment|fetch_slots).*",
              flags: "gis",
              replacement: ""
            },
            // Remove any parameter names
            {
              pattern: ".*?(symptom|severity|duration|location|triggers|patient_name|consultation_type|mobile_number|selected_day|phone_number|campus_id|start_time|payment_mode|week_selection).*",
              flags: "gis",
              replacement: ""
            },
            // Remove any pattern that looks like "parameter: value"
            {
              pattern: "\\w+\\s*:\\s*\\w+",
              flags: "gi",
              replacement: ""
            },
            // Remove function or parameter descriptions
            {
              pattern: "\\b(using|with|call|calling|use|using|execute|executing|record|recording|save|saving|note|noting|log|logging|track|tracking)\\s+\\w+\\s*(function|parameter|tool|method|service|data|information)",
              flags: "gi",
              replacement: ""
            },
            // Remove complete function calls (XML format)
            {
              pattern: "<function=.*?>[\\s\\S]*?</function>",
              flags: "gs",
              replacement: ""
            },
            // Remove any JSON-like structures
            {
              pattern: "\\{.*?\\}",
              flags: "gs", 
              replacement: ""
            },
            // Remove technical verbiage about functions
            {
              pattern: "\\b(function|parameter|tool|api|database|service|system|interface)\\b",
              flags: "gi",
              replacement: ""
            },
            // Remove any references to recording symptoms
            {
              pattern: "\\b(record|recording|note|noting|saving|store|storing|document|documenting|track|tracking)\\b.*?\\b(symptom|pain|discomfort|issue|information|data)\\b",
              flags: "gi",
              replacement: ""
            },
            // Remove any sentences that contain function explanation
            {
              pattern: "(I will|I'll|Let me|I need to|I'm going to|I am going to)\\s+(use|call|work with|make|create|execute).*",
              flags: "gi",
              replacement: ""
            },
            // Remove any sentences about understanding symptoms with details
            {
              pattern: "I understand (that |your |about )?(your |the )?(symptoms?|pain|discomfort|issue)\\s+(is|are|has|have|includes|involves|with|of|at|in).*",
              flags: "gi",
              replacement: "I understand"
            }
          ]
        }
      },
      {
        name: "model",
        value: "sonic-english"
      },
      {
        name: "emotion",
        value: [
          "positivity:low"
        ]
      }
    ]
  },
  {
    service: "llm",
    options: [
      {
        name: "model",
        value: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"
      },
      {
        name: "initial_messages",
        value: [
          {
            role: "system",
            content: physiotherapistPrompt
          }
        ]
      },
      {
        name: "run_on_config",
        value: true
      },
      {
        name: "tools",
        value: [
          {
            type: "function",
            function: {
              name: "record_symptom",
              description: "Record a symptom reported by the patient",
              parameters: {
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
            }
          },
          {
            type: "function",
            function: {
              name: "check_appointment",
              description: "Check upcoming appointments for a patient",
              parameters: {
                type: "object",
                properties: {
                  phone_number: {
                    type: "string",
                    description: "The patient's phone number to look up appointments"
                  }
                },
                required: ["phone_number"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "fetch_slots",
              description: "Fetch available appointment slots based on day and location preferences",
              parameters: {
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
            }
          },
          {
            type: "function",
            function: {
              name: "book_appointment",
              description: "Book an appointment for a patient",
              parameters: {
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

// LLM model choices
export const LLM_MODEL_CHOICES = [
  {
    label: "Together AI",
    value: "together",
    models: [
      {
        label: "Meta Llama 3.1 70B Instruct Turbo",
        value: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"
      },
      {
        label: "Meta Llama 3.1 8B Instruct Turbo",
        value: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"
      },
      {
        label: "Meta Llama 3.1 405B Instruct Turbo",
        value: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo"
      }
    ]
  },
  {
    label: "Anthropic",
    value: "anthropic",
    models: [
      {
        label: "Claude 3.5 Sonnet",
        value: "claude-3-5-sonnet-20240620"
      }
    ]
  },
  {
    label: "Open AI",
    value: "openai",
    models: [
      {
        label: "GPT-4o",
        value: "gpt-4o"
      },
      {
        label: "GPT-4o Mini",
        value: "gpt-4o-mini"
      }
    ]
  }
];

// Preset characters
export const PRESET_CHARACTERS = [
  {
    name: "Default",
    prompt: defaultLLMPrompt,
    voice: "79a125e8-cd45-4c13-8a67-188112f4dd22",
  },
  {
    name: "Dr. Riya (Physiotherapist)",
    prompt: physiotherapistPrompt,
    voice: "79a125e8-cd45-4c13-8a67-188112f4dd22",
  }
];

// API endpoints configuration
export const endpoints = {
  connect: "/connect",
  actions: "/actions",
};
