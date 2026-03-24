"use client";

import { useState } from "react";
import {
  createHumorFlavorStep,
  updateHumorFlavorStep,
  deleteHumorFlavorStep,
  reorderHumorFlavorSteps,
  type HumorFlavorStepFormData,
} from "@/lib/actions/humor-flavor-steps";

interface HumorFlavorStep {
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

interface LlmModel {
  id: number;
  name: string;
}

interface LookupWithDescription {
  id: number;
  description: string | null;
  slug: string;
}

interface Lookups {
  llmModels: LlmModel[];
  llmInputTypes: LookupWithDescription[];
  llmOutputTypes: LookupWithDescription[];
  humorFlavorStepTypes: LookupWithDescription[];
  errors: string[];
}

interface Props {
  humorFlavorId: number;
  initialSteps: HumorFlavorStep[];
  lookups: Lookups;
}

const emptyFormData: Omit<HumorFlavorStepFormData, "humor_flavor_id" | "order_by"> = {
  llm_temperature: null,
  llm_input_type_id: 0,
  llm_output_type_id: 0,
  llm_model_id: 0,
  humor_flavor_step_type_id: 0,
  llm_system_prompt: "",
  llm_user_prompt: "",
  description: "",
};

export default function HumorFlavorStepsManager({
  humorFlavorId,
  initialSteps,
  lookups,
}: Props) {
  const [steps, setSteps] = useState<HumorFlavorStep[]>(initialSteps);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Lookup helpers
  function getModelName(id: number) {
    return lookups.llmModels.find(m => m.id === id)?.name ?? `Model #${id}`;
  }

  function getInputTypeName(id: number) {
    const t = lookups.llmInputTypes.find(t => t.id === id);
    return t ? (t.description || t.slug) : `Input #${id}`;
  }

  function getOutputTypeName(id: number) {
    const t = lookups.llmOutputTypes.find(t => t.id === id);
    return t ? (t.description || t.slug) : `Output #${id}`;
  }

  function getStepTypeName(id: number) {
    const t = lookups.humorFlavorStepTypes.find(t => t.id === id);
    return t ? (t.description || t.slug) : `Step Type #${id}`;
  }

  function getLabel(item: LookupWithDescription) {
    return item.description || item.slug;
  }

  function resetForm() {
    setFormData(emptyFormData);
    setIsCreating(false);
    setEditingId(null);
    setError(null);
  }

  async function handleCreate() {
    if (!formData.llm_model_id || !formData.llm_input_type_id || !formData.llm_output_type_id || !formData.humor_flavor_step_type_id) {
      setError("Please select all required fields");
      return;
    }

    setLoading(true);
    setError(null);

    const newOrderBy = steps.length > 0 ? Math.max(...steps.map(s => s.order_by)) + 1 : 1;

    const result = await createHumorFlavorStep({
      ...formData,
      humor_flavor_id: humorFlavorId,
      order_by: newOrderBy,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      window.location.reload();
    }
  }

  async function handleUpdate(id: number) {
    setLoading(true);
    setError(null);

    const result = await updateHumorFlavorStep(id, {
      ...formData,
      humor_flavor_id: humorFlavorId,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      window.location.reload();
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this step?")) return;

    setLoading(true);
    setError(null);

    const result = await deleteHumorFlavorStep(id, humorFlavorId);

    if (result.error) {
      setError(result.error);
    } else {
      setSteps(prev => prev.filter(s => s.id !== id));
    }
    setLoading(false);
  }

  async function handleMoveUp(index: number) {
    if (index === 0 || loading) return;

    const currentSteps = [...steps];
    const newSteps = [...steps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
    setSteps(newSteps);
    setLoading(true);

    const result = await reorderHumorFlavorSteps(humorFlavorId, newSteps.map(s => s.id));

    if (result.error) {
      setError(result.error);
      setSteps(currentSteps);
    }
    setLoading(false);
  }

  async function handleMoveDown(index: number) {
    if (index === steps.length - 1 || loading) return;

    const currentSteps = [...steps];
    const newSteps = [...steps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    setSteps(newSteps);
    setLoading(true);

    const result = await reorderHumorFlavorSteps(humorFlavorId, newSteps.map(s => s.id));

    if (result.error) {
      setError(result.error);
      setSteps(currentSteps);
    }
    setLoading(false);
  }

  function startEdit(step: HumorFlavorStep) {
    setEditingId(step.id);
    setFormData({
      llm_temperature: step.llm_temperature,
      llm_input_type_id: step.llm_input_type_id,
      llm_output_type_id: step.llm_output_type_id,
      llm_model_id: step.llm_model_id,
      humor_flavor_step_type_id: step.humor_flavor_step_type_id,
      llm_system_prompt: step.llm_system_prompt ?? "",
      llm_user_prompt: step.llm_user_prompt ?? "",
      description: step.description ?? "",
    });
    setIsCreating(false);
    setError(null);
  }

  function startCreate() {
    setIsCreating(true);
    setEditingId(null);
    setFormData(emptyFormData);
    setError(null);
  }

  function toggleExpanded(id: number) {
    setExpandedId(prev => prev === id ? null : id);
  }

  return (
    <div className="space-y-3">
      {/* Error display */}
      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded px-3 py-2">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Lookup errors */}
      {lookups.errors.length > 0 && (
        <div className="bg-yellow-900/40 border border-yellow-700 rounded px-3 py-2">
          <p className="text-yellow-300 text-sm font-medium">Missing lookup data:</p>
          {lookups.errors.map((err, i) => (
            <p key={i} className="text-yellow-200 text-xs mt-0.5">{err}</p>
          ))}
        </div>
      )}

      {/* Steps list */}
      {steps.length === 0 && !isCreating && (
        <div className="text-center py-8 text-gray-500">
          No steps yet. Add a step to build your prompt chain.
        </div>
      )}

      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="bg-gray-800/80 rounded border border-gray-700 overflow-hidden"
          >
            {/* Step row */}
            <div className="flex items-center gap-2 px-3 py-2">
              {/* Reorder buttons */}
              <div className="flex flex-col -space-y-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0 || loading}
                  className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Move up"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === steps.length - 1 || loading}
                  className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Move down"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Step number badge */}
              <span className="w-6 h-6 flex items-center justify-center bg-blue-600 text-white text-xs font-bold rounded">
                {index + 1}
              </span>

              {/* Step info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">
                    {getStepTypeName(step.humor_flavor_step_type_id)}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-700 px-1.5 py-0.5 rounded">
                    {getModelName(step.llm_model_id)}
                  </span>
                </div>
                {step.description && (
                  <p className="text-xs text-gray-400 truncate">{step.description}</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleExpanded(step.id)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                  aria-label={expandedId === step.id ? "Collapse" : "Expand"}
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${expandedId === step.id ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(step)}
                  disabled={loading}
                  className="px-2 py-1 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(step.id)}
                  disabled={loading}
                  className="px-2 py-1 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Expanded details */}
            {expandedId === step.id && (
              <div className="px-3 pb-3 pt-1 border-t border-gray-700 bg-gray-900/50">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">Input</span>
                    <p className="text-gray-200">{getInputTypeName(step.llm_input_type_id)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Output</span>
                    <p className="text-gray-200">{getOutputTypeName(step.llm_output_type_id)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Temperature</span>
                    <p className="text-gray-200">{step.llm_temperature ?? "Default"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Order</span>
                    <p className="text-gray-200">{step.order_by}</p>
                  </div>
                </div>
                {step.llm_system_prompt && (
                  <div className="mt-3">
                    <span className="text-xs text-gray-500">System Prompt</span>
                    <pre className="mt-1 p-2 bg-gray-900 rounded text-xs text-gray-300 whitespace-pre-wrap max-h-32 overflow-auto">
                      {step.llm_system_prompt}
                    </pre>
                  </div>
                )}
                {step.llm_user_prompt && (
                  <div className="mt-3">
                    <span className="text-xs text-gray-500">User Prompt</span>
                    <pre className="mt-1 p-2 bg-gray-900 rounded text-xs text-gray-300 whitespace-pre-wrap max-h-32 overflow-auto">
                      {step.llm_user_prompt}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Step editor form */}
      {(isCreating || editingId !== null) && (
        <div className="bg-gray-800 rounded border border-blue-600 overflow-hidden">
          <div className="bg-blue-900/30 px-4 py-2 border-b border-blue-600">
            <h3 className="text-sm font-semibold text-blue-300">
              {isCreating ? "Add New Step" : "Edit Step"}
            </h3>
          </div>

          <div className="p-4 space-y-5">
            {/* Section: Step Configuration */}
            <section>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Step Configuration
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Step Type *</label>
                  <select
                    value={formData.humor_flavor_step_type_id}
                    onChange={(e) => setFormData({ ...formData, humor_flavor_step_type_id: parseInt(e.target.value) })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-600 rounded bg-gray-700 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value={0}>Select...</option>
                    {lookups.humorFlavorStepTypes.map((t) => (
                      <option key={t.id} value={t.id}>{getLabel(t)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Model *</label>
                  <select
                    value={formData.llm_model_id}
                    onChange={(e) => setFormData({ ...formData, llm_model_id: parseInt(e.target.value) })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-600 rounded bg-gray-700 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value={0}>Select...</option>
                    {lookups.llmModels.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Input Type *</label>
                  <select
                    value={formData.llm_input_type_id}
                    onChange={(e) => setFormData({ ...formData, llm_input_type_id: parseInt(e.target.value) })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-600 rounded bg-gray-700 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value={0}>Select...</option>
                    {lookups.llmInputTypes.map((t) => (
                      <option key={t.id} value={t.id}>{getLabel(t)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Output Type *</label>
                  <select
                    value={formData.llm_output_type_id}
                    onChange={(e) => setFormData({ ...formData, llm_output_type_id: parseInt(e.target.value) })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-600 rounded bg-gray-700 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value={0}>Select...</option>
                    {lookups.llmOutputTypes.map((t) => (
                      <option key={t.id} value={t.id}>{getLabel(t)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Section: Prompts */}
            <section>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Prompts
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">System Prompt</label>
                  <textarea
                    value={formData.llm_system_prompt ?? ""}
                    onChange={(e) => setFormData({ ...formData, llm_system_prompt: e.target.value })}
                    rows={3}
                    placeholder="Instructions for the model..."
                    className="w-full px-2 py-1.5 text-sm border border-gray-600 rounded bg-gray-700 text-white font-mono focus:border-blue-500 focus:outline-none resize-y"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">User Prompt</label>
                  <textarea
                    value={formData.llm_user_prompt ?? ""}
                    onChange={(e) => setFormData({ ...formData, llm_user_prompt: e.target.value })}
                    rows={3}
                    placeholder="User message template..."
                    className="w-full px-2 py-1.5 text-sm border border-gray-600 rounded bg-gray-700 text-white font-mono focus:border-blue-500 focus:outline-none resize-y"
                  />
                </div>
              </div>
            </section>

            {/* Section: Advanced */}
            <section>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Advanced
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Temperature</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={formData.llm_temperature ?? ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      llm_temperature: e.target.value ? parseFloat(e.target.value) : null
                    })}
                    placeholder="Default"
                    className="w-full px-2 py-1.5 text-sm border border-gray-600 rounded bg-gray-700 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Description</label>
                  <input
                    type="text"
                    value={formData.description ?? ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional note..."
                    className="w-full px-2 py-1.5 text-sm border border-gray-600 rounded bg-gray-700 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </section>

            {/* Form actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
              {isCreating ? (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={loading}
                  className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating..." : "Create Step"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleUpdate(editingId!)}
                  disabled={loading}
                  className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              )}
              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="px-4 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add step button */}
      {!isCreating && editingId === null && (
        <button
          type="button"
          onClick={startCreate}
          className="w-full py-2.5 text-sm font-medium border border-dashed border-gray-600 rounded text-gray-400 hover:border-blue-500 hover:text-blue-400 hover:bg-blue-900/10 transition-colors"
        >
          + Add Step
        </button>
      )}
    </div>
  );
}
