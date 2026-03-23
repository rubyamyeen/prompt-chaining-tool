// Common audit fields present on all tables
export interface AuditFields {
  created_datetime_utc: string;
  modified_datetime_utc: string;
  created_by_user_id: string;
  modified_by_user_id: string;
}

// Profiles table
export interface Profile extends AuditFields {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_superadmin: boolean;
  is_matrix_admin: boolean;
}

// Humor flavors table
export interface HumorFlavor extends AuditFields {
  id: number;
  description: string | null;
  slug: string;
}

// Humor flavor steps table
export interface HumorFlavorStep extends AuditFields {
  id: number;
  humor_flavor_id: number;
  order_by: number;
  llm_temperature: number | null;
  llm_input_type_id: number;
  llm_output_type_id: number;
  llm_model_id: number;
  humor_flavor_step_type_id: number;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
  description: string | null;
}

// Lookup tables
export interface LlmModel extends AuditFields {
  id: number;
  name: string;
  llm_provider_id: number;
  provider_model_id: string;
  is_temperature_supported: boolean;
}

export interface LlmInputType {
  id: number;
  name: string;
}

export interface LlmOutputType {
  id: number;
  name: string;
}

export interface HumorFlavorStepType {
  id: number;
  name: string;
}

// Images table
export interface Image extends AuditFields {
  id: string;
  url: string | null;
  is_common_use: boolean;
  profile_id: string | null;
  additional_context: string | null;
  is_public: boolean;
  image_description: string | null;
  celebrity_recognition: string | null;
}

// Caption generation result
export interface CaptionResult {
  caption: string;
  stepResults?: StepResult[];
}

export interface StepResult {
  stepId: number;
  stepDescription: string | null;
  output: string;
  processingTimeSeconds?: number;
}
