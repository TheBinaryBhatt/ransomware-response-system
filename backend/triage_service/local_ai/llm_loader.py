import os
import logging
from pathlib import Path
import sys

logger = logging.getLogger(__name__)

# Try to import llama-cpp-python with fallback
try:
    from llama_cpp import Llama
    LLAMA_AVAILABLE = True
    logger.info("✅ llama-cpp-python is available")
except ImportError as e:
    LLAMA_AVAILABLE = False
    logger.warning(f"❌ llama-cpp-python not available: {e}")

class LocalAIModel:
    def __init__(self):
        self.model = None
        self.model_loaded = False
        # Use absolute path to avoid confusion
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.model_path = os.path.join(current_dir, '../models/Hermes-2-Pro-Mistral-7B.Q8_0.gguf')
        logger.info(f"🔍 Model path: {self.model_path}")
        self.load_model()
    
    def load_model(self):
        """Load the local AI model with proper error handling"""
        if not LLAMA_AVAILABLE:
            logger.error("llama-cpp-python not installed. Install with: pip install llama-cpp-python")
            return
        
        # Check if model file exists
        if not os.path.exists(self.model_path):
            logger.error(f"❌ Model file not found at: {self.model_path}")
            # List directory contents for debugging
            model_dir = os.path.dirname(self.model_path)
            if os.path.exists(model_dir):
                logger.info(f"📁 Model directory contents: {os.listdir(model_dir)}")
            else:
                logger.error(f"❌ Model directory not found: {model_dir}")
            return
        
        try:
            logger.info(f"🔄 Loading local AI model from: {self.model_path}")
            
            # Try with minimal configuration first
            self.model = Llama(
                model_path=self.model_path,
                n_ctx=2048,  # Reduced context for testing
                n_threads=2,  # Minimal threads
                n_gpu_layers=0,  # CPU only for compatibility
                verbose=True  # Enable verbose for debugging
            )
            
            self.model_loaded = True
            logger.info("✅ Local AI model loaded successfully!")
            
            # Test the model with a simple prompt
            test_result = self.model("Hello", max_tokens=10)
            logger.info(f"🧪 Model test response: {test_result}")
            
        except Exception as e:
            logger.error(f"❌ Failed to load AI model: {e}")
            self.model_loaded = False
    
    def generate_response(self, prompt: str, max_tokens: int = 256) -> str:
        """Generate response using local AI model with fallback"""
        if not self.model_loaded or self.model is None:
            logger.warning("AI model not available, using rule-based fallback")
            return self._rule_based_fallback(prompt)
        
        try:
            # Enhanced prompt for security analysis
            security_prompt = f"""Analyze this security alert:

{prompt}

Provide threat assessment in this format:
Threat Level: [Low/Medium/High/Critical]
Confidence: [0-100]%
Actions: [comma separated actions]
Impact: [brief description]"""

            response = self.model(
                security_prompt,
                max_tokens=max_tokens,
                temperature=0.3,
                top_p=0.9,
                echo=False
            )
            
            if 'choices' in response and len(response['choices']) > 0:
                return response['choices'][0]['text'].strip()
            else:
                return self._rule_based_fallback(prompt)
                
        except Exception as e:
            logger.error(f"AI model inference failed: {e}")
            return self._rule_based_fallback(prompt)
    
    def _rule_based_fallback(self, prompt: str) -> str:
        """Rule-based fallback when AI model fails"""
        prompt_lower = prompt.lower()
        
        # Simple rule-based analysis
        if any(word in prompt_lower for word in ['ransomware', 'encryption', '.locked', 'wannacry']):
            return "Threat Level: Critical\nConfidence: 85%\nActions: Isolate system, Backup data, Contact IR team\nImpact: Data loss, system compromise, financial damage"
        elif any(word in prompt_lower for word in ['malware', 'trojan', 'virus', 'backdoor']):
            return "Threat Level: High\nConfidence: 75%\nActions: Scan system, Quarantine file, Update AV\nImpact: System infection, data theft, unauthorized access"
        elif any(word in prompt_lower for word in ['brute force', 'failed login', 'ssh attack']):
            return "Threat Level: Medium\nConfidence: 70%\nActions: Block IP, Enable MFA, Review logs\nImpact: Unauthorized access attempt, potential compromise"
        else:
            return "Threat Level: Low\nConfidence: 50%\nActions: Monitor, Gather more info\nImpact: Minimal, requires investigation"

# Global model instance
local_ai_model = LocalAIModel()

# Test the model when this module is run directly
if __name__ == "__main__":
    print("🧪 Testing AI Model Loader...")
    print(f"Model loaded: {local_ai_model.model_loaded}")
    if local_ai_model.model_loaded:
        test_prompt = "Ransomware detected encrypting files with .locked extension"
        result = local_ai_model.generate_response(test_prompt)
        print(f"Test result: {result}")