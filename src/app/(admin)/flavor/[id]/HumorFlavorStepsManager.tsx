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
    <div className="space-y-4">
      {/* Error display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Lookup errors */}
      {lookups.errors.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <p className="text-amber-700 dark:text-amber-300 text-sm font-medium">Missing lookup data</p>
              {lookups.errors.map((err, i) => (
                <p key={i} className="text-amber-600 dark:text-amber-200/80 text-xs mt-0.5">{err}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Steps list - Empty state */}
      {steps.length === 0 && !isCreating && (
        <div className="text-center py-12 bg-gray-50/50 dark:bg-white/[0.02] rounded-2xl border border-dashed border-gray-200 dark:border-white/[0.06]">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-500/20 dark:to-indigo-500/20 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-violet-500 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No steps yet. Add a step to build your prompt chain.</p>
        </div>
      )}

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="group bg-white dark:bg-[#1a1f2e]/80 rounded-xl border border-gray-200/80 dark:border-white/[0.06] shadow-sm hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-violet-500/5 transition-all duration-300 overflow-hidden"
          >
            {/* Step row */}
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Reorder buttons */}
              <div className="flex flex-col -space-y-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0 || loading}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                  aria-label="Move up"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === steps.length - 1 || loading}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                  aria-label="Move down"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Step number badge - gradient */}
              <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-sm font-bold rounded-lg shadow-sm shadow-violet-500/25">
                {index + 1}
              </div>

              {/* Step info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {getStepTypeName(step.humor_flavor_step_type_id)}
                  </span>
                  <span className="text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded-full font-medium">
                    {getModelName(step.llm_model_id)}
                  </span>
                </div>
                {step.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{step.description}</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => toggleExpanded(step.id)}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
                  aria-label={expandedId === step.id ? "Collapse" : "Expand"}
                >
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${expandedId === step.id ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(step)}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(step.id)}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              </div>

              {/* Always visible expand indicator on mobile */}
              <button
                type="button"
                onClick={() => toggleExpanded(step.id)}
                className="lg:hidden p-2 text-gray-400 dark:text-gray-500"
              >
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${expandedId === step.id ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Expanded details */}
            {expandedId === step.id && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-white/[0.04] bg-gray-50/50 dark:bg-black/20">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-gray-500 dark:text-gray-500 font-medium uppercase tracking-wide text-[10px]">Input</span>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">{getInputTypeName(step.llm_input_type_id)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-gray-500 dark:text-gray-500 font-medium uppercase tracking-wide text-[10px]">Output</span>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">{getOutputTypeName(step.llm_output_type_id)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-gray-500 dark:text-gray-500 font-medium uppercase tracking-wide text-[10px]">Temperature</span>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">{step.llm_temperature ?? "Default"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-gray-500 dark:text-gray-500 font-medium uppercase tracking-wide text-[10px]">Order</span>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">{step.order_by}</p>
                  </div>
                </div>
                {step.llm_system_prompt && (
                  <div className="mt-4">
                    <span className="text-gray-500 dark:text-gray-500 font-medium uppercase tracking-wide text-[10px]">System Prompt</span>
                    <pre className="mt-1.5 p-3 bg-white dark:bg-[#141820] rounded-lg text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-32 overflow-auto border border-gray-200 dark:border-white/[0.06] font-mono">
                      {step.llm_system_prompt}
                    </pre>
                  </div>
                )}
                {step.llm_user_prompt && (
                  <div className="mt-4">
                    <span className="text-gray-500 dark:text-gray-500 font-medium uppercase tracking-wide text-[10px]">User Prompt</span>
                    <pre className="mt-1.5 p-3 bg-white dark:bg-[#141820] rounded-lg text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-32 overflow-auto border border-gray-200 dark:border-white/[0.06] font-mono">
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
        <div className="bg-white dark:bg-[#1a1f2e] rounded-2xl border-2 border-violet-200 dark:border-violet-500/30 shadow-lg shadow-violet-500/10 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-500/10 dark:to-indigo-500/10 px-5 py-3 border-b border-violet-100 dark:border-violet-500/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {isCreating ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  )}
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                {isCreating ? "Add New Step" : "Edit Step"}
              </h3>
            </div>
          </div>

          <div className="p-5 space-y-6">
            {/* Section: Step Configuration */}
            <section>
              <h4 className="text-[10px] font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-3">
                Step Configuration
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Step Type *</label>
                  <select
                    value={formData.humor_flavor_step_type_id}
                    onChange={(e) => setFormData({ ...formData, humor_flavor_step_type_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-[#141820] text-gray-900 dark:text-white focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
                  >
                    <option value={0}>Select...</option>
                    {lookups.humorFlavorStepTypes.map((t) => (
                      <option key={t.id} value={t.id}>{getLabel(t)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Model *</label>
                  <select
                    value={formData.llm_model_id}
                    onChange={(e) => setFormData({ ...formData, llm_model_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-[#141820] text-gray-900 dark:text-white focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
                  >
                    <option value={0}>Select...</option>
                    {lookups.llmModels.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Input Type *</label>
                  <select
                    value={formData.llm_input_type_id}
                    onChange={(e) => setFormData({ ...formData, llm_input_type_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-[#141820] text-gray-900 dark:text-white focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
                  >
                    <option value={0}>Select...</option>
                    {lookups.llmInputTypes.map((t) => (
                      <option key={t.id} value={t.id}>{getLabel(t)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Output Type *</label>
                  <select
                    value={formData.llm_output_type_id}
                    onChange={(e) => setFormData({ ...formData, llm_output_type_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-[#141820] text-gray-900 dark:text-white focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
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
              <h4 className="text-[10px] font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-3">
                Prompts
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">System Prompt</label>
                  <textarea
                    value={formData.llm_system_prompt ?? ""}
                    onChange={(e) => setFormData({ ...formData, llm_system_prompt: e.target.value })}
                    rows={3}
                    placeholder="Instructions for the model..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-[#141820] text-gray-900 dark:text-white font-mono focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none resize-y transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">User Prompt</label>
                  <textarea
                    value={formData.llm_user_prompt ?? ""}
                    onChange={(e) => setFormData({ ...formData, llm_user_prompt: e.target.value })}
                    rows={3}
                    placeholder="User message template..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-[#141820] text-gray-900 dark:text-white font-mono focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none resize-y transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  />
                </div>
              </div>
            </section>

            {/* Section: Advanced */}
            <section>
              <h4 className="text-[10px] font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-3">
                Advanced
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Temperature</label>
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
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-[#141820] text-gray-900 dark:text-white focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Description</label>
                  <input
                    type="text"
                    value={formData.description ?? ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional note..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-[#141820] text-gray-900 dark:text-white focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  />
                </div>
              </div>
            </section>

            {/* Form actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
              {isCreating ? (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={loading}
                  className="px-5 py-2 text-sm font-medium bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-lg hover:from-violet-600 hover:to-indigo-600 shadow-sm shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "Creating..." : "Create Step"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleUpdate(editingId!)}
                  disabled={loading}
                  className="px-5 py-2 text-sm font-medium bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-lg hover:from-violet-600 hover:to-indigo-600 shadow-sm shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              )}
              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="px-5 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-lg transition-all disabled:opacity-50"
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
          className="group w-full py-3.5 text-sm font-medium border-2 border-dashed border-gray-200 dark:border-white/[0.08] rounded-xl text-gray-500 dark:text-gray-400 hover:border-violet-400 dark:hover:border-violet-500/50 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/5 transition-all duration-200"
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Step
          </span>
        </button>
      )}
    </div>
  );
}
