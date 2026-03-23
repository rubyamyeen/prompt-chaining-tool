"use client";

import { useState } from "react";
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

  const resetForm = () => {
    setFormData({ slug: "", description: "" });
    setIsCreating(false);
    setEditingId(null);
    setError(null);
  };

  const handleCreate = async () => {
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
      setFlavors([...flavors, result.data as HumorFlavor]);
      resetForm();
    }

    setLoading(false);
  };

  const handleUpdate = async (id: number) => {
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
      setFlavors(flavors.map(f => f.id === id ? result.data as HumorFlavor : f));
      resetForm();
    }

    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this flavor and all its steps?")) {
      return;
    }

    setLoading(true);
    const result = await deleteHumorFlavor(id);

    if (result.error) {
      setError(result.error);
    } else {
      setFlavors(flavors.filter(f => f.id !== id));
    }

    setLoading(false);
  };

  const startEdit = (flavor: HumorFlavor) => {
    setEditingId(flavor.id);
    setFormData({
      slug: flavor.slug,
      description: flavor.description ?? "",
    });
    setIsCreating(false);
    setError(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800">
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                ID
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                Slug
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                Description
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {flavors.map((flavor) => (
              <tr
                key={flavor.id}
                className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
              >
                {editingId === flavor.id ? (
                  <>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {flavor.id}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="slug"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={formData.description ?? ""}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Description (optional)"
                      />
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleUpdate(flavor.id)}
                        disabled={loading}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={resetForm}
                        disabled={loading}
                        className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {flavor.id}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link
                        href={`/flavor/${flavor.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        {flavor.slug}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {flavor.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Link
                        href={`/flavor/${flavor.id}`}
                        className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 inline-block"
                      >
                        Steps
                      </Link>
                      <button
                        onClick={() => startEdit(flavor)}
                        disabled={loading}
                        className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(flavor.id)}
                        disabled={loading}
                        className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}

            {/* Create new row */}
            {isCreating && (
              <tr className="border-b border-gray-100 dark:border-gray-700/50 bg-blue-50/50 dark:bg-blue-900/20">
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  New
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="slug"
                    autoFocus
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={formData.description ?? ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Description (optional)"
                  />
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={handleCreate}
                    disabled={loading}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Create
                  </button>
                  <button
                    onClick={resetForm}
                    disabled={loading}
                    className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add button */}
      {!isCreating && editingId === null && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              setIsCreating(true);
              setFormData({ slug: "", description: "" });
            }}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Humor Flavor
          </button>
        </div>
      )}
    </div>
  );
}
