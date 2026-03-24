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

interface LookupOption {
  id: number;
  name: string;
}

interface Lookups {
  llmModels: LookupOption[];
  llmInputTypes: LookupOption[];
  llmOutputTypes: LookupOption[];
  humorFlavorStepTypes: LookupOption[];
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

  // Helper functions to look up names from lookups
  const getModelName = (id: number) => lookups.llmModels.find(m => m.id === id)?.name ?? `Model #${id}`;
  const getInputTypeName = (id: number) => lookups.llmInputTypes.find(t => t.id === id)?.name ?? `Input #${id}`;
  const getOutputTypeName = (id: number) => lookups.llmOutputTypes.find(t => t.id === id)?.name ?? `Output #${id}`;
  const getStepTypeName = (id: number) => lookups.humorFlavorStepTypes.find(t => t.id === id)?.name ?? `Step Type #${id}`;

  const resetForm = () => {
    setFormData(emptyFormData);
    setIsCreating(false);
    setEditingId(null);
    setError(null);
  };

  const handleCreate = async () => {
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
    } else if (result.data) {
      window.location.reload();
    }

    setLoading(false);
  };

  const handleUpdate = async (id: number) => {
    setLoading(true);
    setError(null);

    const result = await updateHumorFlavorStep(id, {
      ...formData,
      humor_flavor_id: humorFlavorId,
    });

    if (result.error) {
      setError(result.error);
    } else {
      window.location.reload();
    }

    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this step?")) {
      return;
    }

    setLoading(true);
    const result = await deleteHumorFlavorStep(id, humorFlavorId);

    if (result.error) {
      setError(result.error);
    } else {
      setSteps(steps.filter(s => s.id !== id));
    }

    setLoading(false);
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newSteps = [...steps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];

    setSteps(newSteps);
    setLoading(true);

    const result = await reorderHumorFlavorSteps(
      humorFlavorId,
      newSteps.map(s => s.id)
    );

    if (result.error) {
      setError(result.error);
      setSteps(steps); // Revert on error
    }

    setLoading(false);
  };

  const handleMoveDown = async (index: number) => {
    if (index === steps.length - 1) return;

    const newSteps = [...steps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];

    setSteps(newSteps);
    setLoading(true);

    const result = await reorderHumorFlavorSteps(
      humorFlavorId,
      newSteps.map(s => s.id)
    );

    if (result.error) {
      setError(result.error);
      setSteps(steps); // Revert on error
    }

    setLoading(false);
  };

  const startEdit = (step: HumorFlavorStep) => {
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
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Steps list */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="bg-gray-800 rounded-lg shadow border border-gray-700"
          >
            {/* Step header */}
            <div className="flex items-center gap-3 p-4">
              {/* Order controls */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0 || loading}
                  className="p-1 text-gray-400 hover:text-gray-300 disabled:opacity-30"
                  title="Move up"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === steps.length - 1 || loading}
                  className="p-1 text-gray-400 hover:text-gray-300 disabled:opacity-30"
                  title="Move down"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Step number */}
              <div className="w-8 h-8 flex items-center justify-center bg-blue-900/30 text-blue-400 rounded-full text-sm font-medium">
                {index + 1}
              </div>

              {/* Step info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white">
                    {getStepTypeName(step.humor_flavor_step_type_id)}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded">
                    {getModelName(step.llm_model_id)}
                  </span>
                </div>
                {step.description && (
                  <p className="text-sm text-gray-400 truncate mt-1">
                    {step.description}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpandedId(expandedId === step.id ? null : step.id)}
                  className="p-2 text-gray-400 hover:text-gray-300"
                  title={expandedId === step.id ? "Collapse" : "Expand"}
                >
                  <svg
                    className={`w-5 h-5 transition-transform ${expandedId === step.id ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => startEdit(step)}
                  disabled={loading}
                  className="px-3 py-1 text-sm bg-gray-700 text-gray-200 rounded hover:bg-gray-600 disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(step.id)}
                  disabled={loading}
                  className="px-3 py-1 text-sm bg-red-900/30 text-red-400 rounded hover:bg-red-900/50 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Expanded details */}
            {expandedId === step.id && (
              <div className="px-4 pb-4 pt-0 border-t border-gray-700 mt-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                  <div>
                    <span className="text-gray-400">Input Type:</span>
                    <p className="text-white">{getInputTypeName(step.llm_input_type_id)}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Output Type:</span>
                    <p className="text-white">{getOutputTypeName(step.llm_output_type_id)}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Temperature:</span>
                    <p className="text-white">{step.llm_temperature ?? "Default"}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Order:</span>
                    <p className="text-white">{step.order_by}</p>
                  </div>
                </div>
                {step.llm_system_prompt && (
                  <div className="mt-4">
                    <span className="text-sm text-gray-400">System Prompt:</span>
                    <pre className="mt-1 p-3 bg-gray-900 rounded text-sm text-gray-200 whitespace-pre-wrap overflow-x-auto">
                      {step.llm_system_prompt}
                    </pre>
                  </div>
                )}
                {step.llm_user_prompt && (
                  <div className="mt-4">
                    <span className="text-sm text-gray-400">User Prompt:</span>
                    <pre className="mt-1 p-3 bg-gray-900 rounded text-sm text-gray-200 whitespace-pre-wrap overflow-x-auto">
                      {step.llm_user_prompt}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit/Create form */}
      {(isCreating || editingId !== null) && (
        <div className="bg-gray-800 rounded-lg shadow border border-blue-800 p-4">
          <h3 className="text-lg font-medium text-white mb-4">
            {isCreating ? "Add New Step" : "Edit Step"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Step Type *
              </label>
              <select
                value={formData.humor_flavor_step_type_id}
                onChange={(e) => setFormData({ ...formData, humor_flavor_step_type_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
              >
                <option value={0}>Select step type...</option>
                {lookups.humorFlavorStepTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                LLM Model *
              </label>
              <select
                value={formData.llm_model_id}
                onChange={(e) => setFormData({ ...formData, llm_model_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
              >
                <option value={0}>Select model...</option>
                {lookups.llmModels.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Input Type *
              </label>
              <select
                value={formData.llm_input_type_id}
                onChange={(e) => setFormData({ ...formData, llm_input_type_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
              >
                <option value={0}>Select input type...</option>
                {lookups.llmInputTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Output Type *
              </label>
              <select
                value={formData.llm_output_type_id}
                onChange={(e) => setFormData({ ...formData, llm_output_type_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
              >
                <option value={0}>Select output type...</option>
                {lookups.llmOutputTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Temperature
              </label>
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
                className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={formData.description ?? ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                System Prompt
              </label>
              <textarea
                value={formData.llm_system_prompt ?? ""}
                onChange={(e) => setFormData({ ...formData, llm_system_prompt: e.target.value })}
                rows={4}
                placeholder="System prompt..."
                className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white font-mono text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                User Prompt
              </label>
              <textarea
                value={formData.llm_user_prompt ?? ""}
                onChange={(e) => setFormData({ ...formData, llm_user_prompt: e.target.value })}
                rows={4}
                placeholder="User prompt..."
                className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            {isCreating ? (
              <button
                onClick={handleCreate}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Step"}
              </button>
            ) : (
              <button
                onClick={() => handleUpdate(editingId!)}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            )}
            <button
              onClick={resetForm}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-gray-200 rounded-lg hover:bg-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add step button */}
      {!isCreating && editingId === null && (
        <button
          onClick={() => {
            setIsCreating(true);
            setFormData(emptyFormData);
          }}
          className="w-full py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-blue-500 hover:text-blue-400 transition-colors"
        >
          + Add Step
        </button>
      )}
    </div>
  );
}
