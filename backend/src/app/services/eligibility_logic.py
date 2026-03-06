from typing import Dict, Any

def check_eligibility(patient: Dict, criteria: Dict) -> Dict:
    results = {"overall_match": True, "failed_checks": [], "passed_checks": [], "unclear_checks": []}

    # 1. Age Logic
    p_age = patient.get("demographics", {}).get("age")
    c_age = criteria.get("age", {})
    if p_age and c_age:
        min_a = c_age.get("min_age")
        max_a = c_age.get("max_age")
        if min_a and p_age < min_a:
            results["failed_checks"].append(f"Age: Patient is {p_age}, trial requires min {min_a}")
            results["overall_match"] = False
        elif max_a and p_age > max_a:
            results["failed_checks"].append(f"Age: Patient is {p_age}, trial requires max {max_a}")
            results["overall_match"] = False
        else:
            results["passed_checks"].append("Age within required range")

    # 2. Condition Logic (ICD-10 or Name)
    p_conditions = [c["name"].lower() for c in patient.get("conditions", [])]
    for cond_req in criteria.get("conditions", []):
        c_name = cond_req["condition"].lower()
        if cond_req["requirement"] == "required":
            if any(c_name in pc for pc in p_conditions):
                results["passed_checks"].append(f"Condition: Has required {c_name}")
            else:
                results["failed_checks"].append(f"Condition: Missing required {c_name}")
                results["overall_match"] = False
        elif cond_req["requirement"] == "excluded":
            if any(c_name in pc for pc in p_conditions):
                results["failed_checks"].append(f"Condition: Has excluded {c_name}")
                results["overall_match"] = False

    # 3. Lab Value Logic
    p_labs = {l["name"].lower(): l["value"] for l in patient.get("lab_values", [])}
    for lab_req in criteria.get("lab_values", []):
        l_name = lab_req["test_name"].lower()
        if l_name in p_labs:
            p_val = p_labs[l_name]
            target = lab_req["value"]
            op = lab_req["operator"]
            
            # Simple Python operator mapping
            met = False
            if op == ">" or op == ">=": met = p_val >= target
            elif op == "<" or op == "<=": met = p_val <= target
            elif op == "==": met = p_val == target
            
            if met:
                results["passed_checks"].append(f"Lab: {l_name} ({p_val}) meets criteria")
            else:
                results["failed_checks"].append(f"Lab: {l_name} ({p_val}) fails {op} {target}")
                results["overall_match"] = False
        else:
            results["unclear_checks"].append(f"Lab: Missing {l_name} data")

    return results