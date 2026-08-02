<?php

namespace Tests\Feature;

use App\Services\OcrService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OcrServiceTest extends TestCase
{
    public function test_groq_vision_handles_400_bad_request()
    {
        config(['payroll.groq_api_key' => 'test_key', 'payroll.groq_vision_model' => 'llama-3.2-11b-vision-preview']);
        Http::fake([
            'api.groq.com/*' => Http::response([], 400),
        ]);

        $service = app(OcrService::class);
        $file = UploadedFile::fake()->image('payslip.png', 500, 500);

        try {
            $service->extract($file->getPathname(), $file->getMimeType());
            $this->fail('Expected HttpException 422');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            $this->assertEquals(422, $e->getStatusCode());
        }
    }

    public function test_groq_vision_handles_413_payload_too_large()
    {
        config(['payroll.groq_api_key' => 'test_key', 'payroll.groq_vision_model' => 'llama-3.2-11b-vision-preview']);
        Http::fake([
            'api.groq.com/*' => Http::response([], 413),
        ]);

        $service = app(OcrService::class);
        $file = UploadedFile::fake()->image('payslip.jpg', 500, 500);

        try {
            $service->extract($file->getPathname(), $file->getMimeType());
            $this->fail('Expected HttpException 413');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            $this->assertEquals(413, $e->getStatusCode());
        }
    }

    public function test_groq_vision_successful_response()
    {
        config(['payroll.groq_api_key' => 'test_key', 'payroll.groq_vision_model' => 'llama-3.2-11b-vision-preview']);
        
        $mockResponse = [
            'choices' => [
                [
                    'message' => [
                        'content' => json_encode([
                            'gross_salary' => 50000,
                            'net_salary' => 45000,
                            'month' => 'May 2026',
                            'basic_salary' => 25000,
                        ])
                    ]
                ]
            ]
        ];

        Http::fake([
            'api.groq.com/*' => Http::response($mockResponse, 200),
        ]);

        $service = app(OcrService::class);
        $file = UploadedFile::fake()->image('payslip.png', 500, 500);

        $result = $service->extract($file->getPathname(), $file->getMimeType());
        $this->assertEquals(50000, $result['data']['gross_salary']);
    }
}
