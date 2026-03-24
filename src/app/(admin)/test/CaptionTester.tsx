"use client";

import { useState } from "react";
import Image from "next/image";
import { generateCaptionsForFlavor, type CaptionGenerationResult } from "@/lib/actions/caption-generation";

interface HumorFlavorOption {
  id: number;
  slug: string;
  description: string | null;
}

interface ImageOption {
  id: string;
  url: string | null;
  image_description: string | null;
  additional_context: string | null;
}

interface Props {
  flavors: HumorFlavorOption[];
  images: ImageOption[];
}

export default function CaptionTester({ flavors, images }: Props) {
  const [selectedFlavorId, setSelectedFlavorId] = useState<number | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CaptionGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedImage = images.find(i => i.id === selectedImageId);
  const selectedFlavor = flavors.find(f => f.id === selectedFlavorId);

  const handleGenerate = async () => {
    if (!selectedImageId || !selectedFlavorId) {
      setError("Please select both an image and a humor flavor");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const response = await generateCaptionsForFlavor({
      imageId: selectedImageId,
      humorFlavorId: selectedFlavorId,
    });

    if (response.error) {
      setError(response.error);
      // Also set result if there's debug info
      if (response.data) {
        setResult(response.data);
      }
    } else if (response.data) {
      setResult(response.data);
    }

    setLoading(false);
  };

  // Check if we have any meaningful content
  const hasCaption = result?.caption && result.caption.trim().length > 0;
  const hasCaptions = result?.captions && result.captions.length > 0;
  const hasRawResponse = result?.rawApiResponse !== undefined && result?.rawApiResponse !== null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left column - Selection */}
      <div className="space-y-6">
        {/* Humor Flavor Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            1. Select Humor Flavor
          </h2>
          <select
            value={selectedFlavorId ?? ""}
            onChange={(e) => setSelectedFlavorId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select a flavor...</option>
            {flavors.map((flavor) => (
              <option key={flavor.id} value={flavor.id}>
                {flavor.slug}
                {flavor.description ? ` - ${flavor.description}` : ""}
              </option>
            ))}
          </select>
          {selectedFlavor && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              <p>{selectedFlavor.description || "No description"}</p>
              <p className="text-xs text-gray-500 mt-1">ID: {selectedFlavor.id}</p>
            </div>
          )}
        </div>

        {/* Image Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            2. Select Test Image
          </h2>

          {images.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No test images available.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-96 overflow-y-auto">
              {images.map((image) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImageId(image.id)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImageId === image.id
                      ? "border-blue-500 ring-2 ring-blue-500/30"
                      : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  {image.url ? (
                    <Image
                      src={image.url}
                      alt={image.image_description || "Test image"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 25vw, 12vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No URL</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Image Preview */}
        {selectedImage && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Selected Image
            </h3>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
              {selectedImage.url ? (
                <Image
                  src={selectedImage.url}
                  alt={selectedImage.image_description || "Selected image"}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No image URL
                </div>
              )}
            </div>
            {selectedImage.image_description && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {selectedImage.image_description}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">ID: {selectedImage.id}</p>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !selectedImageId || !selectedFlavorId}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating...
            </span>
          ) : (
            "Generate Caption"
          )}
        </button>
      </div>

      {/* Right column - Results */}
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h3 className="text-red-700 dark:text-red-400 font-medium">Error</h3>
            <p className="text-red-600 dark:text-red-300 text-sm mt-1 whitespace-pre-wrap">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
            {/* Request Info */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Request Info
              </h3>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p>Humor Flavor: {result.humorFlavorSlug} (ID: {result.humorFlavorId})</p>
                <p>Pipeline Image ID: {result.imageId}</p>
              </div>
            </div>

            {/* Main caption - only show if we have one */}
            {hasCaption && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Generated Caption
                </h2>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
                  <p className="text-lg text-gray-900 dark:text-white leading-relaxed">
                    {result.caption}
                  </p>
                </div>
              </div>
            )}

            {/* Multiple captions */}
            {hasCaptions && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  All Captions ({result.captions!.length})
                </h3>
                <div className="space-y-2">
                  {result.captions!.map((cap, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-900 rounded p-3">
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        {typeof cap === "string" ? cap : JSON.stringify(cap, null, 2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw API Response - DEBUG */}
            {hasRawResponse && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2">
                  DEBUG: Raw API Response (generate-captions)
                </h3>
                <pre className="text-xs text-gray-700 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-900/20 rounded p-3 overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {JSON.stringify(result.rawApiResponse, null, 2)}
                </pre>
              </div>
            )}

            {/* Debug Info */}
            {result.debugInfo && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                <h3 className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                  DEBUG: All API Responses
                </h3>

                {result.debugInfo.uploadImageResponse !== undefined && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      upload-image-from-url response:
                    </p>
                    <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(result.debugInfo.uploadImageResponse, null, 2)}
                    </pre>
                  </div>
                )}

                {result.debugInfo.generateCaptionsResponse !== undefined && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      generate-captions response:
                    </p>
                    <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(result.debugInfo.generateCaptionsResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* No caption message - only if truly empty */}
            {!hasCaption && !hasCaptions && !hasRawResponse && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  No caption generated (response was empty)
                </p>
              </div>
            )}
          </div>
        )}

        {!error && !result && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-8 text-center">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">
              Select an image and flavor, then click &quot;Generate Caption&quot; to see results.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
