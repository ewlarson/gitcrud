import duckdb
import json
import os
import sys

def export_duckdb_to_json(db_path, output_dir):
    print(f"Exporting from {db_path} to {output_dir}")
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    con = duckdb.connect(db_path, read_only=True)
    
    # Check tables
    tables = [x[0] for x in con.execute("SHOW TABLES").fetchall()]
    if 'resources' not in tables:
        print("No resources table found.")
        return

    # Check if we have the new schema
    has_mv = 'resources_mv' in tables
    has_dist = 'distributions' in tables
    
    # Fetch all resources
    # We can use the same logic as the TS client: fetch scalars, MV, dists and merge.
    
    # Scalars
    scalars = con.execute("SELECT * FROM resources").fetchdf().to_dict('records')
    
    # MV
    mvs = {}
    if has_mv:
        mv_rows = con.execute("SELECT * FROM resources_mv").fetchall()
        for row in mv_rows:
            # row: id, field, val
            rid, field, val = row
            if rid not in mvs: mvs[rid] = {}
            if field not in mvs[rid]: mvs[rid][field] = []
            mvs[rid][field].append(val)
            
    # Distributions
    dists = {}
    if has_dist:
        dist_rows = con.execute("SELECT * FROM distributions").fetchall()
        for row in dist_rows:
            # row: resource_id, relation_key, url
            rid, k, url = row
            if rid not in dists: dists[rid] = []
            dists[rid].append({"resource_id": rid, "relation_key": k, "url": url})
            
    con.close()
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    count = 0
    for res in scalars:
        rid = res.get('id')
        if not rid: continue
        
        # Merge MV
        if rid in mvs:
            for field, vals in mvs[rid].items():
                res[field] = vals
                
        # Merge Dists (dct_references_s)
        if rid in dists:
            # reconstruct format: {"key": "url", ...}
            ref_dict = {}
            for d in dists[rid]:
                ref_dict[d['relation_key']] = d['url']
            res['dct_references_s'] = json.dumps(ref_dict).replace(" ", "") # minify?
            
        # Write to JSON
        # Clean up None/NaN
        clean_res = {k: v for k, v in res.items() if v is not None and v == v and v != ""}
        
        # Clean keys that are null/empty? Aardvark usually omits them.
        
        filename = f"{rid}.json"
        with open(os.path.join(output_dir, filename), 'w') as f:
            json.dump(clean_res, f, indent=2)
            
        count += 1
        
    print(f"Exported {count} records.")

if __name__ == "__main__":
    db_path = sys.argv[1] if len(sys.argv) > 1 else "web/public/records.duckdb"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "metadata"
    export_duckdb_to_json(db_path, output_dir)
