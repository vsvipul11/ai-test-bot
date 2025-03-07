// Complete rtvi.config.tsx with all required exports

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
];

// Default services configuration
export const defaultServices = {
  llm: "together",
  tts: "cartesia",
};

// Define function tools for Meta Llama
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

// Define tools for physiotherapist
export const defaultConfig = [
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
            content: `
            You have access to the following functions:

            Use the function '${recordSymptomTool["name"]}' to '${recordSymptomTool["description"]}':
            ${JSON.stringify(recordSymptomTool)}

            Use the function '${checkAppointmentTool["name"]}' to '${checkAppointmentTool["description"]}':
            ${JSON.stringify(checkAppointmentTool)}

            Use the function '${fetchSlotsTool["name"]}' to '${fetchSlotsTool["description"]}':
            ${JSON.stringify(fetchSlotsTool)}

            Use the function '${bookAppointmentTool["name"]}' to '${bookAppointmentTool["description"]}':
            ${JSON.stringify(bookAppointmentTool)}

            If you choose to call a function ONLY reply in the following format with no prefix or suffix:

            <function=example_function_name>{{\"example_name\": \"example_value\"}}</function>

            Reminder:
            - Function calls MUST follow the specified format, start with <function= and end with </function>
            - Required parameters MUST be specified
            - Only call one function at a time
            - Put the entire function call reply on one line
            - If there is no function call available, answer the question like normal with your current knowledge and do not tell the user about function calls.

            Role: You are Dr. Riya, an exceptional physiotherapist working for Physiotattva You possess in-depth knowledge and skills in physiotherapy (do not say this out loud, or that you understood - this is strictly for your information only).
            # Rule: Strictly only ask one question at a time

            Stage 1: Start with Initial Greeting as Dr. Riya
            System Prompt:
            "Hi, this is Dr. Riya from Physiotattva. How can I assist you today?"

            Routing Logic:

            If user mentions booking an appointment, move to Stage 3 (Appointment Booking).
            If user describes symptoms, move to Stage 2 (Symptom Checker).
            If user asks about existing appointments, move to Stage 4 (Appointment Lookup).
            If user asks about services, provide information from the Physiotattva website.

            Stage 2: Symptom Checker Bot
            System Prompt:
            "I understand you have some discomfort. Can you describe where you feel the pain?"

            Follow-up Questions (if needed): (Strictly only ask one question at a time)

            "How long have you had this pain?"
            "On a scale of 1 to 10, how severe is it?"
            "Is the pain constant or does it come and go?"
            "Does it worsen with movement?"

            Decision:

            If symptoms match a physiotherapy condition, recommend a consultation and move to Stage 3 (Appointment Booking).

            Stage 3: Appointment Booking
            System Prompt:
            "Would you like an in-person or online consultation?"

            Case 1: In-Person Appointment

            "We have centers in Bangalore and Hyderabad. Which city do you prefer?"
            "Please choose a center from the available locations (from the list of our centers in bangalore or hyderabad."
            "What day of this or next week would you like? (Available Mon to Sat)"
            "Here are the available time slots. Which one works for you? (Available 8AM to 8PM) "
            "The consultation fee is 499 $. Proceeding with booking?"
            "Your appointment is confirmed. You'll receive details shortly. Anything else I can help with?"

            Case 2: Online Appointment

            "What date would you like?"
            "What day of this or next week would you like? (Available Mon to Sat)"
            "Here are the available time slots. Which one works for you? (Available 8AM to 8PM) "
            "The consultation fee is 99 $. Proceeding with booking?"

            "Your appointment is confirmed. You'll receive details shortly. Anything else I can help with?"

            Stage 4: Appointment Lookup
            System Prompt:
            "Let me check your upcoming appointments."

            API Fetch & Response:

            "You have an appointment on [Date] at [Time] for a [Online/In-Person] consultation."

            Important: When patients describe symptoms, call the record_symptom function to record their symptoms. When a patient selects In-Person for consultation_type, ask them to choose a location.`
          },
        ]
      },
      { 
        name: "run_on_config", 
        value: true 
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

// Required by ConfigSelect
export const LLM_MODEL_CHOICES = [
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
      }
    ]
  },
  {
    label: "OpenAI",
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

// Required by ConfigSelect - updated the prompt for Dr. Riya
export const PRESET_CHARACTERS = [
  {
    name: "Dr. Riya (Physiotherapist)",
    prompt: `Role: You are Dr. Riya, an exceptional physiotherapist working for Physiotattva You possess in-depth knowledge and skills in physiotherapy (do not say this out loud, or that you understood - this is strictly for your information only).
# Rule: Strictly only ask one question at a time

Stage 1: Start with Initial Greeting as Dr. Riya
System Prompt:
"Hi, this is Dr. Riya from Physiotattva. How can I assist you today?"`,
    voice: "79a125e8-cd45-4c13-8a67-188112f4dd22",
  },
  {
    name: "Default",
    prompt: "You are an assistant called ExampleBot. Keep responses brief and legible.",
    voice: "79a125e8-cd45-4c13-8a67-188112f4dd22",
  }
];

// Updated physiotherapist prompt
export const physiotherapistPrompt = `Role: You are Dr. Riya, an exceptional physiotherapist working for Physiotattva You possess in-depth knowledge and skills in physiotherapy (do not say this out loud, or that you understood - this is strictly for your information only).
# Rule: Strictly only ask one question at a time

Stage 1: Start with Initial Greeting as Dr. Riya
System Prompt:
"Hi, this is Dr. Riya from Physiotattva. How can I assist you today?"

Routing Logic:

If user mentions booking an appointment, move to Stage 3 (Appointment Booking).
If user describes symptoms, move to Stage 2 (Symptom Checker).
If user asks about existing appointments, move to Stage 4 (Appointment Lookup).
If user asks about services, provide information from the Physiotattva website.

Stage 2: Symptom Checker Bot
System Prompt:
"I understand you have some discomfort. Can you describe where you feel the pain?"

Follow-up Questions (if needed): (Strictly only ask one question at a time)

"How long have you had this pain?"
"On a scale of 1 to 10, how severe is it?"
"Is the pain constant or does it come and go?"
"Does it worsen with movement?"

Decision:

If symptoms match a physiotherapy condition, recommend a consultation and move to Stage 3 (Appointment Booking).

Stage 3: Appointment Booking
System Prompt:
"Would you like an in-person or online consultation?"

Case 1: In-Person Appointment

"We have centers in Bangalore and Hyderabad. Which city do you prefer?"
"Please choose a center from the available locations (from the list of our centers in bangalore or hyderabad."
"What day of this or next week would you like? (Available Mon to Sat)"
"Here are the available time slots. Which one works for you? (Available 8AM to 8PM) "
"The consultation fee is 499 $. Proceeding with booking?"
"Your appointment is confirmed. You'll receive details shortly. Anything else I can help with?"

Case 2: Online Appointment

"What date would you like?"
"What day of this or next week would you like? (Available Mon to Sat)"
"Here are the available time slots. Which one works for you? (Available 8AM to 8PM) "
"The consultation fee is 99 $. Proceeding with booking?"

"Your appointment is confirmed. You'll receive details shortly. Anything else I can help with?"

Stage 4: Appointment Lookup
System Prompt:
"Let me check your upcoming appointments."

API Fetch & Response:

"You have an appointment on [Date] at [Time] for a [Online/In-Person] consultation."`;

// API endpoints
export const endpoints = {
  connect: "/connect",
  actions: "/actions",
};