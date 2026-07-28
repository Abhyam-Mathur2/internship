<?php

return [
    'groq_api_key' => env('GROQ_API_KEY'),
    'groq_model' => env('GROQ_MODEL', 'qwen/qwen3.6-27b'),
    'groq_vision_model' => env('GROQ_VISION_MODEL', 'qwen/qwen3.6-27b'),
    'ocr_driver' => env('OCR_DRIVER', 'groq'),
    'ocr_space_api_key' => env('OCR_SPACE_API_KEY'),
    'ocr_space_endpoint' => env('OCR_SPACE_ENDPOINT', 'https://api.ocr.space/parse/image'),
    'tesseract_binary' => env('TESSERACT_BINARY', 'tesseract'),
    'max_upload_kb' => (int) env('MAX_PAYSLIP_UPLOAD_KB', 5120),
    'pf_rate' => 0.12,
    'esi_employee_rate' => 0.0075,
    'esi_wage_limit' => 21000,
];
