"use client";

import { useState } from "react";
import Image from "next/image";
import {
  generateCaptionsForFlavor,
  type CaptionGenerationResult,
  type StepDebugInfo,
  type FlavorWarning,
} from "@/lib/actions/caption-generation";

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

function StepChainDebug({ steps, warnings }: { steps?: StepDebugInfo[]; warnings?: FlavorWarning[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!steps?.length && !warnings?.length) return null;

  const errorCount = warnings?.filter(w => w.type === "error").length ?? 0;
  const warningCount = warnings?.filter(w => w.type === "warning").length ?? 0;

  return (
    <div className="border border-gray-200/80 dark:border-white/[0.06] rounded-xl overflow-hidden bg-white dark:bg-[#1a1f2e]/80 shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50/80 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-black/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Step Chain Debug
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full font-medium">
            {steps?.length ?? 0} steps
          </span>
          {errorCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-full">
              {errorCount} error{errorCount !== 1 ? "s" : ""}
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full">
              {warningCount} warning{warningCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="p-5 space-y-5 bg-white dark:bg-[#141820]/50">
          {/* Warnings */}
          {warnings && warnings.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                Configuration Issues
              </h4>
              <div className="space-y-2">
                {warnings.map((warning, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 text-sm px-4 py-3 rounded-lg ${
                      warning.type === "error"
                        ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20"
                        : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
                    }`}
                  >
                    {warning.type === "error" ? (
                      <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span>{warning.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Steps Table */}
          {steps && steps.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                Step Chain
              </h4>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/[0.06]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-white/[0.06]">
                      <th className="py-2.5 px-3 text-left font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider text-[10px]">#</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider text-[10px]">Order</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider text-[10px]">Step Type</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider text-[10px]">Model</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider text-[10px]">Input</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider text-[10px]">Output</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider text-[10px]">Temp</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider text-[10px]">Prompts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                    {steps.map((step, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="w-6 h-6 inline-flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-xs font-bold rounded-md">
                            {step.stepNumber}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">{step.orderId}</td>
                        <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300 font-medium">{step.stepType}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 rounded-full text-xs font-medium">
                            {step.model}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300">{step.inputType}</td>
                        <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300">
                          {step.outputType}
                          {i < steps.length - 1 && steps[i + 1]?.inputType !== step.outputType && (
                            <span className="ml-1.5 text-amber-500 dark:text-amber-400" title="Type mismatch with next step">
                              ⚠
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400 font-mono">
                          {step.temperature ?? "—"}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                step.hasSystemPrompt
                                  ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                  : "bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-gray-600"
                              }`}
                            >
                              sys
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                step.hasUserPrompt
                                  ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                  : "bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-gray-600"
                              }`}
                            >
                              user
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CaptionTester({ flavors, images }: Props) {
  const [selectedFlavorId, setSelectedFlavorId] = useState<number | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CaptionGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<{ steps?: StepDebugInfo[]; warnings?: FlavorWarning[] } | null>(null);

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
    setDebugInfo(null);

    const response = await generateCaptionsForFlavor({
      imageId: selectedImageId,
      humorFlavorId: selectedFlavorId,
    });

    if (response.error) {
      setError(response.error);
      // Still show debug info if available
      if (response.data?.steps || response.data?.warnings) {
        setDebugInfo({
          steps: response.data.steps,
          warnings: response.data.warnings,
        });
      }
    } else if (response.data) {
      setResult(response.data);
      setDebugInfo({
        steps: response.data.steps,
        warnings: response.data.warnings,
      });
    }

    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left column - Selection */}
      <div className="space-y-6">
        {/* Humor Flavor Selection */}
        <div className="bg-white/80 dark:bg-[#1a1f2e]/80 backdrop-blur-sm rounded-2xl border border-gray-200/80 dark:border-white/[0.06] p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shadow-sm shadow-violet-500/25">
              1
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Select Humor Flavor
            </h2>
          </div>
          <select
            value={selectedFlavorId ?? ""}
            onChange={(e) => setSelectedFlavorId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-white/[0.08] rounded-xl bg-white dark:bg-[#141820] text-gray-900 dark:text-white focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all text-sm"
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
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black/20 rounded-lg px-3 py-2">
              {selectedFlavor.description || "No description"}
            </p>
          )}
        </div>

        {/* Image Selection */}
        <div className="bg-white/80 dark:bg-[#1a1f2e]/80 backdrop-blur-sm rounded-2xl border border-gray-200/80 dark:border-white/[0.06] p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white text-sm font-bold shadow-sm shadow-pink-500/25">
              2
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Select Test Image
            </h2>
          </div>

          {images.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm bg-gray-50/50 dark:bg-black/20 rounded-xl border border-dashed border-gray-200 dark:border-white/[0.06]">
              No test images available.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-80 overflow-y-auto p-1">
              {images.map((image) => (
                <button
                  type="button"
                  key={image.id}
                  onClick={() => setSelectedImageId(image.id)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                    selectedImageId === image.id
                      ? "border-violet-500 ring-4 ring-violet-500/20 scale-[1.02]"
                      : "border-transparent hover:border-violet-300 dark:hover:border-violet-500/50 hover:scale-[1.01]"
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
                    <div className="w-full h-full bg-gray-100 dark:bg-[#141820] flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No URL</span>
                    </div>
                  )}
                  {selectedImageId === image.id && (
                    <div className="absolute inset-0 bg-violet-500/10 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Image Preview */}
        {selectedImage && (
          <div className="bg-white/80 dark:bg-[#1a1f2e]/80 backdrop-blur-sm rounded-2xl border border-gray-200/80 dark:border-white/[0.06] p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              Selected Image
            </h3>
            <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-[#141820] border border-gray-200 dark:border-white/[0.06]">
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
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {selectedImage.image_description}
              </p>
            )}
          </div>
        )}

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !selectedImageId || !selectedFlavorId}
          className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-xl hover:from-violet-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5 active:translate-y-0"
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
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Generate Caption
            </span>
          )}
        </button>
      </div>

      {/* Right column - Results */}
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-red-700 dark:text-red-400 font-semibold">Error</h3>
                <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
                {selectedFlavor && (
                  <p className="text-red-500/70 dark:text-red-400/70 text-xs mt-2">
                    Flavor: {selectedFlavor.slug} (ID: {selectedFlavor.id})
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Debug info shown on error or success */}
        {debugInfo && (debugInfo.steps?.length || debugInfo.warnings?.length) && (
          <StepChainDebug steps={debugInfo.steps} warnings={debugInfo.warnings} />
        )}

        {result && (
          <div className="bg-white/80 dark:bg-[#1a1f2e]/80 backdrop-blur-sm rounded-2xl border border-gray-200/80 dark:border-white/[0.06] p-6 space-y-6 shadow-sm">
            {/* Generation Info */}
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Flavor:</span>
              <span className="px-3 py-1 bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 rounded-full font-medium">
                {result.humorFlavorSlug}
              </span>
              <span className="text-gray-400 dark:text-gray-500 text-xs">(ID: {result.humorFlavorId})</span>
            </div>

            {/* Primary Caption Preview */}
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
                Generated Caption
              </h2>
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-500/10 dark:to-indigo-500/10 rounded-xl p-5 border border-violet-100 dark:border-violet-500/20">
                <p className="text-lg text-gray-900 dark:text-white leading-relaxed font-medium">
                  {result.primaryCaption}
                </p>
              </div>
            </div>

            {/* All Generated Captions */}
            {result.captions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  All Captions ({result.captions.length})
                </h3>
                <div className="space-y-3">
                  {result.captions.map((caption, index) => (
                    <div
                      key={caption.id}
                      className="border border-gray-200 dark:border-white/[0.06] rounded-xl p-4 bg-gray-50/50 dark:bg-black/20 hover:bg-gray-50 dark:hover:bg-black/30 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-gradient-to-br from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700 text-white rounded-lg text-xs font-bold">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 dark:text-white leading-relaxed">
                            {caption.content}
                          </p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                            <span className="font-mono">ID: {caption.id.slice(0, 8)}...</span>
                            {caption.like_count !== undefined && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                                </svg>
                                {caption.like_count}
                              </span>
                            )}
                            {caption.is_featured && (
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                Featured
                              </span>
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
          <div className="bg-gray-50/50 dark:bg-[#1a1f2e]/50 rounded-2xl p-10 text-center border border-dashed border-gray-200 dark:border-white/[0.06]">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-500/20 dark:to-indigo-500/20 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-violet-500 dark:text-violet-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              Select an image and flavor, then click &quot;Generate Caption&quot; to see results.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
