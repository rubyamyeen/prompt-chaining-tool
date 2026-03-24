"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  createHumorFlavor,
  updateHumorFlavor,
  deleteHumorFlavor,
  type HumorFlavorFormData,
} from "@/lib/actions/humor-flavors";
import type { HumorFlavor } from "@/types/database";

interface Props {
  initialData: HumorFlavor[];
}

export default function HumorFlavorsTable({ initialData }: Props) {
  const [flavors, setFlavors] = useState(initialData);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<HumorFlavorFormData>({
    slug: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createSlugRef = useRef<HTMLInputElement>(null);
  const createDescRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setIsCreating(false);
    setEditingId(null);
    setEditFormData({ slug: "", description: "" });
    setError(null);
  }

  async function handleCreate() {
    const slug = createSlugRef.current?.value?.trim() ?? "";
    const description = createDescRef.current?.value ?? "";

    if (!slug) {
      setError("Slug is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await createHumorFlavor({ slug, description });

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setFlavors(prev => [...prev, result.data as HumorFlavor]);
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(id: number) {
    if (!editFormData.slug.trim()) {
      setError("Slug is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await updateHumorFlavor(id, editFormData);

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setFlavors(prev => prev.map(f => f.id === id ? result.data as HumorFlavor : f));
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this flavor and all its steps?")) return;

    setLoading(true);
    setError(null);

    try {
      const result = await deleteHumorFlavor(id);

      if (result.error) {
        setError(result.error);
      } else {
        setFlavors(prev => prev.filter(f => f.id !== id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(flavor: HumorFlavor) {
    setEditingId(flavor.id);
    setEditFormData({
      slug: flavor.slug,
      description: flavor.description ?? "",
    });
    setIsCreating(false);
    setError(null);
  }

  function startCreate() {
    setIsCreating(true);
    setEditingId(null);
    setError(null);
  }

  return (
    <div className="space-y-4">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 animate-fade-in">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button type="button" onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Flavors Grid */}
      <div className="grid gap-3">
        {flavors.map((flavor) => (
          <div
            key={flavor.id}
            className="group relative bg-white dark:bg-[#1a1f2e]/80 rounded-2xl border border-gray-200/80 dark:border-white/[0.06]
              shadow-sm hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-violet-500/5
              transition-all duration-300 ease-out"
          >
            {editingId === flavor.id ? (
              /* Edit Mode */
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                    {flavor.id}
                  </div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Editing</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                      Slug
                    </label>
                    <input
                      type="text"
                      value={editFormData.slug}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, slug: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08]
                        text-gray-900 dark:text-white text-sm
                        focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500
                        transition-all duration-200"
                      placeholder="my-flavor"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                      Description
                    </label>
                    <input
                      type="text"
                      value={editFormData.description ?? ""}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08]
                        text-gray-900 dark:text-white text-sm
                        focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500
                        transition-all duration-200"
                      placeholder="Optional description..."
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdate(flavor.id)}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-indigo-500
                      rounded-xl shadow-sm hover:shadow-md hover:shadow-violet-500/25
                      disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400
                      hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="flex items-center gap-4 p-4">
                {/* ID Badge */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 dark:from-violet-500/20 dark:to-indigo-500/20
                  flex items-center justify-center text-violet-600 dark:text-violet-400 text-sm font-bold border border-violet-200/50 dark:border-violet-500/20">
                  {flavor.id}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/flavor/${flavor.id}`}
                    className="text-base font-semibold text-gray-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                  >
                    {flavor.slug}
                  </Link>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {flavor.description || "No description"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Link
                    href={`/flavor/${flavor.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-600 dark:text-violet-400
                      hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                    </svg>
                    Steps
                  </Link>
                  <button
                    type="button"
                    onClick={() => startEdit(flavor)}
                    disabled={loading}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                      hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-lg transition-colors disabled:opacity-50"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(flavor.id)}
                    disabled={loading}
                    className="p-2 text-gray-400 hover:text-red-500
                      hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Create New Row */}
        {isCreating && (
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-500/10 dark:to-indigo-500/10
            rounded-2xl border border-violet-200 dark:border-violet-500/20 p-5 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white shadow-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <span className="text-sm font-medium text-violet-700 dark:text-violet-300">New Flavor</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  Slug
                </label>
                <input
                  ref={createSlugRef}
                  type="text"
                  defaultValue=""
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08]
                    text-gray-900 dark:text-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500
                    transition-all duration-200"
                  placeholder="my-flavor"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  Description
                </label>
                <input
                  ref={createDescRef}
                  type="text"
                  defaultValue=""
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08]
                    text-gray-900 dark:text-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500
                    transition-all duration-200"
                  placeholder="Optional description..."
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCreate}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-indigo-500
                  rounded-xl shadow-sm hover:shadow-md hover:shadow-violet-500/25
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? "Creating..." : "Create Flavor"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400
                  hover:bg-white/50 dark:hover:bg-white/[0.04] rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {flavors.length === 0 && !isCreating && (
          <div className="text-center py-16 px-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-500/20 dark:to-indigo-500/20
              flex items-center justify-center">
              <svg className="w-8 h-8 text-violet-500 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No humor flavors yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Create your first flavor to start building prompt chains.</p>
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white
                bg-gradient-to-r from-violet-500 to-indigo-500 rounded-xl
                shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30
                transition-all duration-300"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create First Flavor
            </button>
          </div>
        )}
      </div>

      {/* Add Button */}
      {!isCreating && editingId === null && flavors.length > 0 && (
        <button
          type="button"
          onClick={startCreate}
          className="flex items-center justify-center gap-2 w-full py-3.5
            border-2 border-dashed border-gray-200 dark:border-white/[0.08] rounded-2xl
            text-gray-500 dark:text-gray-400 text-sm font-medium
            hover:border-violet-300 dark:hover:border-violet-500/30 hover:text-violet-600 dark:hover:text-violet-400
            hover:bg-violet-50/50 dark:hover:bg-violet-500/5
            transition-all duration-300"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Flavor
        </button>
      )}
    </div>
  );
}
