import React, { useState } from "react";
import { importCsv, saveDb, exportDbBlob } from "../duckdb/duckdbClient";

export const ImportPage: React.FC = () => {
    const [status, setStatus] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setLoading(true);
        setStatus("Importing...");

        try {
            // Process sequentially
            let totalRows = 0;
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setStatus(`Importing ${file.name}...`);
                const res = await importCsv(file);
                if (!res.success) {
                    throw new Error(`Failed to import ${file.name}: ${res.message}`);
                }
                totalRows += res.count || 0;
            }
            setStatus(`Import complete! Loaded ${totalRows} resources. Data saved to in-memory DB and IndexedDB.`);
        } catch (err: any) {
            setStatus(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDb = async () => {
        try {
            setLoading(true);
            await saveDb(); // Save to IndexedDB
            const blob = await exportDbBlob();
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "records.duckdb";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setStatus("Database downloaded. Please commit this file to the repository.");
            }
        } catch (err: any) {
            setStatus(`Save failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-slate-100">Import Data</h1>

            <div className="bg-slate-900 rounded-lg border border-slate-800 p-6 mb-8">
                <h2 className="text-lg font-semibold mb-4 text-slate-200">1. CSV Import</h2>
                <p className="text-slate-400 mb-4 text-sm">
                    Upload Aardvark-compliant CSV files. Columns will be mapped automatically.
                    Existing records with matching IDs will be updated.
                </p>
                <input
                    type="file"
                    accept=".csv"
                    multiple
                    onChange={handleFileChange}
                    disabled={loading}
                    className="block w-full text-sm text-slate-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-indigo-600 file:text-white
                        hover:file:bg-indigo-700
                    "
                />
            </div>

            <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
                <h2 className="text-lg font-semibold mb-4 text-slate-200">2. Save Database</h2>
                <p className="text-slate-400 mb-4 text-sm">
                    Download the updated <code>records.duckdb</code> file.
                    <strong> You must commit this file to the <code>web/public/</code> directory in the repository</strong> to make changes permanent for all users.
                </p>
                <button
                    onClick={handleSaveDb}
                    disabled={loading}
                    className="bg-emerald-600 text-white px-6 py-2 rounded-md hover:bg-emerald-500 disabled:opacity-50 font-medium"
                >
                    Download Database
                </button>
            </div>

            {status && (
                <div className={`mt-6 p-4 rounded-md ${status.startsWith("Error") ? "bg-red-900/50 text-red-200 border-red-800" : "bg-slate-800 text-slate-200 border-slate-700"} border`}>
                    {status}
                </div>
            )}
        </div>
    );
};
