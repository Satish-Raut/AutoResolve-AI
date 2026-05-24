import google.generativeai as genai
import json
import re
from datetime import datetime
from ..config import GEMINI_API_KEY

# Initialize the Gemini SDK
is_api_ready = False
if GEMINI_API_KEY and not GEMINI_API_KEY.startswith("your_actual"):
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        is_api_ready = True
        print("Gemini API configured successfully.")
    except Exception as e:
        print(f"Error configuring Gemini API: {e}. Falling back to Mock Mode.")

class BaseAgent:
    def __init__(self, name: str, system_instruction: str):
        self.name = name
        self.system_instruction = system_instruction
        self.mock_mode = not is_api_ready

    def clean_json_response(self, text: str) -> str:
        """Cleans markdown code fences from JSON strings if present."""
        text = text.strip()
        # Remove ```json ... ``` tags
        match = re.search(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL)
        if match:
            return match.group(1).strip()
        return text

    def call_gemini(self, prompt: str, json_format: bool = False) -> str:
        """Calls the Gemini model with a system prompt and custom instructions."""
        if self.mock_mode:
            raise NotImplementedError("Running in Mock Mode. Implement fallback in subclasses.")
            
        try:
            # Check for older library versions that don't support system_instruction in constructor
            try:
                model = genai.GenerativeModel(
                    model_name="gemini-2.5-flash",
                    system_instruction=self.system_instruction
                )
                full_prompt = prompt
            except TypeError as te:
                if "unexpected keyword argument 'system_instruction'" in str(te):
                    # Fallback for older google-generativeai SDK versions: prepend to prompt
                    model = genai.GenerativeModel(model_name="gemini-2.5-flash")
                    full_prompt = f"System Instruction:\n{self.system_instruction}\n\nUser Prompt:\n{prompt}"
                else:
                    raise te
            
            # Configure response schema if JSON output is requested
            generation_config = {}
            if json_format:
                generation_config = {"response_mime_type": "application/json"}
                
            try:
                response = model.generate_content(
                    full_prompt,
                    generation_config=generation_config
                )
            except Exception as e:
                err_str = str(e)
                # Fallback 1: response_mime_type error
                if "response_mime_type" in err_str or "GenerationConfig" in err_str:
                    print(f"Older SDK: response_mime_type not supported. Retrying standard call for {self.name}.")
                    try:
                        response = model.generate_content(full_prompt, generation_config={})
                    except Exception as e2:
                        # If it also fails on gemini-2.5-flash being 404, fallback to gemini-flash-latest
                        if "gemini-2.5-flash" in str(e2) or "404" in str(e2):
                            print(f"Older SDK: gemini-2.5-flash not found. Falling back to gemini-flash-latest for {self.name}.")
                            legacy_model = genai.GenerativeModel(model_name="gemini-flash-latest")
                            legacy_prompt = f"System Instruction:\n{self.system_instruction}\n\nUser Prompt:\n{prompt}"
                            response = legacy_model.generate_content(legacy_prompt, generation_config={})
                        else:
                            raise e2
                # Fallback 2: gemini-2.5-flash 404/not found error
                elif "gemini-2.5-flash" in err_str or "404" in err_str:
                    print(f"Older SDK: gemini-2.5-flash not found. Falling back to gemini-flash-latest for {self.name}.")
                    legacy_model = genai.GenerativeModel(model_name="gemini-flash-latest")
                    legacy_prompt = f"System Instruction:\n{self.system_instruction}\n\nUser Prompt:\n{prompt}"
                    response = legacy_model.generate_content(legacy_prompt, generation_config={})
                else:
                    raise e

            return response.text
        except Exception as e:
            print(f"Gemini API call failed for {self.name}: {e}. Falling back to Mock Mode.")
            raise e
