"use client";

import { useState, useCallback } from "react";
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
  const [formData, setFormData] = useState<HumorFlavorFormData>({
    slug: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetForm = useCallback(() => {
    setFormData({ slug: "", description: "" });
    setIsCreating(false);
    setEditingId(null);
    setError(null);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!formData.slug.trim()) {
      setError("Slug is required");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await createHumorFlavor(formData);

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setFlavors(prev => [...prev, result.data as HumorFlavor]);
      resetForm();
    }

    setLoading(false);
  }, [formData, resetForm]);

  const handleUpdate = useCallback(async (id: number) => {
    if (!formData.slug.trim()) {
      setError("Slug is required");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await updateHumorFlavor(id, formData);

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setFlavors(prev => prev.map(f => f.id === id ? result.data as HumorFlavor : f));
      resetForm();
    }

    setLoading(false);
  }, [formData, resetForm]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm("Delete this flavor and all its steps?")) return;

    setLoading(true);
    setError(null);

    const result = await deleteHumorFlavor(id);

    if (result.error) {
      setError(result.error);
    } else {
      setFlavors(prev => prev.filter(f => f.id !== id));
    }

    setLoading(false);
  }, []);

  const startEdit = useCallback((flavor: HumorFlavor) => {
    setEditingId(flavor.id);
    setFormData({
      slug: flavor.slug,
      description: flavor.description ?? "",
    });
    setIsCreating(false);
    setError(null);
  }, []);

  const startCreate = useCallback(() => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({ slug: "", description: "" });
    setError(null);
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {error && (
        <div className="px-4 py-2 bg-red-900/40 border-b border-red-700">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-800/50">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                ID
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Slug
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {flavors.map((flavor) => (
              <tr
                key={flavor.id}
                className="hover:bg-gray-700/30"
              >
                {editingId === flavor.id ? (
                  <>
                    <td className="px-4 py-2 text-sm text-gray-300">
                      {flavor.id}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-600 rounded bg-gray-700 text-white focus:border-blue-500 focus:outline-none"
                        placeholder="slug"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={formData.description ?? ""}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-600 rounded bg-gray-700 text-white focus:border-blue-500 focus:outline-none"
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
                          className="px-2 py-1 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2 text-sm text-gray-400">
                      {flavor.id}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <Link
                        href={`/flavor/${flavor.id}`}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        {flavor.slug}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-400">
                      {flavor.description || "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/flavor/${flavor.id}`}
                          className="px-2 py-1 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded"
                        >
                          Steps
                        </Link>
                        <button
                          type="button"
                          onClick={() => startEdit(flavor)}
                          disabled={loading}
                          className="px-2 py-1 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(flavor.id)}
                          disabled={loading}
                          className="px-2 py-1 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}

            {/* Create new row */}
            {isCreating && (
              <tr className="bg-blue-900/20">
                <td className="px-4 py-2 text-sm text-gray-400">
                  New
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-600 rounded bg-gray-700 text-white focus:border-blue-500 focus:outline-none"
                    placeholder="slug"
                    autoFocus
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={formData.description ?? ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-600 rounded bg-gray-700 text-white focus:border-blue-500 focus:outline-none"
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
                      className="px-2 py-1 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded disabled:opacity-50"
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
        <div className="px-4 py-3 border-t border-gray-700">
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
