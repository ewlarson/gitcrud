import React, { useEffect, useState, useCallback } from "react";
import { Resource } from "../aardvark/model";
import { facetedSearch, FacetedSearchRequest } from "../duckdb/duckdbClient";
import { ProjectConfig } from "../github/client";

interface DashboardProps {
    project: ProjectConfig | null;
    onEdit: (id: string) => void;
    onCreate: () => void;
}

const FACETS = [
    { field: "schema_provider_s", label: "Provider" },
    { field: "gbl_resourceClass_sm", label: "Resource Class" },
    { field: "dct_subject_sm", label: "Subject", limit: 30 },
    { field: "gbl_indexYear_im", label: "Year" }, // Treat as discrete text facet for now, or range later?
    { field: "dct_format_s", label: "Format" },
    { field: "dct_accessRights_s", label: "Access Rights" },
];

export const Dashboard: React.FC<DashboardProps> = ({ project, onEdit, onCreate }) => {
    const [resources, setResources] = useState<Resource[]>([]);
    const [facetsData, setFacetsData] = useState<Record<string, { value: string; count: number }[]>>({});
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    // Search State
    const [query, setQuery] = useState("");
    const [selectedFacets, setSelectedFacets] = useState<Record<string, string[]>>({});
    const [page, setPage] = useState(1);
    const pageSize = 20;

    // Debounce query
    const [debouncedQuery, setDebouncedQuery] = useState(query);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
            setPage(1);
        }, 300);
        return () => clearTimeout(handler);
    }, [query]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const filters: Record<string, any> = {};

            // Convert UI Facets state to DSL filters
            for (const [field, values] of Object.entries(selectedFacets)) {
                if (values.length > 0) {
                    // Using "any" logic (OR) for standard facets
                    filters[field] = { any: values };
                }
            }

            const req: FacetedSearchRequest = {
                q: debouncedQuery,
                filters,
                facets: FACETS.map(f => ({ field: f.field, limit: f.limit })),
                page: { size: pageSize, from: (page - 1) * pageSize },
                sort: [{ field: "dct_title_s", dir: "asc" }]
            };

            const res = await facetedSearch(req);
            setResources(res.results);
            setFacetsData(res.facets);
            setTotal(res.total);
        } catch (err) {
            console.error("Dashboard search failed", err);
        } finally {
            setLoading(false);
        }
    }, [debouncedQuery, selectedFacets, page]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Toggle Facet Handler
    const toggleFacet = (field: string, value: string) => {
        setSelectedFacets(prev => {
            const current = prev[field] || [];
            if (current.includes(value)) {
                return { ...prev, [field]: current.filter(v => v !== value) };
            } else {
                return { ...prev, [field]: [...current, value] };
            }
        });
        setPage(1);
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="flex bg-slate-900 h-full">
            {/* Sidebar: Facets */}
            <div className="w-64 flex-shrink-0 border-r border-slate-800 p-4 overflow-y-auto">
                <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Refine Results</h3>

                <div className="space-y-6">
                    {FACETS.map(f => {
                        const data = facetsData[f.field] || [];
                        // If we have selected items that are NOT in the list (due to disjunctive or limits), force show them?
                        // Actually disjunctive facets usually show all selected items plus top counts.
                        // For now just show returned data + checked items if missing (DSL handles disjunctive counts correctly).

                        // Check if we have data or if it is selected
                        if (data.length === 0 && (!selectedFacets[f.field] || selectedFacets[f.field].length === 0)) return null;

                        return (
                            <div key={f.field}>
                                <h4 className="text-sm font-medium text-slate-300 mb-2">{f.label}</h4>
                                <ul className="space-y-1">
                                    {data.map(item => {
                                        const isChecked = selectedFacets[f.field]?.includes(item.value);
                                        return (
                                            <li key={item.value}>
                                                <label className="flex items-center text-sm text-slate-400 hover:text-slate-200 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="mr-2 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                                                        checked={isChecked}
                                                        onChange={() => toggleFacet(f.field, item.value)}
                                                    />
                                                    <span className="flex-1 truncate" title={item.value}>{item.value || "<Empty>"}</span>
                                                    <span className="ml-2 text-xs text-slate-600 font-mono">{item.count}</span>
                                                </label>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main: Results */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Bar */}
                <div className="border-b border-slate-800 bg-slate-900/50 p-4 flex items-center justify-between">
                    <div className="flex-1 max-w-2xl relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            {/* Icon */}
                            <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            className="block w-full rounded-md border border-slate-700 bg-slate-950 pl-10 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                            placeholder="Search by keyword..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                    </div>
                    <div className="ml-4 flex items-center gap-4">
                        <span className="text-sm text-slate-400">
                            Found <span className="text-white font-medium">{total}</span> results
                        </span>
                        <button
                            onClick={onCreate}
                            className="ml-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                            Create New
                        </button>
                    </div>
                </div>

                {/* Results Grid/List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex h-64 items-center justify-center text-slate-500">Loading...</div>
                    ) : resources.length === 0 ? (
                        <div className="flex h-64 items-center justify-center text-slate-500">No results found.</div>
                    ) : (
                        <div className="space-y-4">
                            {resources.map(r => (
                                <div key={r.id} className="group relative flex flex-col sm:flex-row gap-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4 hover:border-slate-700 hover:bg-slate-900/60 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-medium text-indigo-400 group-hover:text-indigo-300">
                                            <button onClick={() => onEdit(r.id)} className="text-left focus:outline-none">
                                                {r.dct_title_s || "Untitled"}
                                            </button>
                                        </h3>
                                        <p className="mt-1 text-sm text-slate-400 line-clamp-2">
                                            {r.dct_description_sm?.[0] || "No description."}
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {r.gbl_resourceClass_sm?.slice(0, 3).map(c => (
                                                <span key={c} className="inline-flex items-center rounded-sm bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300 border border-slate-700">
                                                    {c}
                                                </span>
                                            ))}
                                            {r.schema_provider_s && (
                                                <span className="inline-flex items-center rounded-sm bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300 border border-slate-700">
                                                    {r.schema_provider_s}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 flex flex-col items-end justify-between gap-2">
                                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${r.dct_accessRights_s === "Public" ? "bg-emerald-900/30 text-emerald-400" : "bg-amber-900/30 text-amber-400"}`}>
                                            {r.dct_accessRights_s}
                                        </span>
                                        <div className="text-xs text-slate-500 font-mono">{r.id}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="border-t border-slate-800 bg-slate-900 p-4 flex items-center justify-between">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            className="rounded border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-slate-300 disabled:opacity-50 hover:bg-slate-700"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="rounded border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-slate-300 disabled:opacity-50 hover:bg-slate-700"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
