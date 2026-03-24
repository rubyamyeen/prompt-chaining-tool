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
    } else if (response.data) {
      setResult(response.data);
    }

    setLoading(false);
  };

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
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {selectedFlavor.description || "No description"}
            </p>
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
            <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
            {/* Generation Info */}
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <span className="font-medium">Flavor:</span>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                  {result.humorFlavorSlug}
                </span>
                <span className="text-gray-400">(ID: {result.humorFlavorId})</span>
              </div>
            </div>

            {/* Primary Caption Preview */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Generated Caption
              </h2>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
                <p className="text-lg text-gray-900 dark:text-white leading-relaxed">
                  {result.primaryCaption}
                </p>
              </div>
            </div>

            {/* All Generated Captions */}
            {result.captions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  All Captions ({result.captions.length})
                </h3>
                <div className="space-y-3">
                  {result.captions.map((caption, index) => (
                    <div
                      key={caption.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs font-medium">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 dark:text-white leading-relaxed">
                            {caption.content}
                          </p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                            <span>ID: {caption.id.slice(0, 8)}...</span>
                            {caption.like_count !== undefined && (
                              <span>{caption.like_count} likes</span>
                            )}
                            {caption.is_featured && (
                              <span className="text-yellow-600 dark:text-yellow-400">Featured</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
