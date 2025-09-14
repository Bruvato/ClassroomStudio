"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Globe } from "lucide-react";

export default function TestBackendPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testBackendConnection = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    const backendUrl =
      process.env.NEXT_PUBLIC_GRADING_BACKEND_URL || "http://localhost:8000";

    console.log("🚀 Testing backend connection to:", backendUrl);

    try {
      // Test a simple health check first
      console.log("📡 Making health check request...");
      const healthResponse = await fetch(`${backendUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("📡 Health check response status:", healthResponse.status);

      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status}`);
      }

      const healthData = await healthResponse.json();
      console.log("✅ Health check success:", healthData);

      setResult({
        type: "success",
        data: {
          health: healthData,
          backendUrl,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (fetchError: any) {
      console.error("❌ Backend connection failed:", fetchError);
      setError(
        `Failed to connect to backend: ${fetchError.message}. Backend URL: ${backendUrl}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const testGradingEndpoint = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    const backendUrl =
      process.env.NEXT_PUBLIC_GRADING_BACKEND_URL || "http://localhost:8000";

    console.log(
      "🚀 Testing grading endpoint:",
      `${backendUrl}/api/grading/grade-submission`
    );

    try {
      // Test the grading endpoint with mock data
      const mockRequestBody = {
        submission_id: "test_submission_123",
        student_pdf_url: "./frontend/public/student_submission.pdf",
        solution_pdf_url: "./frontend/public/teacher_solution.pdf",
        assignment_context: {
          title: "Test Assignment",
          description: "This is a test assignment",
          total_points: 100,
          subject: "Test Subject",
        },
        max_pages: 5,
        webhook_url: "https://example.com/webhook",
      };

      console.log("📡 Making grading endpoint request...");
      const response = await fetch(
        `${backendUrl}/api/grading/grade-submission`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mockRequestBody),
        }
      );

      console.log("📡 Grading endpoint response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Grading endpoint failed: ${response.status} - ${errorText}`
        );
      }

      const responseData = await response.json();
      console.log("✅ Grading endpoint success:", responseData);

      setResult({
        type: "success",
        data: {
          grading: responseData,
          backendUrl,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (fetchError: any) {
      console.error("❌ Grading endpoint failed:", fetchError);
      setError(
        `Failed to call grading endpoint: ${fetchError.message}. Backend URL: ${backendUrl}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const testGeminiApi = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    const backendUrl =
      process.env.NEXT_PUBLIC_GRADING_BACKEND_URL || "http://localhost:8000";

    console.log(
      "🚀 Testing Gemini API:",
      `${backendUrl}/api/grading/test-gemini-api`
    );

    try {
      console.log("📡 Making Gemini API test request...");
      const response = await fetch(
        `${backendUrl}/api/grading/test-gemini-api`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📡 Gemini API test response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Gemini API test failed: ${response.status} - ${errorText}`
        );
      }

      const responseData = await response.json();
      console.log("✅ Gemini API test success:", responseData);

      setResult({
        type: "success",
        data: {
          geminiApiTest: responseData,
          backendUrl,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (fetchError: any) {
      console.error("❌ Gemini API test failed:", fetchError);
      setError(
        `Failed to test Gemini API: ${fetchError.message}. Backend URL: ${backendUrl}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const testLocalFiles = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    const backendUrl =
      process.env.NEXT_PUBLIC_GRADING_BACKEND_URL || "http://localhost:8000";

    console.log(
      "🚀 Testing local files grading:",
      `${backendUrl}/api/grading/test-local-files`
    );

    try {
      console.log("📡 Making local files test request...");
      const response = await fetch(
        `${backendUrl}/api/grading/test-local-files`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ max_pages: 2 }),
        }
      );

      console.log("📡 Local files test response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Local files test failed: ${response.status} - ${errorText}`
        );
      }

      const responseData = await response.json();
      console.log("✅ Local files test success:", responseData);

      setResult({
        type: "success",
        data: {
          localFilesTest: responseData,
          backendUrl,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (fetchError: any) {
      console.error("❌ Local files test failed:", fetchError);
      setError(
        `Failed to test local files: ${fetchError.message}. Backend URL: ${backendUrl}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Backend Connection Test</h1>
        <p className="text-foreground/70">
          Test the connection between the frontend and the FastAPI backend
          grading service.
        </p>
      </div>

      <div className="space-y-6">
        {/* Connection Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Backend Health Check
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-foreground/70">
              Tests if the backend server is running and accessible.
            </p>

            <div className="flex items-center gap-2">
              <Button
                onClick={testBackendConnection}
                disabled={isLoading}
                size="sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 mr-2" />
                    Test Health Endpoint
                  </>
                )}
              </Button>

              <Button
                onClick={testGradingEndpoint}
                disabled={isLoading}
                size="sm"
                variant="neutral"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing Grading...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Test Grading Endpoint
                  </>
                )}
              </Button>

              <Button
                onClick={testGeminiApi}
                disabled={isLoading}
                size="sm"
                variant="default"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing API...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Test Gemini API
                  </>
                )}
              </Button>

              <Button
                onClick={testLocalFiles}
                disabled={isLoading}
                size="sm"
                variant="default"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Grading PDFs...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Grade Local PDFs
                  </>
                )}
              </Button>
            </div>

            <div className="text-xs text-foreground/60">
              Backend URL:{" "}
              <code className="bg-gray-100 px-1 rounded">
                {process.env.NEXT_PUBLIC_GRADING_BACKEND_URL ||
                  "http://localhost:8000"}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {error && (
          <Alert>
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">Connection Failed</div>
                <div className="text-sm">{error}</div>
                <div className="text-xs text-foreground/60">
                  Make sure the FastAPI backend is running on the expected port.
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">Success!</div>
                <div className="text-sm">Backend connection is working.</div>
                <details className="text-xs">
                  <summary className="cursor-pointer hover:text-foreground">
                    View Response Data
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Debugging Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground/70">
            <div>
              1. <strong>Basic Connection:</strong> Tests if the backend server
              is reachable
            </div>
            <div>
              2. <strong>Health Check:</strong> Tests the /health endpoint
            </div>
            <div>
              3. <strong>Grading Endpoint:</strong> Tests the full grading API
              with mock data
            </div>
            <div>
              4. <strong>Test Gemini API:</strong> Tests AI API connection
              without images
            </div>
            <div>
              5. <strong>Grade Local PDFs:</strong> Tests full grading pipeline
              with PDF files in backend directory
            </div>
            <div>
              6. Check your browser's Network tab to see the actual HTTP
              requests
            </div>
            <div>7. Check the FastAPI server console for logs</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
