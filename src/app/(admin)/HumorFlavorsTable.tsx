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

  // Refs for create form inputs
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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {error && (
        <div className="px-4 py-2 bg-red-100 dark:bg-red-900/40 border-b border-red-200 dark:border-red-700">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                ID
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Slug
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
            {flavors.map((flavor) => (
              <tr
                key={flavor.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
              >
                {editingId === flavor.id ? (
                  <>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                      {flavor.id}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={editFormData.slug}
                        onChange={(e) => {
                          const value = e.target.value;
                          setEditFormData(prev => ({ ...prev, slug: value }));
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                        placeholder="slug"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={editFormData.description ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setEditFormData(prev => ({ ...prev, description: value }));
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                        placeholder="Description (optional)"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdate(flavor.id)}
                          disabled={loading}
                          className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={resetForm}
                          disabled={loading}
                          className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      {flavor.id}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <Link
                        href={`/flavor/${flavor.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium"
                      >
                        {flavor.slug}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      {flavor.description || "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/flavor/${flavor.id}`}
                          className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          Steps
                        </Link>
                        <button
                          type="button"
                          onClick={() => startEdit(flavor)}
                          disabled={loading}
                          className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(flavor.id)}
                          disabled={loading}
                          className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}

            {/* Create new row - using uncontrolled inputs with refs */}
            {isCreating && (
              <tr className="bg-blue-50 dark:bg-blue-900/20">
                <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                  New
                </td>
                <td className="px-4 py-2">
                  <input
                    ref={createSlugRef}
                    type="text"
                    defaultValue=""
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    placeholder="slug"
                    autoFocus
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    ref={createDescRef}
                    type="text"
                    defaultValue=""
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    placeholder="Description (optional)"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={loading}
                      className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={loading}
                      className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Empty state */}
            {flavors.length === 0 && !isCreating && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No humor flavors yet. Click &quot;Add Flavor&quot; to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add button */}
      {!isCreating && editingId === null && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={startCreate}
            className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            Add Flavor
          </button>
        </div>
      )}
    </div>
  );
}
